const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return pool;
}

// Wrapper to provide same interface as SQLite code
const db = {
  prepare(sql) {
    return {
      async run(...params) {
        const p = getPool();
        const [result] = await p.execute(sql, params.length > 0 ? params : undefined);
        return { lastInsertRowid: result.insertId, changes: result.affectedRows };
      },
      async get(...params) {
        const p = getPool();
        const [rows] = await p.execute(sql, params.length > 0 ? params : undefined);
        return rows[0] || null;
      },
      async all(...params) {
        const p = getPool();
        const [rows] = await p.execute(sql, params.length > 0 ? params : undefined);
        return rows;
      }
    };
  },
  
  // Direct exec for multi-statement
  async exec(sql) {
    const p = getPool();
    const conn = await p.getConnection();
    try {
      await conn.query(sql);
    } finally {
      conn.release();
    }
  }
};

// Test connection
async function testConnection() {
  try {
    const p = getPool();
    await p.execute('SELECT 1');
    console.log('✅ Conexão com MySQL estabelecida com sucesso');
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar com MySQL:', err.message);
    return false;
  }
}

// Initialize database with default data
async function initDatabase() {
  const p = getPool();
  
  // Check if company exists
  const [companies] = await p.execute('SELECT COUNT(*) as count FROM companies');
  
  if (companies[0].count === 0) {
    console.log('📦 Populando banco de dados...');
    
    // Create default company
    await p.execute(`INSERT INTO companies (name, trade_name, cnpj, phone, email, primary_color, secondary_color) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['ModaControl Pro', 'ModaControl Pro', '00.000.000/0001-00', '(11) 99999-9999', 'contato@modacontrol.com.br', '#6366f1', '#8b5cf6']);
    
    // Create default branch
    await p.execute(`INSERT INTO branches (company_id, name, code, is_main) VALUES (1, 'Loja Principal', '001', 1)`);
    
    // Create default roles
    const roles = [
      ['Super Administrador', JSON.stringify({ all: true })],
      ['Gerente', JSON.stringify({ products: true, sales: true, customers: true, stock: true, financial: true, reports: true })],
      ['Vendedor', JSON.stringify({ products: 'view', sales: true, customers: true })],
      ['Operador de Caixa', JSON.stringify({ pdv: true, customers: 'view' })]
    ];
    for (const [name, perms] of roles) {
      await p.execute(`INSERT INTO roles (company_id, name, permissions) VALUES (1, ?, ?)`, [name, perms]);
    }
    
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await p.execute(`INSERT INTO users (company_id, branch_id, role_id, name, email, password, status) VALUES (1, 1, 1, 'Administrador', 'admin@modacontrol.com.br', ?, 'active')`, [hashedPassword]);
    
    // Create default categories
    const categories = ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Shorts', 'Jaquetas', 'Camisetas', 'Acessórios', 'Moda Íntima', 'Moda Festa', 'Plus Size'];
    for (const cat of categories) {
      await p.execute(`INSERT INTO categories (company_id, name, slug) VALUES (1, ?, ?)`, [cat, cat.toLowerCase().replace(/\s+/g, '-')]);
    }
    
    // Create default brands
    const brands = ['Marca Própria', 'Importados', 'Nacional'];
    for (const brand of brands) {
      await p.execute(`INSERT INTO brands (company_id, name, slug) VALUES (1, ?, ?)`, [brand, brand.toLowerCase().replace(/\s+/g, '-')]);
    }
    
    // Create default financial categories
    const finCats = [['Aluguel','expense'],['Energia','expense'],['Internet','expense'],['Salários','expense'],['Fornecedores','expense'],['Impostos','expense'],['Marketing','expense'],['Embalagens','expense'],['Frete','expense'],['Vendas','revenue'],['Serviços','revenue']];
    for (const [name, type] of finCats) {
      await p.execute(`INSERT INTO financial_categories (company_id, name, type) VALUES (1, ?, ?)`, [name, type]);
    }
    
    // Create default shipping methods
    const shipping = [['Retirada na Loja','pickup',0,0,0],['Entrega Local','local',15,1,3],['Correios PAC','correios_pac',25,5,10],['Correios SEDEX','correios_sedex',40,2,5]];
    for (const [name, type, price, minD, maxD] of shipping) {
      await p.execute(`INSERT INTO shipping_methods (company_id, name, type, price, min_days, max_days) VALUES (1, ?, ?, ?, ?, ?)`, [name, type, price, minD, maxD]);
    }
    
    // Create SaaS plans
    const plans = [
      ['Básico','basic',99.90,'Para pequenas lojas',JSON.stringify(['Loja online','Produtos ilimitados','Pedidos','Clientes','Estoque básico']),2,500,JSON.stringify(['store','products','orders','customers','stock'])],
      ['Profissional','professional',199.90,'Para lojas em crescimento',JSON.stringify(['Tudo do Básico','PDV','Estoque por grade','Financeiro','Relatórios','Cupons','WhatsApp']),5,2000,JSON.stringify(['store','products','orders','customers','stock','pdv','financial','reports','coupons','whatsapp'])],
      ['Premium','premium',349.90,'Para lojas que querem crescer',JSON.stringify(['Tudo do Profissional','NF-e/NFC-e','Multiusuário','Multifilial','API fiscal','Cashback','BI avançado']),20,-1,JSON.stringify(['store','products','orders','customers','stock','pdv','financial','reports','coupons','whatsapp','fiscal','multiuser','multibranch','cashback','bi'])]
    ];
    for (const pl of plans) {
      await p.execute(`INSERT INTO plans (name, slug, price, description, features, max_users, max_products, modules) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, pl);
    }
    
    // Create default settings
    const settings = [['store_name','ModaControl Pro'],['store_description','Sua loja de roupas online'],['whatsapp_number','5511999999999'],['currency','BRL'],['currency_symbol','R$'],['allow_guest_checkout','true'],['require_login','false'],['free_shipping_min','299.00'],['installments_max','12'],['installments_min','50.00'],['cashback_rate','5'],['loyalty_points_rate','1'],['commission_default','5']];
    for (const [key, value] of settings) {
      await p.execute(`INSERT INTO settings (company_id, setting_key, setting_value) VALUES (1, ?, ?)`, [key, value]);
    }
    
    // Create default WhatsApp templates
    const wpTemplates = [
      ['Pedido Recebido','order_received','Olá {customer_name}! Recebemos seu pedido #{order_number}. Total: R$ {total}.'],
      ['Pagamento Aprovado','payment_approved','Olá {customer_name}! Seu pagamento do pedido #{order_number} foi aprovado.'],
      ['Pedido Enviado','order_shipped','Olá {customer_name}! Seu pedido #{order_number} foi enviado. Código: {tracking_code}.'],
      ['Aniversário','birthday','Olá {customer_name}! Feliz aniversário! Temos um cupom especial para você.'],
      ['Carrinho Abandonado','cart_abandoned','Olá {customer_name}! Você deixou itens no carrinho. Finalize sua compra com 5% de desconto.']
    ];
    for (const [name, type, msg] of wpTemplates) {
      await p.execute(`INSERT INTO whatsapp_templates (company_id, name, type, message) VALUES (1, ?, ?, ?)`, [name, type, msg]);
    }
    
    // Create default email templates
    const emailTmpls = [
      ['Pedido Recebido','Pedido #{order_number} recebido!','<h1>Obrigado!</h1><p>Seu pedido #{order_number} foi recebido.</p>','order_received'],
      ['Pagamento Aprovado','Pagamento aprovado - Pedido #{order_number}','<h1>Pagamento confirmado!</h1>','payment_approved'],
      ['Recuperação de Senha','Recuperação de senha','<p>Clique no link: {reset_link}</p>','password_reset']
    ];
    for (const [name, subj, body, type] of emailTmpls) {
      await p.execute(`INSERT INTO email_templates (company_id, name, subject, body, type) VALUES (1, ?, ?, ?, ?)`, [name, subj, body, type]);
    }
    
    console.log('✅ Banco de dados populado com sucesso!');
  }
}

module.exports = { db, getPool, testConnection, initDatabase };
