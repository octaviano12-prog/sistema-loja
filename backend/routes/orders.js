const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, origin } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE o.company_id = ? AND o.deleted_at IS NULL';
    const params = [req.user.company_id];
    if (status) { where += ' AND o.status = ?'; params.push(status); }
    if (origin) { where += ' AND o.origin = ?'; params.push(origin); }
    if (search) { where += ' AND (o.order_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM sales_orders o LEFT JOIN customers c ON o.customer_id = c.id ${where}`).get(...params)).count;
    const orders = await db.prepare(`
      SELECT o.*, c.name as customer_name, s.name as seller_name
      FROM sales_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN sellers s ON o.seller_id = s.id
      ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    res.json({ orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await db.prepare(`
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
        s.name as seller_name, u.name as user_name
      FROM sales_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN sellers s ON o.seller_id = s.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.company_id = ?
    `).get(req.params.id, req.user.company_id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    const items = await db.prepare(`
      SELECT oi.*, p.name as product_name, p.images as product_images
      FROM sales_order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);
    const invoice = await db.prepare(`SELECT * FROM invoices WHERE order_id = ?`).get(order.id);
    res.json({ ...order, items, invoice });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    const orderNumber = `PED${Date.now().toString().slice(-8)}`;
    let subtotal = 0;
    (d.items || []).forEach(item => { subtotal += (item.quantity || 1) * (item.unit_price || 0); });
    const discount = parseFloat(d.discount) || 0;
    const shipping = parseFloat(d.shipping_cost) || 0;
    const total = subtotal - discount + shipping;

    const result = await db.prepare(`
      INSERT INTO sales_orders (company_id, branch_id, order_number, customer_id, seller_id, user_id,
        origin, subtotal, discount, discount_type, shipping_cost, shipping_method, total,
        payment_method, payment_status, status, notes, shipping_address, shipping_city, shipping_state, shipping_zip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.company_id, req.user.branch_id || 1, orderNumber,
      d.customer_id || null, d.seller_id || null, req.user.id,
      d.origin || 'online', subtotal, discount, d.discount_type || 'value',
      shipping, d.shipping_method || null, total,
      d.payment_method || null, d.payment_status || 'pending',
      d.status || 'new', d.notes || null,
      d.shipping_address || null, d.shipping_city || null, d.shipping_state || null, d.shipping_zip || null
    );

    const orderId = result.insertId;
    for (const item of (d.items || [])) {
      const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
      await db.prepare(`
        INSERT INTO sales_order_items (order_id, product_id, variant_id, name, sku, color, size, quantity, unit_price, discount, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, item.product_id, item.variant_id || null,
        item.name, item.sku || null, item.color || null, item.size || null,
        item.quantity || 1, item.unit_price || 0, item.discount || 0, itemTotal);

      if (item.variant_id) {
        await db.prepare(`UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?`).run(item.quantity || 1, item.variant_id);
      } else {
        await db.prepare(`UPDATE products SET sales_count = sales_count + ? WHERE id = ?`).run(item.quantity || 1, item.product_id);
      }

      await db.prepare(`INSERT INTO stock_movements (company_id, branch_id, product_id, variant_id, type, quantity, reference_type, reference_id, user_id) VALUES (?, ?, ?, ?, 'sale', ?, 'order', ?, ?)`).run(
        req.user.company_id, req.user.branch_id, item.product_id, item.variant_id || null,
        -(item.quantity || 1), orderId, req.user.id
      );
    }

    if (d.customer_id) {
      await db.prepare(`UPDATE customers SET total_spent = total_spent + ?, total_orders = total_orders + 1, last_purchase_date = CURDATE() WHERE id = ?`).run(total, d.customer_id);
    }

    if (d.payment_status !== 'paid') {
      await db.prepare(`INSERT INTO accounts_receivable (company_id, customer_id, order_id, description, amount, due_date, status) VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?)`).run(
        req.user.company_id, d.customer_id || null, orderId, `Pedido ${orderNumber}`, total, d.payment_status || 'pending'
      );
    }

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'create', 'order', orderId);

    res.status(201).json({ id: orderId, order_number: orderNumber, total, message: 'Pedido criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, payment_status, tracking_code, notes } = req.body;
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (payment_status) { updates.push('payment_status = ?'); params.push(payment_status); }
    if (tracking_code) { updates.push('tracking_code = ?'); params.push(tracking_code); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (status === 'delivered') { updates.push("delivered_at = CURRENT_TIMESTAMP"); }
    if (status === 'cancelled') { updates.push("cancelled_at = CURRENT_TIMESTAMP"); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id, req.user.company_id);
    await db.prepare(`UPDATE sales_orders SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`).run(...params);
    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'status_change', 'order', req.params.id, JSON.stringify({ status, payment_status }));
    res.json({ message: 'Status atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const items = await db.prepare(`SELECT * FROM sales_order_items WHERE order_id = ?`).all(req.params.id);
    for (const item of items) {
      if (item.variant_id) {
        await db.prepare(`UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?`).run(item.quantity, item.variant_id);
      }
    }
    await db.prepare(`UPDATE sales_orders SET deleted_at = CURRENT_TIMESTAMP, status = 'cancelled' WHERE id = ? AND company_id = ?`).run(req.params.id, req.user.company_id);
    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'cancel', 'order', req.params.id);
    res.json({ message: 'Pedido cancelado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar pedido' });
  }
});

module.exports = router;
