const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const coupons = await db.prepare(`SELECT * FROM coupons WHERE company_id = ? ORDER BY created_at DESC`).all(req.user.company_id);
    res.json(coupons);
  } catch (err) { res.status(500).json({ error: 'Erro ao listar cupons' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    const result = await db.prepare(`INSERT INTO coupons (company_id, code, type, value, min_purchase, max_discount, start_date, end_date, max_uses, max_uses_per_customer, allowed_categories, allowed_products, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      req.user.company_id, d.code.toUpperCase(), d.type, parseFloat(d.value), parseFloat(d.min_purchase) || 0, parseFloat(d.max_discount) || null, d.start_date || null, d.end_date || null, d.max_uses || null, d.max_uses_per_customer || 1, d.allowed_categories || null, d.allowed_products || null, d.status || 'active'
    );
    res.status(201).json({ id: result.insertId, message: 'Cupom criado' });
  } catch (err) { res.status(500).json({ error: 'Erro ao criar cupom' }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const d = req.body;
    await db.prepare(`UPDATE coupons SET code=?, type=?, value=?, min_purchase=?, max_discount=?, start_date=?, end_date=?, max_uses=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).run(
      d.code?.toUpperCase(), d.type, parseFloat(d.value), parseFloat(d.min_purchase) || 0, parseFloat(d.max_discount) || null, d.start_date || null, d.end_date || null, d.max_uses || null, d.status || 'active', req.params.id, req.user.company_id
    );
    res.json({ message: 'Cupom atualizado' });
  } catch (err) { res.status(500).json({ error: 'Erro ao atualizar cupom' }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`DELETE FROM coupons WHERE id=? AND company_id=?`).run(req.params.id, req.user.company_id);
    res.json({ message: 'Cupom excluído' });
  } catch (err) { res.status(500).json({ error: 'Erro ao excluir cupom' }); }
});

router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code, customer_id, cart_total } = req.body;
    const coupon = await db.prepare(`SELECT * FROM coupons WHERE company_id = ? AND code = ? AND status = 'active'`).get(req.user.company_id, code?.toUpperCase());
    if (!coupon) return res.status(404).json({ error: 'Cupom inválido' });
    if (coupon.start_date && new Date(coupon.start_date) > new Date()) return res.status(400).json({ error: 'Cupom ainda não válido' });
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) return res.status(400).json({ error: 'Cupom expirado' });
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Cupom esgotado' });
    if (coupon.min_purchase && cart_total < coupon.min_purchase) return res.status(400).json({ error: `Compra mínima: R$ ${coupon.min_purchase}` });

    let discount = 0;
    if (coupon.type === 'percentage') { discount = cart_total * (coupon.value / 100); }
    else if (coupon.type === 'fixed') { discount = coupon.value; }
    if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;

    res.json({ valid: true, discount: Math.min(discount, cart_total), coupon });
  } catch (err) { res.status(500).json({ error: 'Erro ao validar cupom' }); }
});

module.exports = router;
