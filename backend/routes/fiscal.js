const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

let fiscalReady = false;

const fiscalColumns = [
  ['legal_name', 'VARCHAR(255)'],
  ['trade_name', 'VARCHAR(255)'],
  ['municipal_registration', 'VARCHAR(30)'],
  ['sefaz_state', 'VARCHAR(2)'],
  ['city', 'VARCHAR(100)'],
  ['city_ibge_code', 'VARCHAR(20)'],
  ['address', 'VARCHAR(255)'],
  ['number', 'VARCHAR(30)'],
  ['neighborhood', 'VARCHAR(100)'],
  ['complement', 'VARCHAR(100)'],
  ['zip_code', 'VARCHAR(15)'],
  ['phone', 'VARCHAR(30)'],
  ['email', 'VARCHAR(255)'],
  ['crt', 'VARCHAR(5) DEFAULT \'1\''],
  ['certificate_type', 'VARCHAR(20) DEFAULT \'a1\''],
  ['certificate_expires_at', 'DATE NULL'],
  ['api_secret', 'VARCHAR(255)'],
  ['api_token', 'TEXT'],
  ['webhook_url', 'VARCHAR(500)'],
  ['nfe_enabled', 'BOOLEAN DEFAULT TRUE'],
  ['nfce_enabled', 'BOOLEAN DEFAULT TRUE'],
  ['nfe_default_cfop', 'VARCHAR(10) DEFAULT \'5102\''],
  ['nfce_default_cfop', 'VARCHAR(10) DEFAULT \'5102\''],
  ['default_ncm', 'VARCHAR(20)'],
  ['default_cest', 'VARCHAR(20)'],
  ['default_csosn', 'VARCHAR(10) DEFAULT \'102\''],
  ['default_cst_icms', 'VARCHAR(10)'],
  ['default_cst_pis', 'VARCHAR(10) DEFAULT \'07\''],
  ['default_cst_cofins', 'VARCHAR(10) DEFAULT \'07\''],
  ['icms_origin', 'VARCHAR(5) DEFAULT \'0\''],
  ['csc_id', 'VARCHAR(20)'],
  ['csc_token', 'VARCHAR(255)'],
  ['contingency_enabled', 'BOOLEAN DEFAULT FALSE'],
  ['contingency_reason', 'TEXT'],
  ['last_validation_at', 'TIMESTAMP NULL']
];

const invoiceColumns = [
  ['pdf_url', 'VARCHAR(500)'],
  ['danfe_url', 'VARCHAR(500)'],
  ['xml_path', 'VARCHAR(500)'],
  ['environment', 'VARCHAR(20)'],
  ['api_provider', 'VARCHAR(100)']
];

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1 ? 1 : 0;
}

function onlyDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}

async function addColumnIfMissing(table, column, definition) {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (err) {
    const msg = String(err.message || '').toLowerCase();
    if (!msg.includes('duplicate') && !msg.includes('exists')) {
      console.warn(`Aviso ao ajustar coluna ${table}.${column}:`, err.message);
    }
  }
}

