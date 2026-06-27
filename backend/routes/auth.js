const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { generateToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await db.prepare(`
      SELECT u.*, r.name as role_name, r.permissions, c.name as company_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = ? AND u.status = 'active' AND u.deleted_at IS NULL
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    await db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        company_id: user.company_id,
        branch_id: user.branch_id,
        permissions: user.permissions ? JSON.parse(user.permissions) : {}
      },
      company: {
        id: user.company_id,
        name: user.company_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const user = await db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar, u.status, u.last_login,
             r.name as role_name, r.permissions, c.name as company_name,
             c.logo, c.primary_color, c.secondary_color
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

router.post('/change-password', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.json({ message: 'Se o email existir, enviaremos instruções de recuperação' });
    }

    res.json({ message: 'Se o email existir, enviaremos instruções de recuperação' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar recuperação' });
  }
});

module.exports = router;
