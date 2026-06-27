-- ===========================================
-- MODACONTROL PRO - SEED SEGURO HOSTINGER
-- Use quando o seed.sql original acusar dados duplicados
-- Pode ser executado mais de uma vez sem parar no CNPJ duplicado
-- ===========================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO companies (name, trade_name, cnpj, phone, email, primary_color, secondary_color, address, city, state, zip_code, whatsapp, instagram, facebook)
SELECT 'ModaControl Pro', 'ModaControl Pro', '00.000.000/0001-00', '(11) 99999-9999', 'contato@modacontrol.com.br', '#6366f1', '#8b5cf6', 'Rua das Flores, 123', 'São Paulo', 'SP', '01000-000', '5511999999999', '@modacontrol', 'modacontrol'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE cnpj = '00.000.000/0001-00');

SET @company_id := (SELECT id FROM companies WHERE cnpj = '00.000.000/0001-00' ORDER BY id LIMIT 1);

INSERT INTO branches (company_id, name, code, is_main)
SELECT @company_id, 'Loja Principal', '001', 1
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE company_id = @company_id AND code = '001');

INSERT INTO roles (company_id, name, permissions)
SELECT @company_id, 'Super Administrador', '{"all": true}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE company_id = @company_id AND name = 'Super Administrador');
INSERT INTO roles (company_id, name, permissions)
SELECT @company_id, 'Gerente', '{"products": true, "sales": true, "customers": true, "stock": true, "financial": true, "reports": true}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE company_id = @company_id AND name = 'Gerente');
INSERT INTO roles (company_id, name, permissions)
SELECT @company_id, 'Vendedor', '{"products": "view", "sales": true, "customers": true}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE company_id = @company_id AND name = 'Vendedor');
INSERT INTO roles (company_id, name, permissions)
SELECT @company_id, 'Operador de Caixa', '{"pdv": true, "customers": "view"}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE company_id = @company_id AND name = 'Operador de Caixa');

SET @branch_id := (SELECT id FROM branches WHERE company_id = @company_id AND code = '001' ORDER BY id LIMIT 1);
SET @admin_role_id := (SELECT id FROM roles WHERE company_id = @company_id AND name = 'Super Administrador' ORDER BY id LIMIT 1);

INSERT INTO users (company_id, branch_id, role_id, name, email, password, status)
SELECT @company_id, @branch_id, @admin_role_id, 'Administrador', 'admin@modacontrol.com.br', '$2a$10$WYpYn.EhG5CkBZkn2P8PPOOrQtAI6xYJoT4W4odKhSQAd2z5RFBx.', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE company_id = @company_id AND email = 'admin@modacontrol.com.br');

INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Vestidos', 'vestidos', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'vestidos');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Blusas', 'blusas', 2 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'blusas');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Calças', 'calcas', 3 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'calcas');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Saias', 'saias', 4 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'saias');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Shorts', 'shorts', 5 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'shorts');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Jaquetas', 'jaquetas', 6 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'jaquetas');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Camisetas', 'camisetas', 7 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'camisetas');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Acessórios', 'acessorios', 8 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'acessorios');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Moda Íntima', 'moda-intima', 9 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'moda-intima');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Moda Festa', 'moda-festa', 10 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'moda-festa');
INSERT INTO categories (company_id, name, slug, sort_order)
SELECT @company_id, 'Plus Size', 'plus-size', 11 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = @company_id AND slug = 'plus-size');

INSERT INTO brands (company_id, name, slug)
SELECT @company_id, 'Marca Própria', 'marca-propria' WHERE NOT EXISTS (SELECT 1 FROM brands WHERE company_id = @company_id AND slug = 'marca-propria');
INSERT INTO brands (company_id, name, slug)
SELECT @company_id, 'Importados', 'importados' WHERE NOT EXISTS (SELECT 1 FROM brands WHERE company_id = @company_id AND slug = 'importados');
INSERT INTO brands (company_id, name, slug)
SELECT @company_id, 'Nacional', 'nacional' WHERE NOT EXISTS (SELECT 1 FROM brands WHERE company_id = @company_id AND slug = 'nacional');

INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Aluguel', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Aluguel' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Energia', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Energia' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Internet', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Internet' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Salários', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Salários' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Fornecedores', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Fornecedores' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Impostos', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Impostos' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Marketing', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Marketing' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Embalagens', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Embalagens' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Frete', 'expense' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Frete' AND type='expense');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Vendas', 'revenue' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Vendas' AND type='revenue');
INSERT INTO financial_categories (company_id, name, type)
SELECT @company_id, 'Serviços', 'revenue' WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE company_id=@company_id AND name='Serviços' AND type='revenue');

INSERT INTO shipping_methods (company_id, name, type, price, min_days, max_days)
SELECT @company_id, 'Retirada na Loja', 'pickup', 0.00, 0, 0 WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE company_id=@company_id AND type='pickup');
INSERT INTO shipping_methods (company_id, name, type, price, min_days, max_days)
SELECT @company_id, 'Entrega Local', 'local', 15.00, 1, 3 WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE company_id=@company_id AND type='local');
INSERT INTO shipping_methods (company_id, name, type, price, min_days, max_days)
SELECT @company_id, 'Correios PAC', 'correios_pac', 25.00, 5, 10 WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE company_id=@company_id AND type='correios_pac');
INSERT INTO shipping_methods (company_id, name, type, price, min_days, max_days)
SELECT @company_id, 'Correios SEDEX', 'correios_sedex', 40.00, 2, 5 WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE company_id=@company_id AND type='correios_sedex');

INSERT INTO plans (name, slug, price, description, features, max_users, max_products, modules)
SELECT 'Básico', 'basic', 99.90, 'Para pequenas lojas', '["Loja online","Produtos ilimitados","Pedidos","Clientes","Estoque básico"]', 2, 500, '["store","products","orders","customers","stock"]'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug='basic');
INSERT INTO plans (name, slug, price, description, features, max_users, max_products, modules)
SELECT 'Profissional', 'professional', 199.90, 'Para lojas em crescimento', '["Tudo do Básico","PDV","Estoque por grade","Financeiro","Relatórios","Cupons","WhatsApp"]', 5, 2000, '["store","products","orders","customers","stock","pdv","financial","reports","coupons","whatsapp"]'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug='professional');
INSERT INTO plans (name, slug, price, description, features, max_users, max_products, modules)
SELECT 'Premium', 'premium', 349.90, 'Para lojas que querem crescer', '["Tudo do Profissional","NF-e/NFC-e","Multiusuário","Multifilial","API fiscal","Cashback","BI avançado"]', 20, -1, '["store","products","orders","customers","stock","pdv","financial","reports","coupons","whatsapp","fiscal","multiuser","multibranch","cashback","bi"]'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug='premium');

INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'store_name', 'ModaControl Pro' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='store_name');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'store_description', 'Sua loja de roupas online' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='store_description');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'whatsapp_number', '5511999999999' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='whatsapp_number');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'currency', 'BRL' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='currency');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'currency_symbol', 'R$' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='currency_symbol');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'allow_guest_checkout', 'true' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='allow_guest_checkout');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'require_login', 'false' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='require_login');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'free_shipping_min', '299.00' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='free_shipping_min');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'installments_max', '12' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='installments_max');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'installments_min', '50.00' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='installments_min');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'cashback_rate', '5' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='cashback_rate');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'loyalty_points_rate', '1' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='loyalty_points_rate');
INSERT INTO settings (company_id, setting_key, setting_value)
SELECT @company_id, 'commission_default', '5' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE company_id=@company_id AND setting_key='commission_default');

