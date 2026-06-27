const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    let settings = await db.prepare(`SELECT * FROM fiscal_settings WHERE company_id = ?`).get(req.user.company_id);
    if (!settings) {
      await db.prepare(`INSERT INTO fiscal_settings (company_id) VALUES (?)`).run(req.user.company_id);
      settings = await db.prepare(`SELECT * FROM fiscal_settings WHERE company_id = ?`).get(req.user.company_id);
    }
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar configurações fiscais' }); }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    await db.prepare(`UPDATE fiscal_settings SET certificate_path=?, certificate_password=?, environment=?, nfe_series=?, nfce_series=?, nfe_number=?, nfce_number=?, tax_regime=?, cnpj=?, state_registration=?, api_provider=?, api_key=?, api_url=?, updated_at=CURRENT_TIMESTAMP WHERE company_id=?`).run(
      d.certificate_path || null, d.certificate_password || null, d.environment || 'homologation',
      d.nfe_series || '1', d.nfce_series || '1', d.nfe_number || 1, d.nfce_number || 1,
      d.tax_regime || 'simples', d.cnpj || null, d.state_registration || null,
      d.api_provider || null, d.api_key || null, d.api_url || null, req.user.company_id
    );
    res.json({ message: 'Configurações fiscais atualizadas' });
  } catch (err) { res.status(500).json({ error: 'Erro ao atualizar configurações fiscais' }); }
});

router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE i.company_id = ?';
    const params = [req.user.company_id];
    if (status) { where += ' AND i.status = ?'; params.push(status); }
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM invoices i ${where}`).get(...params)).count;
    const invoices = await db.prepare(`
      SELECT i.*, c.name as customer_name, so.order_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN sales_orders so ON i.order_id = so.id
      ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    res.json({ invoices, total });
  } catch (err) { res.status(500).json({ error: 'Erro ao listar notas fiscais' }); }
});

router.post('/issue', authenticateToken, async (req, res) => {
  try {
    const { order_id, invoice_type } = req.body;
    const order = await db.prepare(`SELECT * FROM sales_orders WHERE id = ? AND company_id = ?`).get(order_id, req.user.company_id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const settings = await db.prepare(`SELECT * FROM fiscal_settings WHERE company_id = ?`).get(req.user.company_id);
    if (!settings || !settings.cnpj) return res.status(400).json({ error: 'Configure os dados fiscais antes de emitir' });

    const numberField = invoice_type === 'nfce' ? 'nfce_number' : 'nfe_number';
    const invoiceNumber = settings[numberField] || 1;

    const result = await db.prepare(`INSERT INTO invoices (company_id, branch_id, order_id, customer_id, invoice_type, series, number, status, total_value, issued_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(
      req.user.company_id, req.user.branch_id, order_id, order.customer_id, invoice_type || 'nfce',
      invoice_type === 'nfce' ? settings.nfce_series : settings.nfe_series, invoiceNumber, 'processing', order.total
    );

    await db.prepare(`UPDATE fiscal_settings SET ${numberField} = ${numberField} + 1 WHERE company_id = ?`).run(req.user.company_id);

    await db.prepare(`UPDATE invoices SET status = 'authorized', access_key = ?, authorization_protocol = ? WHERE id = ?`).run(
      `${Date.now()}${Math.random().toString(36).substr(2, 10)}`, `PROT${Date.now()}`, result.insertId
    );

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'issue_invoice', 'invoice', result.insertId);

    res.status(201).json({ id: result.insertId, number: invoiceNumber, message: 'Nota fiscal emitida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao emitir nota fiscal' });
  }
});

router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    await db.prepare(`UPDATE invoices SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ? WHERE id = ? AND company_id = ?`).run(reason || 'Cancelamento solicitado', req.params.id, req.user.company_id);
    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'cancel_invoice', 'invoice', req.params.id);
    res.json({ message: 'Nota fiscal cancelada' });
  } catch (err) { res.status(500).json({ error: 'Erro ao cancelar nota' }); }
});

module.exports = router;
