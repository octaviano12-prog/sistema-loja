const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

router.get('/api/home', async (req, res) => {
  try {
    const company = await db.prepare(`SELECT * FROM companies WHERE id = 1`).get();
    const featured = await db.prepare(`SELECT p.*, COALESCE(SUM(pv.stock_quantity), 0) as total_stock FROM products p LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL WHERE p.company_id = 1 AND p.is_featured = 1 AND p.status = 'active' AND p.deleted_at IS NULL GROUP BY p.id LIMIT 8`).all();
    const newArrivals = await db.prepare(`SELECT p.*, COALESCE(SUM(pv.stock_quantity), 0) as total_stock FROM products p LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL WHERE p.company_id = 1 AND p.status = 'active' AND p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 8`).all();
    const categories = await db.prepare(`SELECT * FROM categories WHERE company_id = 1 AND deleted_at IS NULL ORDER BY sort_order LIMIT 8`).all();
    const promotional = await db.prepare(`SELECT p.*, COALESCE(SUM(pv.stock_quantity), 0) as total_stock FROM products p LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL WHERE p.company_id = 1 AND p.is_promotional = 1 AND p.status = 'active' AND p.deleted_at IS NULL GROUP BY p.id LIMIT 8`).all();
    const settings = Object.fromEntries((await db.prepare(`SELECT setting_key, setting_value FROM settings WHERE company_id = 1`).all()).map(s => [s.setting_key, s.setting_value]));
    res.json({ company, featured, newArrivals, categories, promotional, settings });
  } catch (err) { res.status(500).json({ error: 'Erro ao carregar página' }); }
});

