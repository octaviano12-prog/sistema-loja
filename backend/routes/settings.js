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
    const settings = await db.prepare(`SELECT * FROM settings WHERE company_id = ?`).all(req.user.company_id);
    const company = await db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.user.company_id);
    const shipping = await db.prepare(`SELECT * FROM shipping_methods WHERE company_id = ?`).all(req.user.company_id);
    res.json({ settings: Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value])), company, shipping });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

router.put('/company', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const d = req.body;
    const update = { name: d.name, trade_name: d.trade_name, phone: d.phone, email: d.email, whatsapp: d.whatsapp,
      address: d.address, city: d.city, state: d.state, zip_code: d.zip_code, instagram: d.instagram,
      facebook: d.facebook, primary_color: d.primary_color, secondary_color: d.secondary_color,
      business_hours: d.business_hours, about_text: d.about_text, return_policy: d.return_policy,
      privacy_policy: d.privacy_policy, terms_text: d.terms_text };
    if (req.file) update.logo = `/uploads/${req.file.filename}`;

    const sets = Object.keys(update).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE companies SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(update), req.user.company_id);
    res.json({ message: 'Configurações atualizadas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

router.put('/setting/:key', authenticateToken, async (req, res) => {
  try {
    const { value } = req.body;
    const existing = await db.prepare(`SELECT id FROM settings WHERE company_id = ? AND setting_key = ?`).get(req.user.company_id, req.params.key);
    if (existing) {
      await db.prepare(`UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ? AND setting_key = ?`).run(value, req.user.company_id, req.params.key);
    } else {
      await db.prepare(`INSERT INTO settings (company_id, setting_key, setting_value) VALUES (?, ?, ?)`).run(req.user.company_id, req.params.key, value);
    }
    res.json({ message: 'Configuração atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

router.put('/shipping/:id', authenticateToken, async (req, res) => {
  try {
    const { name, price, min_days, max_days, status } = req.body;
    await db.prepare(`UPDATE shipping_methods SET name=?, price=?, min_days=?, max_days=?, status=? WHERE id=? AND company_id=?`).run(name, price, min_days, max_days, status || 'active', req.params.id, req.user.company_id);
    res.json({ message: 'Método atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar método' });
  }
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.last_login, r.name as role_name, u.created_at
      FROM users u LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.company_id = ? AND u.deleted_at IS NULL ORDER BY u.name
    `).all(req.user.company_id);
    const roles = await db.prepare(`SELECT * FROM roles WHERE company_id = ?`).all(req.user.company_id);
    res.json({ users, roles });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE company_id = ?`).get(req.user.company_id)).count;
    const logs = await db.prepare(`
      SELECT al.*, u.name as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
      WHERE al.company_id = ? ORDER BY al.created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.company_id, limit, offset);
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar logs' });
  }
});

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.prepare(`SELECT * FROM notifications WHERE company_id = ? AND (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC LIMIT 50`).all(req.user.company_id, req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar notificações' });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
    res.json({ message: 'Notificação lida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro' });
  }
});

module.exports = router;
