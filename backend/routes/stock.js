const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 30, type, product_id } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE sm.company_id = ?';
    const params = [req.user.company_id];
    if (type) { where += ' AND sm.type = ?'; params.push(type); }
    if (product_id) { where += ' AND sm.product_id = ?'; params.push(product_id); }
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM stock_movements sm ${where}`).get(...params)).count;
    const movements = await db.prepare(`
      SELECT sm.*, p.name as product_name, u.name as user_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      ${where} ORDER BY sm.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    res.json({ movements, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar movimentações' });
  }
});

router.post('/adjust', authenticateToken, async (req, res) => {
  try {
    const { product_id, variant_id, quantity, type, notes } = req.body;
    if (variant_id) {
      await db.prepare(`UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity + ?) WHERE id = ?`).run(quantity, variant_id);
    }
    await db.prepare(`INSERT INTO stock_movements (company_id, branch_id, product_id, variant_id, type, quantity, reference_type, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.user.company_id, req.user.branch_id, product_id, variant_id || null, type || 'adjust', quantity, 'manual', req.user.id, notes || null
    );
    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'stock_adjust', 'product', product_id);
    res.json({ message: 'Estoque ajustado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ajustar estoque' });
  }
});

router.post('/entry', authenticateToken, async (req, res) => {
  try {
    const { product_id, variant_id, quantity, cost_price, notes } = req.body;
    if (variant_id) {
      await db.prepare(`UPDATE product_variants SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?`).run(quantity, cost_price || 0, variant_id);
    }
    await db.prepare(`UPDATE products SET cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(cost_price || 0, product_id);
    await db.prepare(`INSERT INTO stock_movements (company_id, branch_id, product_id, variant_id, type, quantity, cost_price, reference_type, user_id, notes) VALUES (?, ?, ?, ?, 'purchase', ?, ?, 'entry', ?, ?)`).run(
      req.user.company_id, req.user.branch_id, product_id, variant_id || null, quantity, cost_price || 0, req.user.id, notes || null
    );
    res.json({ message: 'Entrada registrada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar entrada' });
  }
});

router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { filter } = req.query;
    let where = 'WHERE p.company_id = ? AND p.deleted_at IS NULL';
    const params = [req.user.company_id];
    if (filter === 'low_stock') { where += ' AND COALESCE(pv_total.total_stock, 0) <= COALESCE(pv_total.min_total, 0)'; }
    if (filter === 'no_stock') { where += ' AND COALESCE(pv_total.total_stock, 0) = 0'; }
    if (filter === 'overstock') { where += ' AND COALESCE(pv_total.total_stock, 0) > 50'; }
    const products = await db.prepare(`
      SELECT p.*, c.name as category_name,
        COALESCE(pv_total.total_stock, 0) as total_stock,
        COALESCE(pv_total.min_total, 0) as min_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT product_id, SUM(stock_quantity) as total_stock, SUM(min_stock) as min_total
        FROM product_variants WHERE deleted_at IS NULL GROUP BY product_id
      ) pv_total ON p.id = pv_total.product_id
      ${where} ORDER BY p.name
    `).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório de estoque' });
  }
});

router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await db.prepare(`
      SELECT p.name, pv.color, pv.size, pv.stock_quantity, pv.min_stock, pv.sku
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.company_id = ? AND pv.deleted_at IS NULL AND pv.stock_quantity <= pv.min_stock
      ORDER BY pv.stock_quantity ASC
    `).all(req.user.company_id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
});

module.exports = router;