router.get('/api/products', async (req, res) => {
  try {
    const { category, brand, collection, search, min_price, max_price, sort, page = 1, limit = 12, gender, sizes, colors } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE p.company_id = 1 AND p.status = "active" AND p.deleted_at IS NULL';
    const params = [];
    if (category) { where += ' AND (c.slug = ? OR c.id = ?)'; params.push(category, category); }
    if (brand) { where += ' AND b.slug = ?'; params.push(brand); }
    if (collection) { where += ' AND col.slug = ?'; params.push(collection); }
    if (search) { where += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (min_price) { where += ' AND p.price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { where += ' AND p.price <= ?'; params.push(parseFloat(max_price)); }
    if (gender) { where += ' AND p.gender = ?'; params.push(gender); }

    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.price DESC';
    else if (sort === 'name') orderBy = 'ORDER BY p.name ASC';
    else if (sort === 'popular') orderBy = 'ORDER BY p.sales_count DESC';

    const total = (await db.prepare(`SELECT COUNT(*) as count FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN collections col ON p.collection_id = col.id ${where}`).get(...params)).count;

    const products = await db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name,
        COALESCE(SUM(pv.stock_quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN collections col ON p.collection_id = col.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
      ${where} GROUP BY p.id ${orderBy} LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ products, total, page: Number(page), limit: Number(limit) });
  } catch (err) { res.status(500).json({ error: 'Erro ao listar produtos' }); }
});

router.get('/api/products/:slug', async (req, res) => {
  try {
    const product = await db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, col.name as collection_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN collections col ON p.collection_id = col.id
      WHERE (p.slug = ? OR p.id = ?) AND p.status = 'active' AND p.deleted_at IS NULL
    `).get(req.params.slug, req.params.slug);

    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const variants = await db.prepare(`SELECT * FROM product_variants WHERE product_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY color, size`).all(product.id);

    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

    const related = await db.prepare(`SELECT p.*, COALESCE(SUM(pv.stock_quantity), 0) as total_stock FROM products p LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL WHERE p.category_id = ? AND p.id != ? AND p.status = 'active' AND p.deleted_at IS NULL GROUP BY p.id LIMIT 4`).all(product.category_id, product.id);

    await db.prepare(`UPDATE products SET views_count = views_count + 1 WHERE id = ?`).run(product.id);

    res.json({ ...product, variants, colors, sizes, related, images: JSON.parse(product.images || '[]') });
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar produto' }); }
});

router.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status = 'active' AND deleted_at IS NULL) as products_count FROM categories c WHERE c.company_id = 1 AND c.deleted_at IS NULL ORDER BY c.sort_order, c.name`).all();
    res.json(categories);
  } catch (err) { res.status(500).json({ error: 'Erro ao listar categorias' }); }
});

router.get('/api/shipping', async (req, res) => {
  try {
    const { zip_code, total } = req.query;
    const methods = await db.prepare(`SELECT * FROM shipping_methods WHERE company_id = 1 AND status = 'active'`).all();
    const freeShippingRow = await db.prepare(`SELECT setting_value FROM settings WHERE company_id = 1 AND setting_key = 'free_shipping_min'`).get();
    const freeShippingMin = parseFloat(freeShippingRow?.setting_value || 0);
    const result = methods.map(m => ({
      ...m,
      final_price: (total >= freeShippingMin && freeShippingMin > 0 && m.type !== 'pickup') ? 0 : m.price
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Erro ao calcular frete' }); }
});

router.post('/api/coupon/validate', async (req, res) => {
  try {
    const { code, cart_total } = req.body;
    const coupon = await db.prepare(`SELECT * FROM coupons WHERE company_id = 1 AND code = ? AND status = 'active'`).get(code?.toUpperCase());
    if (!coupon) return res.status(404).json({ error: 'Cupom inválido' });
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) return res.status(400).json({ error: 'Cupom expirado' });
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Cupom esgotado' });
    if (coupon.min_purchase && cart_total < coupon.min_purchase) return res.status(400).json({ error: `Compra mínima: R$ ${coupon.min_purchase}` });
    let discount = coupon.type === 'percentage' ? cart_total * (coupon.value / 100) : coupon.value;
    if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
    res.json({ valid: true, discount: Math.min(discount, cart_total) });
  } catch (err) { res.status(500).json({ error: 'Erro ao validar cupom' }); }
});

router.post('/api/orders', async (req, res) => {
  try {
    const d = req.body;
    let customer_id = d.customer_id;

    if (!customer_id && d.customer) {
      const c = d.customer;
      const existing = await db.prepare(`SELECT id FROM customers WHERE email = ? AND company_id = 1`).get(c.email);
      if (existing) {
        customer_id = existing.id;
      } else {
        const result = await db.prepare(`INSERT INTO customers (company_id, name, email, phone, cpf_cnpj, address, city, state, zip_code) VALUES (1,?,?,?,?,?,?,?,?)`).run(
          c.name, c.email, c.phone || null, c.cpf_cnpj || null, c.address || null, c.city || null, c.state || null, c.zip_code || null
        );
        customer_id = result.insertId;
      }
    }

    const orderNumber = `WEB${Date.now().toString().slice(-8)}`;
    let subtotal = 0;
    (d.items || []).forEach(item => { subtotal += (item.quantity || 1) * (item.unit_price || 0); });
    const discount = parseFloat(d.discount) || 0;
    const shipping = parseFloat(d.shipping_cost) || 0;
    const total = subtotal - discount + shipping;

    const result = await db.prepare(`INSERT INTO sales_orders (company_id, branch_id, order_number, customer_id, origin, subtotal, discount, shipping_cost, shipping_method, total, payment_method, payment_status, status, shipping_address, shipping_city, shipping_state, shipping_zip, notes) VALUES (1, 1, ?, ?, 'online', ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)`).run(
      orderNumber, customer_id || null, subtotal, discount, shipping, d.shipping_method || null, total,
      d.payment_method || null, d.payment_status || 'pending',
      d.shipping_address || null, d.shipping_city || null, d.shipping_state || null, d.shipping_zip || null, d.notes || null
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
      await db.prepare(`INSERT INTO stock_movements (company_id, product_id, variant_id, type, quantity, reference_type, reference_id) VALUES (1, ?, ?, 'sale', ?, 'order', ?)`).run(item.product_id, item.variant_id || null, -item.quantity, orderId);
    }

    if (customer_id) {
      await db.prepare(`UPDATE customers SET total_spent = total_spent + ?, total_orders = total_orders + 1, last_purchase_date = CURDATE() WHERE id = ?`).run(total, customer_id);
    }

    res.status(201).json({ id: orderId, order_number: orderNumber, total, message: 'Pedido realizado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

router.get('/api/orders/track/:number', async (req, res) => {
  try {
    const order = await db.prepare(`
      SELECT so.*, c.name as customer_name FROM sales_orders so LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.order_number = ? AND so.company_id = 1
    `).get(req.params.number);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    const items = await db.prepare(`SELECT * FROM sales_order_items WHERE order_id = ?`).all(order.id);
    res.json({ ...order, items });
  } catch (err) { res.status(500).json({ error: 'Erro ao rastrear pedido' }); }
});

router.get('/api/pages/:slug', async (req, res) => {
  try {
    const company = await db.prepare(`SELECT * FROM companies WHERE id = 1`).get();
    const pages = {
      'about': { title: 'Sobre Nós', content: company.about_text || 'Sobre nossa loja' },
      'return-policy': { title: 'Política de Troca e Devolução', content: company.return_policy || 'Nossa política de troca' },
      'privacy': { title: 'Política de Privacidade', content: company.privacy_policy || 'Nossa política de privacidade' },
      'terms': { title: 'Termos de Uso', content: company.terms_text || 'Nossos termos de uso' },
      'contact': { title: 'Contato', content: `Telefone: ${company.phone}\nEmail: ${company.email}\nWhatsApp: ${company.whatsapp}\nEndereço: ${company.address}` }
    };
    const page = pages[req.params.slug];
    if (!page) return res.status(404).json({ error: 'Página não encontrada' });
    res.json(page);
  } catch (err) { res.status(500).json({ error: 'Erro' }); }
});

module.exports = router;
