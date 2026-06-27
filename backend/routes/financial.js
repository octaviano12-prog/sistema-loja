const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/payable', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE ap.company_id = ?';
    const params = [req.user.company_id];
    if (status) { where += ' AND ap.status = ?'; params.push(status); }
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM accounts_payable ap ${where}`).get(...params)).count;
    const items = await db.prepare(`
      SELECT ap.*, s.name as supplier_name
      FROM accounts_payable ap LEFT JOIN suppliers s ON ap.supplier_id = s.id
      ${where} ORDER BY ap.due_date ASC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas a pagar' });
  }
});

router.post('/payable', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    const result = await db.prepare(`INSERT INTO accounts_payable (company_id, supplier_id, description, category, amount, due_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.user.company_id, d.supplier_id || null, d.description, d.category || null, d.amount, d.due_date, d.payment_method || null, d.notes || null
    );
    res.status(201).json({ id: result.insertId, message: 'Conta a pagar criada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta a pagar' });
  }
});

router.put('/payable/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_method, paid_date } = req.body;
    const payAmount = parseFloat(amount) || 0;
    await db.prepare(`UPDATE accounts_payable SET paid_amount = paid_amount + ?, paid_date = ?, payment_method = ?, status = CASE WHEN paid_amount + ? >= amount THEN 'paid' ELSE 'partial' END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?`).run(
      payAmount, paid_date || new Date().toISOString().split('T')[0], payment_method || null, payAmount, req.params.id, req.user.company_id
    );
    res.json({ message: 'Pagamento registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar pagamento' });
  }
});

router.get('/receivable', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE ar.company_id = ?';
    const params = [req.user.company_id];
    if (status) { where += ' AND ar.status = ?'; params.push(status); }
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM accounts_receivable ar ${where}`).get(...params)).count;
    const items = await db.prepare(`
      SELECT ar.*, c.name as customer_name
      FROM accounts_receivable ar LEFT JOIN customers c ON ar.customer_id = c.id
      ${where} ORDER BY ar.due_date ASC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas a receber' });
  }
});

router.put('/receivable/:id/receive', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_method, received_date } = req.body;
    const recvAmount = parseFloat(amount) || 0;
    await db.prepare(`UPDATE accounts_receivable SET received_amount = received_amount + ?, received_date = ?, payment_method = ?, status = CASE WHEN received_amount + ? >= amount THEN 'paid' ELSE 'partial' END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?`).run(
      recvAmount, received_date || new Date().toISOString().split('T')[0], payment_method || null, recvAmount, req.params.id, req.user.company_id
    );
    res.json({ message: 'Recebimento registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar recebimento' });
  }
});

router.get('/cashflow', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const revenues = await db.prepare(`
      SELECT DATE(so.created_at) as date, SUM(so.total) as total
      FROM sales_orders so WHERE so.company_id = ? AND so.created_at BETWEEN ? AND ? AND so.status != 'cancelled'
      GROUP BY DATE(so.created_at) ORDER BY date
    `).all(req.user.company_id, startDate, endDate);

    const expenses = await db.prepare(`
      SELECT DATE(ap.paid_date) as date, SUM(ap.amount) as total
      FROM accounts_payable ap WHERE ap.company_id = ? AND ap.paid_date BETWEEN ? AND ? AND ap.status = 'paid'
      GROUP BY DATE(ap.paid_date) ORDER BY date
    `).all(req.user.company_id, startDate, endDate);

    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.total, 0);

    res.json({ revenues, expenses, total_revenue: totalRevenue, total_expense: totalExpense, balance: totalRevenue - totalExpense });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar fluxo de caixa' });
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db.prepare(`SELECT * FROM financial_categories WHERE company_id = ? ORDER BY type, name`).all(req.user.company_id);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

router.post('/categories', authenticateToken, async (req, res) => {
  try {
    const { name, type, color } = req.body;
    const result = await db.prepare(`INSERT INTO financial_categories (company_id, name, type, color) VALUES (?, ?, ?, ?)`).run(req.user.company_id, name, type, color || null);
    res.status(201).json({ id: result.insertId, message: 'Categoria criada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

module.exports = router;