async function ensureFiscalInfrastructure() {
  if (fiscalReady) return;

  await db.prepare(`CREATE TABLE IF NOT EXISTS fiscal_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    certificate_path VARCHAR(500),
    certificate_password VARCHAR(255),
    environment VARCHAR(20) DEFAULT 'homologation',
    nfe_series VARCHAR(10) DEFAULT '1',
    nfce_series VARCHAR(10) DEFAULT '1',
    nfe_number INT DEFAULT 1,
    nfce_number INT DEFAULT 1,
    tax_regime VARCHAR(20) DEFAULT 'simples',
    cnpj VARCHAR(18),
    state_registration VARCHAR(20),
    api_provider VARCHAR(100),
    api_key VARCHAR(255),
    api_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_fiscal_company (company_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    branch_id INT,
    order_id INT,
    customer_id INT,
    invoice_type VARCHAR(10) NOT NULL,
    series VARCHAR(10) DEFAULT '1',
    number INT,
    access_key VARCHAR(100),
    authorization_protocol VARCHAR(100),
    xml_content LONGTEXT,
    status VARCHAR(20) DEFAULT 'pending',
    total_value DECIMAL(10,2),
    issued_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,
    error_message TEXT,
    cfop VARCHAR(10),
    icms_base DECIMAL(10,2),
    icms_value DECIMAL(10,2),
    pis_value DECIMAL(10,2),
    cofins_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).run();

  for (const [column, definition] of fiscalColumns) {
    await addColumnIfMissing('fiscal_settings', column, definition);
  }
  for (const [column, definition] of invoiceColumns) {
    await addColumnIfMissing('invoices', column, definition);
  }

  fiscalReady = true;
}

async function getSettings(companyId) {
  await ensureFiscalInfrastructure();
  let settings = await db.prepare(`SELECT * FROM fiscal_settings WHERE company_id = ?`).get(companyId);
  if (!settings) {
    const company = await db.prepare(`SELECT * FROM companies WHERE id = ?`).get(companyId);
    await db.prepare(`INSERT INTO fiscal_settings (
      company_id, legal_name, trade_name, cnpj, state_registration, municipal_registration,
      sefaz_state, city, address, zip_code, phone, email, environment, tax_regime,
      nfe_series, nfce_series, nfe_number, nfce_number, nfe_enabled, nfce_enabled
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      companyId,
      company?.name || null,
      company?.trade_name || company?.name || null,
      company?.cnpj || null,
      company?.state_registration || null,
      company?.municipal_registration || null,
      company?.state || null,
      company?.city || null,
      company?.address || null,
      company?.zip_code || null,
      company?.phone || null,
      company?.email || null,
      'homologation',
      company?.tax_regime || 'simples',
      '1', '1', 1, 1, 1, 1
    );
    settings = await db.prepare(`SELECT * FROM fiscal_settings WHERE company_id = ?`).get(companyId);
  }
  return settings;
}

function validateSettings(settings, mode = 'save') {
  const missing = [];
  const warnings = [];

  if (!settings.cnpj || onlyDigits(settings.cnpj).length !== 14) missing.push('CNPJ válido da empresa');
  if (!settings.legal_name) missing.push('Razão social');
  if (!settings.sefaz_state) missing.push('UF da empresa');
  if (!settings.city) missing.push('Cidade da empresa');
  if (!settings.address) missing.push('Endereço da empresa');
  if (!settings.zip_code) missing.push('CEP da empresa');
  if (!settings.tax_regime) missing.push('Regime tributário');
  if (!settings.nfe_series) missing.push('Série da NF-e');
  if (!settings.nfce_series) missing.push('Série da NFC-e');
  if (!settings.nfe_number) missing.push('Próximo número da NF-e');
  if (!settings.nfce_number) missing.push('Próximo número da NFC-e');
  if (!settings.api_provider) warnings.push('Provedor/API fiscal não configurado');
  if (!settings.api_url) warnings.push('URL da API fiscal não configurada');
  if (!settings.api_key && !settings.api_token) warnings.push('Chave ou token da API fiscal não configurado');
  if (!settings.certificate_path) warnings.push('Certificado digital A1/caminho do certificado não informado');
  if (!settings.certificate_password) warnings.push('Senha do certificado não informada');
  if (!settings.nfe_default_cfop) warnings.push('CFOP padrão da NF-e não informado');
  if (!settings.nfce_default_cfop) warnings.push('CFOP padrão da NFC-e não informado');
  if (!settings.default_ncm) warnings.push('NCM padrão não informado');
  if (settings.nfce_enabled && (!settings.csc_id || !settings.csc_token)) warnings.push('CSC/Token da NFC-e não configurado');

  return {
    valid: missing.length === 0,
    emission_ready: missing.length === 0 && (mode === 'save' || warnings.length === 0),
    missing,
    warnings
  };
}

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await getSettings(req.user.company_id);
    const company = await db.prepare(`SELECT id, name, trade_name, cnpj, state_registration, municipal_registration, tax_regime, phone, email, address, city, state, zip_code FROM companies WHERE id = ?`).get(req.user.company_id);
    res.json({ ...settings, company, validation: validateSettings(settings) });
  } catch (err) {
    console.error('Erro ao buscar configurações fiscais:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações fiscais' });
  }
});

