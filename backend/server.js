const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { testConnection, db } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Compatibilidade do adaptador MySQL com as rotas que esperam insertId
if (db && typeof db.prepare === 'function' && !db.__insertIdPatched) {
  const originalPrepare = db.prepare.bind(db);
  db.prepare = function patchedPrepare(sql) {
    const statement = originalPrepare(sql);
    if (statement && typeof statement.run === 'function') {
      const originalRun = statement.run.bind(statement);
      statement.run = async (...params) => {
        const result = await originalRun(...params);
        if (result && result.insertId === undefined && result.lastInsertRowid !== undefined) {
          result.insertId = result.lastInsertRowid;
        }
        if (result && result.affectedRows === undefined && result.changes !== undefined) {
          result.affectedRows = result.changes;
        }
        return result;
      };
    }
    return statement;
  };
  db.__insertIdPatched = true;
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const stockRoutes = require('./routes/stock');
const pdvRoutes = require('./routes/pdv');
const financialRoutes = require('./routes/financial');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const supplierRoutes = require('./routes/suppliers');
const sellerRoutes = require('./routes/sellers');
const couponRoutes = require('./routes/coupons');
const fiscalRoutes = require('./routes/fiscal');
const dashboardRoutes = require('./routes/dashboard');
const storeRoutes = require('./routes/store');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/pdv', pdvRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/store', storeRoutes);

// Health check
app.get('/health', async (req, res) => {
  const database = await testConnection();
  res.status(database ? 200 : 503).json({
    status: database ? 'ok' : 'degraded',
    app: 'ModaControl Pro',
    database: database ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

function renderAdmin(req, res, next) {
  res.render('admin/index', (err, html) => {
    if (err) return next(err);

    const cleanedHtml = html
      .replace(/\s*<link href="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@4\.4\.0\/dist\/chart\.umd\.min\.js" rel="stylesheet">/g, '')
      .replace(/new Chart\(/g, 'window.Chart && new Chart(')
      .replace('</body>', '<script src="/js/fiscal-admin.js?v=20260627"></script></body>');

    res.send(cleanedHtml);
  });
}

// Admin routes
app.get('/admin', renderAdmin);
app.get('/admin/*', renderAdmin);

// Login
app.get('/login', (req, res) => {
  res.render('login');
});

// PDV
app.get('/pdv', (req, res) => {
  res.render('pdv/index');
});
app.get('/pdv/*', (req, res) => {
  res.render('pdv/index');
});

// Store
app.get('/', (req, res) => {
  res.render('store/index');
});
app.get('/store/*', (req, res) => {
  res.render('store/index');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ModaControl Pro rodando na porta ${PORT}`);
  console.log(`📱 Loja online: http://localhost:${PORT}/`);
  console.log(`🔧 Painel admin: http://localhost:${PORT}/admin`);
  console.log(`💰 PDV: http://localhost:${PORT}/pdv`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  testConnection();
});

module.exports = app;
