const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;
    const startDate = start_date || new Date(new Date().setDate(-30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const sales = await db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue, AVG(total) as avg_ticket
      FROM sales_orders WHERE company_id = ? AND created_at BETWEEN ? AND ? AND status != 'cancelled'
      GROUP BY DATE(created_at) ORDER BY date
    `).all(req.user.company_id, startDate, endDate);

    const total = sales.reduce((s, r) => s + r.revenue, 0);
    const totalOrders = sales.reduce((s, r) => s + r.orders, 0);
    res.json({ sales, total_revenue: total, total_orders: totalOrders, avg_ticket: totalOrders > 0 ? total / totalOrders : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(-30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const products = await db.prepare(`
      SELECT p.name, p.sku, c.name as category, SUM(oi.quantity) as total_qty, SUM(oi.total) as total_revenue
      FROM sales_order_items oi
      JOIN sales_orders so ON oi.order_id = so.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE so.company_id = ? AND so.created_at BETWEEN ? AND ? AND so.status != 'cancelled'
      GROUP BY p.id ORDER BY total_revenue DESC LIMIT 50
    `).all(req.user.company_id, startDate, endDate);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(-30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const categories = await db.prepare(`
      SELECT c.name, COUNT(DISTINCT so.id) as orders, SUM(oi.quantity) as total_qty, SUM(oi.total) as total_revenue
      FROM sales_order_items oi
      JOIN sales_orders so ON oi.order_id = so.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE so.company_id = ? AND so.created_at BETWEEN ? AND ? AND so.status != 'cancelled'
      GROUP BY c.id ORDER BY total_revenue DESC
    `).all(req.user.company_id, startDate, endDate);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/sellers', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(-30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const sellers = await db.prepare(`
      SELECT s.name, COUNT(so.id) as total_orders, SUM(so.total) as total_sales,
        AVG(s.commission_rate) as commission_rate, SUM(so.total * s.commission_rate / 100) as total_commission
      FROM sellers s
      LEFT JOIN sales_orders so ON s.id = so.seller_id AND so.created_at BETWEEN ? AND ? AND so.status != 'cancelled'
      WHERE s.company_id = ?
      GROUP BY s.id ORDER BY total_sales DESC
    `).all(startDate, endDate, req.user.company_id);
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(-30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const customers = await db.prepare(`
      SELECT c.name, c.email, COUNT(so.id) as total_orders, SUM(so.total) as total_spent, AVG(so.total) as avg_ticket, MAX(so.created_at) as last_purchase
      FROM customers c
      LEFT JOIN sales_orders so ON c.id = so.customer_id AND so.created_at BETWEEN ? AND ?
      WHERE c.company_id = ?
      GROUP BY c.id HAVING total_orders > 0
      ORDER BY total_spent DESC LIMIT 50
    `).all(startDate, endDate, req.user.company_id);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
