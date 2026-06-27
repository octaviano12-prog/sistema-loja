-- ===========================================
-- MODACONTROL PRO - UPGRADE FISCAL HOSTINGER
-- Use se a tela de Notas Fiscais acusar coluna faltando.
-- O sistema também tenta criar essas colunas automaticamente pela API.
-- ===========================================

ALTER TABLE fiscal_settings ADD COLUMN legal_name VARCHAR(255);
ALTER TABLE fiscal_settings ADD COLUMN trade_name VARCHAR(255);
ALTER TABLE fiscal_settings ADD COLUMN municipal_registration VARCHAR(30);
ALTER TABLE fiscal_settings ADD COLUMN sefaz_state VARCHAR(2);
ALTER TABLE fiscal_settings ADD COLUMN city VARCHAR(100);
ALTER TABLE fiscal_settings ADD COLUMN city_ibge_code VARCHAR(20);
ALTER TABLE fiscal_settings ADD COLUMN address VARCHAR(255);
ALTER TABLE fiscal_settings ADD COLUMN number VARCHAR(30);
ALTER TABLE fiscal_settings ADD COLUMN neighborhood VARCHAR(100);
ALTER TABLE fiscal_settings ADD COLUMN complement VARCHAR(100);
ALTER TABLE fiscal_settings ADD COLUMN zip_code VARCHAR(15);
ALTER TABLE fiscal_settings ADD COLUMN phone VARCHAR(30);
ALTER TABLE fiscal_settings ADD COLUMN email VARCHAR(255);
ALTER TABLE fiscal_settings ADD COLUMN crt VARCHAR(5) DEFAULT '1';
ALTER TABLE fiscal_settings ADD COLUMN certificate_type VARCHAR(20) DEFAULT 'a1';
ALTER TABLE fiscal_settings ADD COLUMN certificate_expires_at DATE NULL;
ALTER TABLE fiscal_settings ADD COLUMN api_secret VARCHAR(255);
ALTER TABLE fiscal_settings ADD COLUMN api_token TEXT;
ALTER TABLE fiscal_settings ADD COLUMN webhook_url VARCHAR(500);
ALTER TABLE fiscal_settings ADD COLUMN nfe_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE fiscal_settings ADD COLUMN nfce_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE fiscal_settings ADD COLUMN nfe_default_cfop VARCHAR(10) DEFAULT '5102';
ALTER TABLE fiscal_settings ADD COLUMN nfce_default_cfop VARCHAR(10) DEFAULT '5102';
ALTER TABLE fiscal_settings ADD COLUMN default_ncm VARCHAR(20);
ALTER TABLE fiscal_settings ADD COLUMN default_cest VARCHAR(20);
ALTER TABLE fiscal_settings ADD COLUMN default_csosn VARCHAR(10) DEFAULT '102';
ALTER TABLE fiscal_settings ADD COLUMN default_cst_icms VARCHAR(10);
ALTER TABLE fiscal_settings ADD COLUMN default_cst_pis VARCHAR(10) DEFAULT '07';
ALTER TABLE fiscal_settings ADD COLUMN default_cst_cofins VARCHAR(10) DEFAULT '07';
ALTER TABLE fiscal_settings ADD COLUMN icms_origin VARCHAR(5) DEFAULT '0';
ALTER TABLE fiscal_settings ADD COLUMN csc_id VARCHAR(20);
ALTER TABLE fiscal_settings ADD COLUMN csc_token VARCHAR(255);
ALTER TABLE fiscal_settings ADD COLUMN contingency_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE fiscal_settings ADD COLUMN contingency_reason TEXT;
ALTER TABLE fiscal_settings ADD COLUMN last_validation_at TIMESTAMP NULL;

ALTER TABLE invoices ADD COLUMN pdf_url VARCHAR(500);
ALTER TABLE invoices ADD COLUMN danfe_url VARCHAR(500);
ALTER TABLE invoices ADD COLUMN xml_path VARCHAR(500);
ALTER TABLE invoices ADD COLUMN environment VARCHAR(20);
ALTER TABLE invoices ADD COLUMN api_provider VARCHAR(100);
