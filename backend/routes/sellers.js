const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const sellers = await db.prepare(`SELECT * FROM sellers WHERE company_id = ? AND deleted_at IS NULL ORDER BY name`).all(req.user.company_id);
    res.json(sellers);
  } catch (err) { res.status(500).json({ error: 'Erro ao listar vendedores' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    const result = await db.prepare(`INSERT INTO sellers (company_id, branch_id, name, cpf, phone, email, commission_rate, monthly_goal) VALUES (?,?,?,?,?,?,?,?)`).run(
      req.user.company_id, d.branch_id || req.user.branch_id || 1, d.name, d.cpf || null, d.phone || null, d.email || null, parseFloat(d.commission_rate) || 5, parseFloat(d.monthly_goal) || 0
    );
    res.status(201).json({ id: result.insertId, message: 'Vendedor cadastrado' });
  } catch (err) { res.status(500).json({ error: 'Erro ao cadastrar vendedor' }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    await db.prepare(`UPDATE sellers SET name=?, cpf=?, phone=?, email=?, commission_rate=?, monthly_goal=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(
      d.name, d.cpf || null, d.phone || null, d.email || null, parseFloat(d.commission_rate) || 5, parseFloat(d.monthly_goal) || 0, d.status || 'active', req.params.id, req.user.company_id
    );
    res.json({ message: 'Vendedor atualizado' });
  } catch (err) { res.status(500).json({ error: 'Erro ao atualizar vendedor' }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`UPDATE sellers SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(req.params.id, req.user.company_id);
    res.json({ message: 'Vendedor excluído' });
  } catch (err) { res.status(500).json({ error: 'Erro ao excluir vendedor' }); }
});

router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const ranking = await db.prepare(`
      SELECT s.name, s.commission_rate, s.monthly_goal, s.total_sales, s.total_commission,
        COUNT(so.id) as orders_count
      FROM sellers s
      LEFT JOIN sales_orders so ON s.id = so.seller_id AND so.status != 'cancelled'
      WHERE s.company_id = ? AND s.deleted_at IS NULL
      GROUP BY s.id ORDER BY s.total_sales DESC
    `).all(req.user.company_id);
    res.json(ranking);
  } catch (err) { res.status(500).json({ error: 'Erro ao gerar ranking' }); }
});

module.exports = router;
