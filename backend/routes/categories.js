const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND deleted_at IS NULL) as products_count
      FROM categories c
      WHERE c.company_id = ? AND c.deleted_at IS NULL
      ORDER BY c.sort_order, c.name
    `).all(req.user.company_id);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, parent_id, status } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const result = await db.prepare(`INSERT INTO categories (company_id, name, slug, description, parent_id, status) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(req.user.company_id, name, slug, description || null, parent_id || null, status || 'active');
    res.status(201).json({ id: result.insertId, message: 'Categoria criada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, parent_id, status } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await db.prepare(`UPDATE categories SET name=?, slug=?, description=?, parent_id=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`)
      .run(name, slug, description || null, parent_id || null, status || 'active', req.params.id, req.user.company_id);
    res.json({ message: 'Categoria atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`UPDATE categories SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(req.params.id, req.user.company_id);
    res.json({ message: 'Categoria excluída' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

router.get('/brands', authenticateToken, async (req, res) => {
  try {
    const brands = await db.prepare(`SELECT * FROM brands WHERE company_id = ? AND deleted_at IS NULL ORDER BY name`).all(req.user.company_id);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar marcas' });
  }
});

router.post('/brands', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const result = await db.prepare(`INSERT INTO brands (company_id, name, slug, description) VALUES (?, ?, ?, ?)`)
      .run(req.user.company_id, name, slug, description || null);
    res.status(201).json({ id: result.insertId, message: 'Marca criada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar marca' });
  }
});

router.get('/collections', authenticateToken, async (req, res) => {
  try {
    const collections = await db.prepare(`SELECT * FROM collections WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`).all(req.user.company_id);
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar coleções' });
  }
});

router.post('/collections', authenticateToken, async (req, res) => {
  try {
    const { name, description, start_date, end_date } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const result = await db.prepare(`INSERT INTO collections (company_id, name, slug, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(req.user.company_id, name, slug, description || null, start_date || null, end_date || null);
    res.status(201).json({ id: result.insertId, message: 'Coleção criada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar coleção' });
  }
});

module.exports = router;
