-- ===========================================
-- MODACONTROL PRO - SEED SQL (Dados Iniciais)
-- ===========================================
-- Execute após schema.sql para popular com dados padrão

SET NAMES utf8mb4;

-- ===========================================
-- EMPRESA PADRÃO
-- ===========================================
INSERT INTO companies (name, trade_name, cnpj, phone, email, primary_color, secondary_color, address, city, state, zip_code, whatsapp, instagram, facebook)
VALUES ('ModaControl Pro', 'ModaControl Pro', '00.000.000/0001-00', '(11) 99999-9999', 'contato@modacontrol.com.br', '#6366f1', '#8b5cf6', 'Rua das Flores, 123', 'São Paulo', 'SP', '01000-000', '5511999999999', '@modacontrol', 'modacontrol');

-- ===========================================
-- FILIAL PRINCIPAL
-- ===========================================
INSERT INTO branches (company_id, name, code, is_main)
VALUES (1, 'Loja Principal', '001', 1);

-- ===========================================
-- PERFIS DE ACESSO
-- ===========================================
INSERT INTO roles (company_id, name, permissions) VALUES
(1, 'Super Administrador', '{"all": true}'),
(1, 'Gerente', '{"products": true, "sales": true, "customers": true, "stock": true, "financial": true, "reports": true}'),
(1, 'Vendedor', '{"products": "view", "sales": true, "customers": true}'),
(1, 'Operador de Caixa', '{"pdv": true, "customers": "view"}');

-- ===========================================
-- USUÁRIO ADMINISTRADOR PADRÃO
-- ===========================================
-- Senha: admin123
INSERT INTO users (company_id, branch_id, role_id, name, email, password, status)
VALUES (1, 1, 1, 'Administrador', 'admin@modacontrol.com.br', '$2a$10$WYpYn.EhG5CkBZkn2P8PPOOrQtAI6xYJoT4W4odKhSQAd2z5RFBx.', 'active');

-- ===========================================
-- CATEGORIAS DE PRODUTOS
-- ===========================================
INSERT INTO categories (company_id, name, slug, sort_order) VALUES
(1, 'Vestidos', 'vestidos', 1),
(1, 'Blusas', 'blusas', 2),
(1, 'Calças', 'calcas', 3),
(1, 'Saias', 'saias', 4),
(1, 'Shorts', 'shorts', 5),
(1, 'Jaquetas', 'jaquetas', 6),
(1, 'Camisetas', 'camisetas', 7),
(1, 'Acessórios', 'acessorios', 8),
(1, 'Moda Íntima', 'moda-intima', 9),
(1, 'Moda Festa', 'moda-festa', 10),
(1, 'Plus Size', 'plus-size', 11);

-- ===========================================
-- MARCAS
-- ===========================================
INSERT INTO brands (company_id, name, slug) VALUES
(1, 'Marca Própria', 'marca-propria'),
(1, 'Importados', 'importados'),
(1, 'Nacional', 'nacional');

-- ===========================================
-- CATEGORIAS FINANCEIRAS
-- ===========================================
INSERT INTO financial_categories (company_id, name, type) VALUES
(1, 'Aluguel', 'expense'),
(1, 'Energia', 'expense'),
(1, 'Internet', 'expense'),
(1, 'Salários', 'expense'),
(1, 'Fornecedores', 'expense'),
(1, 'Impostos', 'expense'),
(1, 'Marketing', 'expense'),
(1, 'Embalagens', 'expense'),
(1, 'Frete', 'expense'),
(1, 'Vendas', 'revenue'),
(1, 'Serviços', 'revenue');

-- ===========================================
-- MÉTODOS DE ENVIO
-- ===========================================
INSERT INTO shipping_methods (company_id, name, type, price, min_days, max_days) VALUES
(1, 'Retirada na Loja', 'pickup', 0.00, 0, 0),
(1, 'Entrega Local', 'local', 15.00, 1, 3),
(1, 'Correios PAC', 'correios_pac', 25.00, 5, 10),
(1, 'Correios SEDEX', 'correios_sedex', 40.00, 2, 5);

