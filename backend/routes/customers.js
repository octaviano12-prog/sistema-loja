const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE company_id = ? AND deleted_at IS NULL';
    const params = [req.user.company_id];
    if (search) { where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR cpf_cnpj LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM customers ${where}`).get(...params)).count;
    const customers = await db.prepare(`SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    res.json({ customers, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await db.prepare(`SELECT * FROM customers WHERE id = ? AND company_id = ? AND deleted_at IS NULL`).get(req.params.id, req.user.company_id);
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });
    const orders = await db.prepare(`SELECT * FROM sales_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10`).all(customer.id);
    res.json({ ...customer, orders });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    const result = await db.prepare(`
      INSERT INTO customers (company_id, name, email, phone, whatsapp, cpf_cnpj, rg, birth_date, gender,
        address, number, complement, neighborhood, city, state, zip_code, notes, preferred_size, is_vip, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.company_id, d.name, d.email || null, d.phone || null, d.whatsapp || d.phone || null,
      d.cpf_cnpj || null, d.rg || null, d.birth_date || null, d.gender || null,
      d.address || null, d.number || null, d.complement || null, d.neighborhood || null,
      d.city || null, d.state || null, d.zip_code || null, d.notes || null,
      d.preferred_size || null, d.is_vip ? 1 : 0, d.status || 'active'
    );
    res.status(201).json({ id: result.insertId, message: 'Cliente cadastrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    await db.prepare(`
      UPDATE customers SET name=?, email=?, phone=?, whatsapp=?, cpf_cnpj=?, rg=?, birth_date=?, gender=?,
        address=?, number=?, complement=?, neighborhood=?, city=?, state=?, zip_code=?, notes=?,
        preferred_size=?, is_vip=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND company_id=?
    `).run(
      d.name, d.email || null, d.phone || null, d.whatsapp || d.phone || null,
      d.cpf_cnpj || null, d.rg || null, d.birth_date || null, d.gender || null,
      d.address || null, d.number || null, d.complement || null, d.neighborhood || null,
      d.city || null, d.state || null, d.zip_code || null, d.notes || null,
      d.preferred_size || null, d.is_vip ? 1 : 0, d.status || 'active',
      req.params.id, req.user.company_id
    );
    res.json({ message: 'Cliente atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`UPDATE customers SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(req.params.id, req.user.company_id);
    res.json({ message: 'Cliente excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

module.exports = router;
