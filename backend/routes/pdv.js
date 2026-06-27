const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/cash-register', authenticateToken, async (req, res) => {
  try {
    const register = await db.prepare(`
      SELECT cr.*, u.name as user_name
      FROM cash_registers cr
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE cr.company_id = ? AND cr.branch_id = ? AND cr.status = 'open'
      ORDER BY cr.opening_date DESC LIMIT 1
    `).get(req.user.company_id, req.user.branch_id || 1);
    res.json(register || { status: 'closed' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar caixa' });
  }
});

router.post('/cash-register/open', authenticateToken, async (req, res) => {
  try {
    const existing = await db.prepare(`SELECT id FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(req.user.company_id, req.user.branch_id || 1);
    if (existing) return res.status(400).json({ error: 'Já existe um caixa aberto' });

    const { initial_amount } = req.body;
    const result = await db.prepare(`
      INSERT INTO cash_registers (company_id, branch_id, user_id, opening_date, initial_amount, status)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, 'open')
    `).run(req.user.company_id, req.user.branch_id || 1, req.user.id, parseFloat(initial_amount) || 0);

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'open_cash', 'cash_register', result.insertId);
    res.status(201).json({ id: result.insertId, message: 'Caixa aberto' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
});

router.post('/cash-register/close', authenticateToken, async (req, res) => {
  try {
    const register = await db.prepare(`SELECT * FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(req.user.company_id, req.user.branch_id || 1);
    if (!register) return res.status(400).json({ error: 'Nenhum caixa aberto' });

    const { final_amount, notes } = req.body;
    const sales = await db.prepare(`SELECT * FROM sales_orders WHERE company_id = ? AND branch_id = ? AND origin = 'pdv' AND created_at >= ? AND status != 'cancelled'`).all(req.user.company_id, req.user.branch_id || 1, register.opening_date);

    let totalCash = 0, totalCard = 0, totalPix = 0, totalBoleto = 0, totalCredit = 0, totalSales = 0;
    sales.forEach(s => {
      totalSales += s.total;
      if (s.payment_method === 'cash') totalCash += s.total;
      else if (s.payment_method === 'card') totalCard += s.total;
      else if (s.payment_method === 'pix') totalPix += s.total;
      else if (s.payment_method === 'boleto') totalBoleto += s.total;
      else if (s.payment_method === 'credit') totalCredit += s.total;
    });

    const movements = await db.prepare(`SELECT * FROM cash_movements WHERE cash_register_id = ?`).all(register.id);
    let totalWithdrawals = 0, totalDeposits = 0;
    movements.forEach(m => {
      if (m.type === 'withdrawal') totalWithdrawals += m.amount;
      else if (m.type === 'deposit') totalDeposits += m.amount;
    });

    const expectedAmount = register.initial_amount + totalCash + totalDeposits - totalWithdrawals;
    const finalAmount = parseFloat(final_amount) || 0;
    const difference = finalAmount - expectedAmount;

    await db.prepare(`
      UPDATE cash_registers SET closing_date = CURRENT_TIMESTAMP, final_amount = ?, total_sales = ?,
        total_cash = ?, total_card = ?, total_pix = ?, total_boleto = ?, total_credit = ?,
        total_withdrawals = ?, total_deposits = ?, expected_amount = ?, difference = ?,
        status = 'closed', notes = ?
      WHERE id = ?
    `).run(finalAmount, totalSales, totalCash, totalCard, totalPix, totalBoleto, totalCredit,
      totalWithdrawals, totalDeposits, expectedAmount, difference, notes || null, register.id);

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'close_cash', 'cash_register', register.id);

    res.json({
      message: 'Caixa fechado',
      summary: {
        initial_amount: register.initial_amount,
        total_sales: totalSales,
        total_cash: totalCash,
        total_card: totalCard,
        total_pix: totalPix,
        total_withdrawals: totalWithdrawals,
        total_deposits: totalDeposits,
        expected_amount: expectedAmount,
        final_amount: finalAmount,
        difference: difference
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
});

router.post('/cash-register/withdrawal', authenticateToken, async (req, res) => {
  try {
    const register = await db.prepare(`SELECT id FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(req.user.company_id, req.user.branch_id || 1);
    if (!register) return res.status(400).json({ error: 'Nenhum caixa aberto' });
    const { amount, description } = req.body;
    await db.prepare(`INSERT INTO cash_movements (cash_register_id, company_id, type, amount, description, user_id) VALUES (?, ?, 'withdrawal', ?, ?, ?)`).run(register.id, req.user.company_id, parseFloat(amount), description || 'Sangria', req.user.id);
    res.json({ message: 'Sangria registrada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar sangria' });
  }
});

router.post('/cash-register/deposit', authenticateToken, async (req, res) => {
  try {
    const register = await db.prepare(`SELECT id FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(req.user.company_id, req.user.branch_id || 1);
    if (!register) return res.status(400).json({ error: 'Nenhum caixa aberto' });
    const { amount, description } = req.body;
    await db.prepare(`INSERT INTO cash_movements (cash_register_id, company_id, type, amount, description, user_id) VALUES (?, ?, 'deposit', ?, ?, ?)`).run(register.id, req.user.company_id, parseFloat(amount), description || 'Suprimento', req.user.id);
    res.json({ message: 'Suprimento registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar suprimento' });
  }
});

router.post('/sale', authenticateToken, async (req, res) => {
  try {
    const register = await db.prepare(`SELECT id FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(req.user.company_id, req.user.branch_id || 1);
    if (!register) return res.status(400).json({ error: 'Abra o caixa antes de vender' });

    const d = req.body;
    const orderNumber = `PDV${Date.now().toString().slice(-8)}`;
    let subtotal = 0;
    (d.items || []).forEach(item => { subtotal += (item.quantity || 1) * (item.unit_price || 0); });
    const discount = parseFloat(d.discount) || 0;
    const total = subtotal - discount;

    const result = await db.prepare(`
      INSERT INTO sales_orders (company_id, branch_id, order_number, customer_id, seller_id, user_id,
        origin, subtotal, discount, total, payment_method, payment_status, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pdv', ?, ?, ?, ?, ?, 'paid')
    `).run(
      req.user.company_id, req.user.branch_id || 1, orderNumber,
      d.customer_id || null, d.seller_id || null, req.user.id,
      subtotal, discount, total, d.payment_method || 'cash', 'paid'
    );

    const orderId = result.insertId;
    for (const item of (d.items || [])) {
      const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
      await db.prepare(`INSERT INTO sales_order_items (order_id, product_id, variant_id, name, sku, color, size, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        orderId, item.product_id, item.variant_id || null, item.name, item.sku || null, item.color || null, item.size || null, item.quantity, item.unit_price, itemTotal
      );
      if (item.variant_id) {
        await db.prepare(`UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?`).run(item.quantity, item.variant_id);
      }
      await db.prepare(`INSERT INTO stock_movements (company_id, branch_id, product_id, variant_id, type, quantity, reference_type, reference_id, user_id) VALUES (?, ?, ?, ?, 'sale', ?, 'order', ?, ?)`).run(
        req.user.company_id, req.user.branch_id, item.product_id, item.variant_id || null, -item.quantity, orderId, req.user.id
      );
    }

    if (d.seller_id) {
      const seller = await db.prepare(`SELECT commission_rate FROM sellers WHERE id = ?`).get(d.seller_id);
      if (seller) {
        const commission = total * (seller.commission_rate / 100);
        await db.prepare(`UPDATE sellers SET total_sales = total_sales + ?, total_commission = total_commission + ? WHERE id = ?`).run(total, commission, d.seller_id);
      }
    }

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'pdv_sale', 'order', orderId);
    res.status(201).json({ id: orderId, order_number: orderNumber, total, message: 'Venda realizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao realizar venda' });
  }
});

router.get('/product/search', authenticateToken, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.json([]);
    const products = await db.prepare(`
      SELECT p.*, pv.id as variant_id, pv.color, pv.size, pv.sku as variant_sku, pv.barcode as variant_barcode, pv.stock_quantity, pv.price as variant_price
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
      WHERE p.company_id = ? AND p.deleted_at IS NULL AND p.status = 'active'
      AND (p.barcode = ? OR p.sku = ? OR pv.barcode = ? OR pv.sku = ? OR p.name LIKE ?)
    `).all(req.user.company_id, code, code, code, code, `%${code}%`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

router.get('/cash-register/movements', authenticateToken, async (req, res) => {
  try {
    const register = await db.prepare(`SELECT id FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(req.user.company_id, req.user.branch_id || 1);
    if (!register) return res.json([]);
    const movements = await db.prepare(`
      SELECT cm.*, u.name as user_name
      FROM cash_movements cm LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.cash_register_id = ? ORDER BY cm.created_at DESC
    `).all(register.id);
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar movimentações' });
  }
});

module.exports = router;