-- ===========================================
-- PLANOS SaaS
-- ===========================================
INSERT INTO plans (name, slug, price, description, features, max_users, max_products, modules) VALUES
('Básico', 'basic', 99.90, 'Para pequenas lojas', '["Loja online","Produtos ilimitados","Pedidos","Clientes","Estoque básico"]', 2, 500, '["store","products","orders","customers","stock"]'),
('Profissional', 'professional', 199.90, 'Para lojas em crescimento', '["Tudo do Básico","PDV","Estoque por grade","Financeiro","Relatórios","Cupons","WhatsApp"]', 5, 2000, '["store","products","orders","customers","stock","pdv","financial","reports","coupons","whatsapp"]'),
('Premium', 'premium', 349.90, 'Para lojas que querem crescer', '["Tudo do Profissional","NF-e/NFC-e","Multiusuário","Multifilial","API fiscal","Cashback","BI avançado"]', 20, -1, '["store","products","orders","customers","stock","pdv","financial","reports","coupons","whatsapp","fiscal","multiuser","multibranch","cashback","bi"]');

-- ===========================================
-- CONFIGURAÇÕES DO SISTEMA
-- ===========================================
INSERT INTO settings (company_id, setting_key, setting_value) VALUES
(1, 'store_name', 'ModaControl Pro'),
(1, 'store_description', 'Sua loja de roupas online'),
(1, 'whatsapp_number', '5511999999999'),
(1, 'currency', 'BRL'),
(1, 'currency_symbol', 'R$'),
(1, 'allow_guest_checkout', 'true'),
(1, 'require_login', 'false'),
(1, 'free_shipping_min', '299.00'),
(1, 'installments_max', '12'),
(1, 'installments_min', '50.00'),
(1, 'cashback_rate', '5'),
(1, 'loyalty_points_rate', '1'),
(1, 'commission_default', '5');

-- ===========================================
-- TEMPLATES WHATSAPP
-- ===========================================
INSERT INTO whatsapp_templates (company_id, name, type, message) VALUES
(1, 'Pedido Recebido', 'order_received', 'Olá {customer_name}! Recebemos seu pedido #{order_number}. Total: R$ {total}. Em breve enviaremos a confirmação.'),
(1, 'Pagamento Aprovado', 'payment_approved', 'Olá {customer_name}! Seu pagamento do pedido #{order_number} foi aprovado. Estamos preparando seu pedido.'),
(1, 'Pedido Enviado', 'order_shipped', 'Olá {customer_name}! Seu pedido #{order_number} foi enviado. Código de rastreio: {tracking_code}.'),
(1, 'Aniversário', 'birthday', 'Olá {customer_name}! Feliz aniversário! Temos um presente especial para você: cupom ANIVERSARIO com 10% de desconto.'),
(1, 'Carrinho Abandonado', 'cart_abandoned', 'Olá {customer_name}! Você deixou itens no carrinho. Finalize sua compra e ganhe 5% de desconto com o cupom VOLTA5.');

-- ===========================================
-- TEMPLATES EMAIL
-- ===========================================
INSERT INTO email_templates (company_id, name, subject, body, type) VALUES
(1, 'Pedido Recebido', 'Pedido #{order_number} recebido com sucesso!', '<h1>Obrigado pelo seu pedido!</h1><p>Olá {customer_name},</p><p>Seu pedido #{order_number} foi recebido com sucesso.</p><p>Total: R$ {total}</p>', 'order_received'),
(1, 'Pagamento Aprovado', 'Pagamento aprovado - Pedido #{order_number}', '<h1>Pagamento aprovado!</h1><p>Olá {customer_name},</p><p>O pagamento do pedido #{order_number} foi confirmado.</p>', 'payment_approved'),
(1, 'Recuperação de Senha', 'Recuperação de senha', '<h1>Recuperação de senha</h1><p>Clique no link para redefinir sua senha: {reset_link}</p>', 'password_reset');

-- ===========================================
-- FORNECEDOR DE EXEMPLO
-- ===========================================
INSERT INTO suppliers (company_id, name, trade_name, cnpj, phone, email, contact_person, city, state)
VALUES (1, 'Fornecedor Exemplo LTDA', 'Fornecedor Exemplo', '12.345.678/0001-90', '(11) 3333-4444', 'contato@fornecedor.com.br', 'João Silva', 'São Paulo', 'SP');

