const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let where = 'WHERE company_id = ? AND deleted_at IS NULL';
    const params = [req.user.company_id];
    if (search) { where += ' AND (name LIKE ? OR trade_name LIKE ? OR cnpj LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const suppliers = await db.prepare(`SELECT * FROM suppliers ${where} ORDER BY name`).all(...params);
    res.json(suppliers);
  } catch (err) { res.status(500).json({ error: 'Erro ao listar fornecedores' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    const result = await db.prepare(`INSERT INTO suppliers (company_id, name, trade_name, cnpj, state_registration, phone, whatsapp, email, contact_person, address, city, state, zip_code, payment_terms, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      req.user.company_id, d.name, d.trade_name || null, d.cnpj || null, d.state_registration || null, d.phone || null, d.whatsapp || d.phone || null, d.email || null, d.contact_person || null, d.address || null, d.city || null, d.state || null, d.zip_code || null, d.payment_terms || null, d.notes || null
    );
    res.status(201).json({ id: result.insertId, message: 'Fornecedor cadastrado' });
  } catch (err) { res.status(500).json({ error: 'Erro ao cadastrar fornecedor' }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    await db.prepare(`UPDATE suppliers SET name=?, trade_name=?, cnpj=?, state_registration=?, phone=?, whatsapp=?, email=?, contact_person=?, address=?, city=?, state=?, zip_code=?, payment_terms=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(
      d.name, d.trade_name || null, d.cnpj || null, d.state_registration || null, d.phone || null, d.whatsapp || null, d.email || null, d.contact_person || null, d.address || null, d.city || null, d.state || null, d.zip_code || null, d.payment_terms || null, d.notes || null, req.params.id, req.user.company_id
    );
    res.json({ message: 'Fornecedor atualizado' });
  } catch (err) { res.status(500).json({ error: 'Erro ao atualizar fornecedor' }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`UPDATE suppliers SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(req.params.id, req.user.company_id);
    res.json({ message: 'Fornecedor excluído' });
  } catch (err) { res.status(500).json({ error: 'Erro ao excluir fornecedor' }); }
});

router.get('/:id/purchases', authenticateToken, async (req, res) => {
  try {
    const purchases = await db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.company_id = ? AND po.supplier_id = ? ORDER BY po.created_at DESC`).all(req.user.company_id, req.params.id);
    res.json(purchases);
  } catch (err) { res.status(500).json({ error: 'Erro ao listar compras' }); }
});

module.exports = router;
