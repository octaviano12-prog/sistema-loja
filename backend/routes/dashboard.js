const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];

    const todayRevenue = (await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales_orders WHERE company_id = ? AND DATE(created_at) = ? AND status != 'cancelled'`).get(companyId, today)).total;

    const monthRevenue = (await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales_orders WHERE company_id = ? AND created_at >= ? AND status != 'cancelled'`).get(companyId, monthStart)).total;

    const todayOrders = (await db.prepare(`SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ? AND DATE(created_at) = ?`).get(companyId, today)).count;

    const pendingOrders = (await db.prepare(`SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ? AND status IN ('new', 'pending_payment')`).get(companyId)).count;

    const onlineSales = (await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales_orders WHERE company_id = ? AND origin = 'online' AND DATE(created_at) = ? AND status != 'cancelled'`).get(companyId, today)).total;
    const pdvSales = (await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales_orders WHERE company_id = ? AND origin = 'pdv' AND DATE(created_at) = ? AND status != 'cancelled'`).get(companyId, today)).total;

    const topProducts = await db.prepare(`
      SELECT p.name, SUM(oi.quantity) as qty, SUM(oi.total) as revenue
      FROM sales_order_items oi
      JOIN sales_orders so ON oi.order_id = so.id
      JOIN products p ON oi.product_id = p.id
      WHERE so.company_id = ? AND so.created_at >= ? AND so.status != 'cancelled'
      GROUP BY p.id ORDER BY revenue DESC LIMIT 5
    `).all(companyId, monthStart);

    const lowStock = await db.prepare(`
      SELECT p.name, COALESCE(SUM(pv.stock_quantity), 0) as stock
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
      WHERE p.company_id = ? AND p.deleted_at IS NULL
      GROUP BY p.id HAVING stock <= 5 ORDER BY stock ASC LIMIT 5
    `).all(companyId);

    const newCustomers = (await db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND created_at >= ?`).get(companyId, monthStart)).count;

    const cashRegister = await db.prepare(`SELECT status FROM cash_registers WHERE company_id = ? AND branch_id = ? AND status = 'open'`).get(companyId, req.user.branch_id || 1);

    const payable = (await db.prepare(`SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM accounts_payable WHERE company_id = ? AND status != 'paid'`).get(companyId)).total;
    const receivable = (await db.prepare(`SELECT COALESCE(SUM(amount - received_amount), 0) as total FROM accounts_receivable WHERE company_id = ? AND status != 'paid'`).get(companyId)).total;

    const invoicesIssued = (await db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE company_id = ? AND status = 'authorized'`).get(companyId)).count;
    const invoiceErrors = (await db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE company_id = ? AND status = 'rejected'`).get(companyId)).count;

    const salesChart = await db.prepare(`
      SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders
      FROM sales_orders WHERE company_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status != 'cancelled'
      GROUP BY DATE(created_at) ORDER BY date
    `).all(companyId);

    const salesByCategory = await db.prepare(`
      SELECT c.name, SUM(oi.total) as revenue
      FROM sales_order_items oi
      JOIN sales_orders so ON oi.order_id = so.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE so.company_id = ? AND so.created_at >= ? AND so.status != 'cancelled'
      GROUP BY c.id ORDER BY revenue DESC
    `).all(companyId, monthStart);

    const profit = (await db.prepare(`
      SELECT COALESCE(SUM(oi.total - (oi.quantity * COALESCE(p.cost_price, 0))), 0) as profit
      FROM sales_order_items oi
      JOIN sales_orders so ON oi.order_id = so.id
      JOIN products p ON oi.product_id = p.id
      WHERE so.company_id = ? AND so.created_at >= ? AND so.status != 'cancelled'
    `).get(companyId, monthStart)).profit;

    res.json({
      today_revenue: todayRevenue,
      month_revenue: monthRevenue,
      today_orders: todayOrders,
      pending_orders: pendingOrders,
      online_sales: onlineSales,
      pdv_sales: pdvSales,
      top_products: topProducts,
      low_stock: lowStock,
      new_customers: newCustomers,
      cash_register_open: !!cashRegister,
      accounts_payable: payable,
      accounts_receivable: receivable,
      invoices_issued: invoicesIssued,
      invoice_errors: invoiceErrors,
      sales_chart: salesChart,
      sales_by_category: salesByCategory,
      estimated_profit: profit
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