-- ===========================================
-- VENDEDOR DE EXEMPLO
-- ===========================================
INSERT INTO sellers (company_id, name, cpf, phone, email, commission_rate, monthly_goal)
VALUES (1, 'Vendedor Exemplo', '123.456.789-00', '(11) 98888-7777', 'vendedor@loja.com.br', 5.00, 10000.00);

-- ===========================================
-- PRODUTOS DE EXEMPLO
-- ===========================================
INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status, is_featured, is_new)
VALUES
(1, 1, 1, 'Vestido Floral Verão', 'vestido-floral-verao', 'VEST-001', 149.90, 60.00, 'active', 1, 1),
(1, 2, 1, 'Blusa Cropped Básica', 'blusa-cropped-basica', 'BLUS-001', 59.90, 25.00, 'active', 1, 1),
(1, 3, 1, 'Calça Jeans Skinny', 'calca-jeans-skinny', 'CALC-001', 129.90, 55.00, 'active', 1, 0),
(1, 7, 1, 'Camiseta Algodão Premium', 'camiseta-algodao-premium', 'CAMI-001', 79.90, 30.00, 'active', 0, 1),
(1, 8, 2, 'Bolsa Transversal Couro', 'bolsa-transversal-couro', 'BOLS-001', 199.90, 80.00, 'active', 1, 0);

-- ===========================================
-- VARIANTES DOS PRODUTOS (cor/tamanho)
-- ===========================================
-- Vestido Floral
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity) VALUES
(1, 1, 'Floral Azul', 'P', 'VEST-001-AZ-P', 149.90, 5),
(1, 1, 'Floral Azul', 'M', 'VEST-001-AZ-M', 149.90, 8),
(1, 1, 'Floral Azul', 'G', 'VEST-001-AZ-G', 149.90, 6),
(1, 1, 'Floral Rosa', 'P', 'VEST-001-RO-P', 149.90, 4),
(1, 1, 'Floral Rosa', 'M', 'VEST-001-RO-M', 149.90, 7);

-- Blusa Cropped
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity) VALUES
(2, 1, 'Preto', 'P', 'BLUS-001-PR-P', 59.90, 10),
(2, 1, 'Preto', 'M', 'BLUS-001-PR-M', 59.90, 12),
(2, 1, 'Branco', 'P', 'BLUS-001-BR-P', 59.90, 8),
(2, 1, 'Branco', 'M', 'BLUS-001-BR-M', 59.90, 9);

-- Calça Jeans
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity) VALUES
(3, 1, 'Azul Claro', '38', 'CALC-001-CL-38', 129.90, 5),
(3, 1, 'Azul Claro', '40', 'CALC-001-CL-40', 129.90, 8),
(3, 1, 'Azul Claro', '42', 'CALC-001-CL-42', 129.90, 6),
(3, 1, 'Azul Escuro', '38', 'CALC-001-ES-38', 129.90, 4),
(3, 1, 'Azul Escuro', '40', 'CALC-001-ES-40', 129.90, 7);

-- Camiseta
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity) VALUES
(4, 1, 'Branco', 'P', 'CAMI-001-BR-P', 79.90, 15),
(4, 1, 'Branco', 'M', 'CAMI-001-BR-M', 79.90, 20),
(4, 1, 'Preto', 'P', 'CAMI-001-PR-P', 79.90, 12),
(4, 1, 'Preto', 'M', 'CAMI-001-PR-M', 79.90, 18);

-- Bolsa
INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity) VALUES
(5, 1, 'Preto', 'Único', 'BOLS-001-PR-U', 199.90, 3),
(5, 1, 'Marrom', 'Único', 'BOLS-001-MA-U', 199.90, 2);

-- ===========================================
-- CLIENTE DE EXEMPLO
-- ===========================================
INSERT INTO customers (company_id, name, email, phone, cpf_cnpj, city, state)
VALUES (1, 'Maria Silva', 'maria@email.com', '(11) 97777-6666', '123.456.789-00', 'São Paulo', 'SP');

-- ===========================================
-- CUPOM DE DESCONTO DE EXEMPLO
-- ===========================================
INSERT INTO coupons (company_id, code, type, value, min_purchase, start_date, end_date, max_uses, status)
VALUES (1, 'BEMVINDO10', 'percentage', 10.00, 50.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 100, 'active');
