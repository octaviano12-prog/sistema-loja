const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category_id, status, brand_id } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE p.company_id = ? AND p.deleted_at IS NULL';
    const params = [req.user.company_id];

    if (search) { where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
    if (brand_id) { where += ' AND p.brand_id = ?'; params.push(brand_id); }
    if (status) { where += ' AND p.status = ?'; params.push(status); }

    const total = (await db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params)).count;
    const products = await db.prepare(`
      SELECT p.*, c.name as category_name, b.name as brand_name,
        COALESCE(SUM(pv.stock_quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
      ${where}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ products, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await db.prepare(`
      SELECT p.*, c.name as category_name, b.name as brand_name, col.name as collection_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN collections col ON p.collection_id = col.id
      WHERE p.id = ? AND p.company_id = ? AND p.deleted_at IS NULL
    `).get(req.params.id, req.user.company_id);

    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const variants = await db.prepare(`
      SELECT * FROM product_variants WHERE product_id = ? AND deleted_at IS NULL ORDER BY color, size
    `).all(product.id);

    res.json({ ...product, variants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const data = req.body;
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : JSON.parse(data.images || '[]');

    const result = await db.prepare(`
      INSERT INTO products (company_id, category_id, brand_id, collection_id, name, slug, sku, barcode,
        description, short_description, ncm, cest, cfop, unit, cost_price, price, promotional_price,
        weight, height, width, length, images, video_url, size_chart, is_featured, is_promotional,
        is_new, allow_out_of_stock, gender, product_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.company_id, data.category_id || null, data.brand_id || null, data.collection_id || null,
      data.name, (data.slug || data.name).toLowerCase().replace(/\s+/g, '-'),
      data.sku || null, data.barcode || null, data.description || null, data.short_description || null,
      data.ncm || null, data.cest || null, data.cfop || null, data.unit || 'UN',
      parseFloat(data.cost_price) || 0, parseFloat(data.price) || 0, parseFloat(data.promotional_price) || null,
      parseFloat(data.weight) || 0, parseFloat(data.height) || 0, parseFloat(data.width) || 0, parseFloat(data.length) || 0,
      JSON.stringify(images), data.video_url || null, data.size_chart || null,
      data.is_featured ? 1 : 0, data.is_promotional ? 1 : 0, data.is_new ? 1 : 0,
      data.allow_out_of_stock ? 1 : 0, data.gender || null, data.product_type || null, data.status || 'active'
    );

    if (data.variants) {
      const variants = typeof data.variants === 'string' ? JSON.parse(data.variants) : data.variants;
      for (const v of variants) {
        await db.prepare(`
          INSERT INTO product_variants (product_id, company_id, branch_id, color, size, sku, barcode, price, cost_price, stock_quantity, min_stock, image, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          result.insertId, req.user.company_id, req.user.branch_id,
          v.color || null, v.size || null, v.sku || null, v.barcode || null,
          parseFloat(v.price) || parseFloat(data.price) || 0,
          parseFloat(v.cost_price) || parseFloat(data.cost_price) || 0,
          parseInt(v.stock_quantity) || 0, parseInt(v.min_stock) || 0,
          v.image || null, v.status || 'active'
        );
      }
    }

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'create', 'product', result.insertId);

    res.status(201).json({ id: result.insertId, message: 'Produto criado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

router.put('/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const data = req.body;
    const images = req.files?.length ? req.files.map(f => `/uploads/${f.filename}`) : null;

    let updateSql = `UPDATE products SET name=?, slug=?, category_id=?, brand_id=?, collection_id=?,
      sku=?, barcode=?, description=?, short_description=?, ncm=?, cest=?, cfop=?, unit=?,
      cost_price=?, price=?, promotional_price=?, weight=?, height=?, width=?, length=?,
      is_featured=?, is_promotional=?, is_new=?, allow_out_of_stock=?, gender=?, product_type=?,
      status=?, updated_at=CURRENT_TIMESTAMP`;
    const params = [
      data.name, (data.slug || data.name).toLowerCase().replace(/\s+/g, '-'),
      data.category_id || null, data.brand_id || null, data.collection_id || null,
      data.sku || null, data.barcode || null, data.description || null, data.short_description || null,
      data.ncm || null, data.cest || null, data.cfop || null, data.unit || 'UN',
      parseFloat(data.cost_price) || 0, parseFloat(data.price) || 0, parseFloat(data.promotional_price) || null,
      parseFloat(data.weight) || 0, parseFloat(data.height) || 0, parseFloat(data.width) || 0, parseFloat(data.length) || 0,
      data.is_featured ? 1 : 0, data.is_promotional ? 1 : 0, data.is_new ? 1 : 0,
      data.allow_out_of_stock ? 1 : 0, data.gender || null, data.product_type || null, data.status || 'active'
    ];

    if (images) {
      updateSql += ', images=?';
      params.push(JSON.stringify(images));
    }

    updateSql += ' WHERE id=? AND company_id=? AND deleted_at IS NULL';
    params.push(req.params.id, req.user.company_id);

    await db.prepare(updateSql).run(...params);

    if (data.variants) {
      const variants = typeof data.variants === 'string' ? JSON.parse(data.variants) : data.variants;
      for (const v of variants) {
        if (v.id) {
          await db.prepare(`UPDATE product_variants SET color=?, size=?, sku=?, barcode=?, price=?, cost_price=?, stock_quantity=?, min_stock=?, status=? WHERE id=? AND product_id=?`).run(
            v.color || null, v.size || null, v.sku || null, v.barcode || null,
            parseFloat(v.price) || parseFloat(data.price) || 0,
            parseFloat(v.cost_price) || parseFloat(data.cost_price) || 0,
            parseInt(v.stock_quantity) || 0, parseInt(v.min_stock) || 0,
            v.status || 'active', v.id, req.params.id
          );
        } else {
          await db.prepare(`INSERT INTO product_variants (product_id, company_id, branch_id, color, size, sku, barcode, price, cost_price, stock_quantity, min_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            req.params.id, req.user.company_id, req.user.branch_id,
            v.color || null, v.size || null, v.sku || null, v.barcode || null,
            parseFloat(v.price) || parseFloat(data.price) || 0,
            parseFloat(v.cost_price) || parseFloat(data.cost_price) || 0,
            parseInt(v.stock_quantity) || 0, parseInt(v.min_stock) || 0,
            v.status || 'active'
          );
        }
      }
    }

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'update', 'product', req.params.id);

    res.json({ message: 'Produto atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`UPDATE products SET deleted_at = CURRENT_TIMESTAMP, status = 'inactive' WHERE id = ? AND company_id = ?`).run(req.params.id, req.user.company_id);
    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'delete', 'product', req.params.id);
    res.json({ message: 'Produto excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

module.exports = router;
