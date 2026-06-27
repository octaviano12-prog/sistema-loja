const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'modacontrol_secret_key_2024';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.prepare(`
      SELECT u.*, r.name as role_name, r.permissions, c.name as company_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ? AND u.status = 'active'
    `).get(decoded.id);

    if (!user) {
      return res.status(403).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.prepare(`
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ? AND u.status = 'active'
      `).get(decoded.id);
      req.user = user;
    } catch (err) {
    }
  }
  next();
}

function checkPermission(module, action = 'view') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    let permissions = {};
    try {
      permissions = JSON.parse(req.user.permissions || '{}');
    } catch (e) {
      permissions = {};
    }

    if (permissions.all === true) {
      return next();
    }

    const modulePerm = permissions[module];
    if (modulePerm === true || modulePerm === action) {
      return next();
    }

    return res.status(403).json({ error: 'Sem permissão para esta ação' });
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticateToken, optionalAuth, checkPermission, generateToken, JWT_SECRET };