INSERT INTO whatsapp_templates (company_id, name, type, message)
SELECT @company_id, 'Pedido Recebido', 'order_received', 'Olá {customer_name}! Recebemos seu pedido #{order_number}. Total: R$ {total}. Em breve enviaremos a confirmação.' WHERE NOT EXISTS (SELECT 1 FROM whatsapp_templates WHERE company_id=@company_id AND type='order_received');
INSERT INTO whatsapp_templates (company_id, name, type, message)
SELECT @company_id, 'Pagamento Aprovado', 'payment_approved', 'Olá {customer_name}! Seu pagamento do pedido #{order_number} foi aprovado. Estamos preparando seu pedido.' WHERE NOT EXISTS (SELECT 1 FROM whatsapp_templates WHERE company_id=@company_id AND type='payment_approved');
INSERT INTO whatsapp_templates (company_id, name, type, message)
SELECT @company_id, 'Pedido Enviado', 'order_shipped', 'Olá {customer_name}! Seu pedido #{order_number} foi enviado. Código de rastreio: {tracking_code}.' WHERE NOT EXISTS (SELECT 1 FROM whatsapp_templates WHERE company_id=@company_id AND type='order_shipped');

INSERT INTO email_templates (company_id, name, subject, body, type)
SELECT @company_id, 'Pedido Recebido', 'Pedido #{order_number} recebido com sucesso!', '<h1>Obrigado pelo seu pedido!</h1><p>Olá {customer_name},</p><p>Seu pedido #{order_number} foi recebido com sucesso.</p><p>Total: R$ {total}</p>', 'order_received' WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE company_id=@company_id AND type='order_received');
INSERT INTO email_templates (company_id, name, subject, body, type)
SELECT @company_id, 'Pagamento Aprovado', 'Pagamento aprovado - Pedido #{order_number}', '<h1>Pagamento aprovado!</h1><p>Olá {customer_name},</p><p>O pagamento do pedido #{order_number} foi confirmado.</p>', 'payment_approved' WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE company_id=@company_id AND type='payment_approved');
INSERT INTO email_templates (company_id, name, subject, body, type)
SELECT @company_id, 'Recuperação de Senha', 'Recuperação de senha', '<h1>Recuperação de senha</h1><p>Clique no link para redefinir sua senha: {reset_link}</p>', 'password_reset' WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE company_id=@company_id AND type='password_reset');

INSERT INTO suppliers (company_id, name, trade_name, cnpj, phone, email, contact_person, city, state)
SELECT @company_id, 'Fornecedor Exemplo LTDA', 'Fornecedor Exemplo', '12.345.678/0001-90', '(11) 3333-4444', 'contato@fornecedor.com.br', 'João Silva', 'São Paulo', 'SP'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE company_id=@company_id AND cnpj='12.345.678/0001-90');

INSERT INTO sellers (company_id, name, cpf, phone, email, commission_rate, monthly_goal)
SELECT @company_id, 'Vendedor Exemplo', '123.456.789-00', '(11) 98888-7777', 'vendedor@loja.com.br', 5.00, 10000.00
WHERE NOT EXISTS (SELECT 1 FROM sellers WHERE company_id=@company_id AND cpf='123.456.789-00');

SET @brand_id := (SELECT id FROM brands WHERE company_id=@company_id AND slug='marca-propria' ORDER BY id LIMIT 1);
SET @brand_import_id := (SELECT id FROM brands WHERE company_id=@company_id AND slug='importados' ORDER BY id LIMIT 1);
SET @cat_vestidos := (SELECT id FROM categories WHERE company_id=@company_id AND slug='vestidos' ORDER BY id LIMIT 1);
SET @cat_blusas := (SELECT id FROM categories WHERE company_id=@company_id AND slug='blusas' ORDER BY id LIMIT 1);
SET @cat_calcas := (SELECT id FROM categories WHERE company_id=@company_id AND slug='calcas' ORDER BY id LIMIT 1);
SET @cat_camisetas := (SELECT id FROM categories WHERE company_id=@company_id AND slug='camisetas' ORDER BY id LIMIT 1);
SET @cat_acessorios := (SELECT id FROM categories WHERE company_id=@company_id AND slug='acessorios' ORDER BY id LIMIT 1);

INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status, is_featured, is_new)
SELECT @company_id, @cat_vestidos, @brand_id, 'Vestido Floral Verão', 'vestido-floral-verao', 'VEST-001', 149.90, 60.00, 'active', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE company_id=@company_id AND sku='VEST-001');
INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status, is_featured, is_new)
SELECT @company_id, @cat_blusas, @brand_id, 'Blusa Cropped Básica', 'blusa-cropped-basica', 'BLUS-001', 59.90, 25.00, 'active', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE company_id=@company_id AND sku='BLUS-001');
INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status, is_featured, is_new)
SELECT @company_id, @cat_calcas, @brand_id, 'Calça Jeans Skinny', 'calca-jeans-skinny', 'CALC-001', 129.90, 55.00, 'active', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM products WHERE company_id=@company_id AND sku='CALC-001');
INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status, is_featured, is_new)
SELECT @company_id, @cat_camisetas, @brand_id, 'Camiseta Algodão Premium', 'camiseta-algodao-premium', 'CAMI-001', 79.90, 30.00, 'active', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE company_id=@company_id AND sku='CAMI-001');
INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status, is_featured, is_new)
SELECT @company_id, @cat_acessorios, @brand_import_id, 'Bolsa Transversal Couro', 'bolsa-transversal-couro', 'BOLS-001', 199.90, 80.00, 'active', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM products WHERE company_id=@company_id AND sku='BOLS-001');

INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='VEST-001' ORDER BY id LIMIT 1), @company_id, 'Floral Azul', 'P', 'VEST-001-AZ-P', 149.90, 5 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='VEST-001-AZ-P');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='VEST-001' ORDER BY id LIMIT 1), @company_id, 'Floral Azul', 'M', 'VEST-001-AZ-M', 149.90, 8 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='VEST-001-AZ-M');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='VEST-001' ORDER BY id LIMIT 1), @company_id, 'Floral Azul', 'G', 'VEST-001-AZ-G', 149.90, 6 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='VEST-001-AZ-G');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='BLUS-001' ORDER BY id LIMIT 1), @company_id, 'Preto', 'P', 'BLUS-001-PR-P', 59.90, 10 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='BLUS-001-PR-P');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='BLUS-001' ORDER BY id LIMIT 1), @company_id, 'Preto', 'M', 'BLUS-001-PR-M', 59.90, 12 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='BLUS-001-PR-M');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='CALC-001' ORDER BY id LIMIT 1), @company_id, 'Azul Claro', '38', 'CALC-001-CL-38', 129.90, 5 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='CALC-001-CL-38');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='CAMI-001' ORDER BY id LIMIT 1), @company_id, 'Branco', 'P', 'CAMI-001-BR-P', 79.90, 15 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='CAMI-001-BR-P');
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
SELECT (SELECT id FROM products WHERE company_id=@company_id AND sku='BOLS-001' ORDER BY id LIMIT 1), @company_id, 'Preto', 'Único', 'BOLS-001-PR-U', 199.90, 3 WHERE NOT EXISTS (SELECT 1 FROM product_variants WHERE company_id=@company_id AND sku='BOLS-001-PR-U');

INSERT INTO customers (company_id, name, email, phone, cpf_cnpj, city, state)
SELECT @company_id, 'Maria Silva', 'maria@email.com', '(11) 97777-6666', '123.456.789-00', 'São Paulo', 'SP'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE company_id=@company_id AND email='maria@email.com');

INSERT INTO coupons (company_id, code, type, value, min_purchase, start_date, end_date, max_uses, status)
SELECT @company_id, 'BEMVINDO10', 'percentage', 10.00, 50.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 100, 'active'
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE company_id=@company_id AND code='BEMVINDO10');

SET FOREIGN_KEY_CHECKS = 1;