router.get('/settings/validate', authenticateToken, async (req, res) => {
  try {
    const settings = await getSettings(req.user.company_id);
    await db.prepare(`UPDATE fiscal_settings SET last_validation_at = CURRENT_TIMESTAMP WHERE company_id = ?`).run(req.user.company_id);
    res.json(validateSettings(settings, 'validate'));
  } catch (err) {
    console.error('Erro ao validar configuração fiscal:', err);
    res.status(500).json({ error: 'Erro ao validar configuração fiscal' });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    await getSettings(req.user.company_id);
    const d = req.body;

    await db.prepare(`UPDATE fiscal_settings SET
      legal_name=?, trade_name=?, cnpj=?, state_registration=?, municipal_registration=?, sefaz_state=?, city=?, city_ibge_code=?, address=?, number=?, neighborhood=?, complement=?, zip_code=?, phone=?, email=?,
      environment=?, tax_regime=?, crt=?, certificate_type=?, certificate_path=?, certificate_password=?, certificate_expires_at=?,
      nfe_enabled=?, nfce_enabled=?, nfe_series=?, nfce_series=?, nfe_number=?, nfce_number=?, nfe_default_cfop=?, nfce_default_cfop=?,
      default_ncm=?, default_cest=?, default_csosn=?, default_cst_icms=?, default_cst_pis=?, default_cst_cofins=?, icms_origin=?,
      csc_id=?, csc_token=?, api_provider=?, api_key=?, api_secret=?, api_token=?, api_url=?, webhook_url=?,
      contingency_enabled=?, contingency_reason=?, updated_at=CURRENT_TIMESTAMP
      WHERE company_id=?`).run(
      d.legal_name || null,
      d.trade_name || null,
      d.cnpj || null,
      d.state_registration || null,
      d.municipal_registration || null,
      d.sefaz_state || null,
      d.city || null,
      d.city_ibge_code || null,
      d.address || null,
      d.number || null,
      d.neighborhood || null,
      d.complement || null,
      d.zip_code || null,
      d.phone || null,
      d.email || null,
      d.environment || 'homologation',
      d.tax_regime || 'simples',
      d.crt || '1',
      d.certificate_type || 'a1',
      d.certificate_path || null,
      d.certificate_password || null,
      d.certificate_expires_at || null,
      normalizeBoolean(d.nfe_enabled),
      normalizeBoolean(d.nfce_enabled),
      d.nfe_series || '1',
      d.nfce_series || '1',
      Number(d.nfe_number || 1),
      Number(d.nfce_number || 1),
      d.nfe_default_cfop || '5102',
      d.nfce_default_cfop || '5102',
      d.default_ncm || null,
      d.default_cest || null,
      d.default_csosn || '102',
      d.default_cst_icms || null,
      d.default_cst_pis || '07',
      d.default_cst_cofins || '07',
      d.icms_origin || '0',
      d.csc_id || null,
      d.csc_token || null,
      d.api_provider || null,
      d.api_key || null,
      d.api_secret || null,
      d.api_token || null,
      d.api_url || null,
      d.webhook_url || null,
      normalizeBoolean(d.contingency_enabled),
      d.contingency_reason || null,
      req.user.company_id
    );

    if (d.sync_company === true || d.sync_company === 'true' || d.sync_company === '1') {
      await db.prepare(`UPDATE companies SET name=?, trade_name=?, cnpj=?, state_registration=?, municipal_registration=?, tax_regime=?, phone=?, email=?, address=?, city=?, state=?, zip_code=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
        d.legal_name || null,
        d.trade_name || null,
        d.cnpj || null,
        d.state_registration || null,
        d.municipal_registration || null,
        d.tax_regime || 'simples',
        d.phone || null,
        d.email || null,
        d.address || null,
        d.city || null,
        d.sefaz_state || null,
        d.zip_code || null,
        req.user.company_id
      );
    }

    const settings = await getSettings(req.user.company_id);
    res.json({ message: 'Configurações fiscais atualizadas', settings, validation: validateSettings(settings) });
  } catch (err) {
    console.error('Erro ao atualizar configurações fiscais:', err);
    res.status(500).json({ error: 'Erro ao atualizar configurações fiscais' });
  }
});

router.get('/orders/eligible', authenticateToken, async (req, res) => {
  try {
    await ensureFiscalInfrastructure();
    const rows = await db.prepare(`
      SELECT so.id, so.order_number, so.total, so.status, so.origin, so.created_at, c.name as customer_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.company_id = ?
        AND so.id NOT IN (SELECT COALESCE(order_id, 0) FROM invoices WHERE company_id = ? AND status <> 'cancelled')
      ORDER BY so.created_at DESC
      LIMIT 100
    `).all(req.user.company_id, req.user.company_id);
    res.json(rows || []);
  } catch (err) {
    console.error('Erro ao listar pedidos elegíveis:', err);
    res.status(500).json({ error: 'Erro ao listar pedidos para nota fiscal' });
  }
});

router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    await ensureFiscalInfrastructure();
    const { status, type, page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNumber - 1) * limitNumber;
    let where = 'WHERE i.company_id = ?';
    const params = [req.user.company_id];
    if (status) { where += ' AND i.status = ?'; params.push(status); }
    if (type) { where += ' AND i.invoice_type = ?'; params.push(type); }

    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM invoices i ${where}`).get(...params);
    const invoices = await db.prepare(`
      SELECT i.*, c.name as customer_name, so.order_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN sales_orders so ON i.order_id = so.id
      ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limitNumber, offset);
    res.json({ invoices: invoices || [], total: totalRow?.count || 0, page: pageNumber, limit: limitNumber });
  } catch (err) {
    console.error('Erro ao listar notas fiscais:', err);
    res.status(500).json({ error: 'Erro ao listar notas fiscais' });
  }
});

router.post('/issue', authenticateToken, async (req, res) => {
  try {
    const { order_id, invoice_type = 'nfce' } = req.body;
    const order = await db.prepare(`SELECT * FROM sales_orders WHERE id = ? AND company_id = ?`).get(order_id, req.user.company_id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const settings = await getSettings(req.user.company_id);
    const validation = validateSettings(settings, 'validate');
    if (!validation.valid) {
      return res.status(400).json({ error: 'Configure os dados fiscais obrigatórios antes de emitir', validation });
    }

    const type = invoice_type === 'nfe' ? 'nfe' : 'nfce';
    if (type === 'nfe' && !settings.nfe_enabled) return res.status(400).json({ error: 'NF-e está desativada nas configurações fiscais' });
    if (type === 'nfce' && !settings.nfce_enabled) return res.status(400).json({ error: 'NFC-e está desativada nas configurações fiscais' });

    const numberField = type === 'nfce' ? 'nfce_number' : 'nfe_number';
    const series = type === 'nfce' ? settings.nfce_series : settings.nfe_series;
    const invoiceNumber = settings[numberField] || 1;
    const cfop = type === 'nfce' ? settings.nfce_default_cfop : settings.nfe_default_cfop;

    const result = await db.prepare(`INSERT INTO invoices (
      company_id, branch_id, order_id, customer_id, invoice_type, series, number, status, total_value,
      issued_at, cfop, environment, api_provider, icms_base
    ) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?)`).run(
      req.user.company_id,
      req.user.branch_id || null,
      order_id,
      order.customer_id,
      type,
      series,
      invoiceNumber,
      settings.api_provider ? 'processing' : 'draft',
      order.total,
      cfop || null,
      settings.environment || 'homologation',
      settings.api_provider || null,
      order.total || 0
    );

    await db.prepare(`UPDATE fiscal_settings SET ${numberField} = ${numberField} + 1 WHERE company_id = ?`).run(req.user.company_id);

    const invoiceId = result.insertId || result.lastInsertRowid;
    if (settings.api_provider) {
      await db.prepare(`UPDATE invoices SET status = 'configured', access_key = ?, authorization_protocol = ? WHERE id = ?`).run(
        `CONFIG-${Date.now()}`,
        `PENDENTE-API-${Date.now()}`,
        invoiceId
      );
    }

    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'issue_invoice', 'invoice', invoiceId);

    res.status(201).json({ id: invoiceId, number: invoiceNumber, type, status: settings.api_provider ? 'configured' : 'draft', message: 'Nota fiscal preparada para emissão' });
  } catch (err) {
    console.error('Erro ao emitir nota fiscal:', err);
    res.status(500).json({ error: 'Erro ao emitir nota fiscal' });
  }
});

router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    await ensureFiscalInfrastructure();
    const { reason } = req.body;
    await db.prepare(`UPDATE invoices SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ? WHERE id = ? AND company_id = ?`).run(reason || 'Cancelamento solicitado', req.params.id, req.user.company_id);
    await db.prepare(`INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`).run(req.user.company_id, req.user.id, 'cancel_invoice', 'invoice', req.params.id);
    res.json({ message: 'Nota fiscal cancelada' });
  } catch (err) {
    console.error('Erro ao cancelar nota:', err);
    res.status(500).json({ error: 'Erro ao cancelar nota' });
  }
});

module.exports = router;
