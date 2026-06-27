# Guia de Publicação na Hostinger - ModaControl Pro

## 📋 Tipo do Projeto

**ModaControl Pro** é um sistema **full-stack Node.js** com:

- ✅ Backend: Node.js + Express.js
- ✅ Frontend: EJS (renderizado no servidor)
- ✅ Banco de Dados: MySQL
- ✅ Autenticação: JWT
- ✅ Upload de arquivos: Sim (imagens de produtos)
- ✅ Variáveis de ambiente: Sim (.env)
- ✅ API REST integrada

---

## 🏗️ Estrutura do Projeto

```
modacontrol-hostinger/
├── backend/                    ← Tudo que vai para a Hostinger
│   ├── config/
│   │   └── database.js        ← Conexão MySQL
│   ├── middleware/
│   │   └── auth.js            ← Autenticação JWT
│   ├── routes/                ← Todas as rotas da API
│   ├── views/                 ← Templates EJS
│   ├── uploads/               ← Arquivos enviados
│   ├── public/                ← Arquivos estáticos
│   ├── .env.example           ← Template de variáveis
│   ├── .gitignore
│   ├── package.json
│   └── server.js              ← Arquivo principal
├── database/
│   ├── schema.sql             ← Estrutura do banco
│   └── seed.sql               ← Dados iniciais
├── README.md
└── README_DEPLOY_HOSTINGER.md ← Este arquivo
```

---

## 🚀 Passo a Passo para Publicação

### 1. Preparar o Banco de Dados MySQL na Hostinger

1. Acesse o **hPanel** da Hostinger
2. Vá em **Bancos de Dados** → **MySQL Databases**
3. Crie um novo banco:
   - Nome: `u123456789_modacontrol` (anote o nome)
   - Usuário: `u123456789_admin` (anote o usuário)
   - Senha: gere uma senha forte (anote)
4. Anote também o **Host** (geralmente `localhost`)

### 2. Importar o Schema do Banco

1. No hPanel, vá em **phpMyAdmin**
2. Selecione o banco criado
3. Clique na aba **Importar**
4. Faça upload do arquivo `database/schema.sql`
5. Aguarde a criação de todas as tabelas

### 3. Importar os Dados Iniciais

1. Ainda no phpMyAdmin, clique em **Importar** novamente
2. Faça upload do arquivo `database/seed.sql`
3. Isso criará:
   - Empresa padrão
   - Filial principal
   - Perfis de acesso
   - Usuário administrador
   - Categorias de produtos
   - Marcas
   - Métodos de envio
   - Planos SaaS
   - Configurações
   - Produtos de exemplo com variantes
   - Cupom de desconto

### 4. Preparar os Arquivos para Upload

**Arquivos que NÃO devem ser enviados:**

```
node_modules/
.env
.env.local
*.log
.DS_Store
data/*.db
```

**Arquivos que DEVEM ser enviados:**

```
Toda a pasta backend/ (exceto node_modules)
```

### 5. Upload via FTP ou Gerenciador de Arquivos

**Opção A: Via FTP (FileZilla, etc)**

1. Conecte-se ao FTP da Hostinger
2. Navegue até a pasta `public_html`
3. Envie **todo o conteúdo** da pasta `backend/` para `public_html/`

Estrutura final em `public_html/`:

```
public_html/
├── config/
│   └── database.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   └── ... (todas as rotas)
├── views/
│   ├── admin/
│   ├── pdv/
│   ├── store/
│   └── login.ejs
├── uploads/
├── public/
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

**Opção B: Via Gerenciador de Arquivos do hPanel**

1. Compacte a pasta `backend/` em ZIP
2. No hPanel, vá em **Arquivos** → **Gerenciador de Arquivos**
3. Navegue até `public_html`
4. Faça upload do ZIP
5. Extraia o conteúdo

### 6. Criar o Arquivo .env

1. No gerenciador de arquivos, vá para `public_html/`
2. Crie um novo arquivo chamado `.env`
3. Copie o conteúdo de `.env.example`
4. Preencha com os dados reais:

```env
PORT=3000
NODE_ENV=production

# Banco de dados MySQL (dados da Hostinger)
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_admin
DB_PASSWORD=sua_senha_forte_aqui
DB_NAME=u123456789_modacontrol

# Segurança
JWT_SECRET=gerar_uma_chave_aleatoria_segura_aqui
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br

# URLs
APP_URL=https://seudominio.com.br
API_URL=https://seudominio.com.br/api
```

⚠️ **IMPORTANTE:**
- Gere uma chave segura para `JWT_SECRET` em: https://www.random.org/strings/
- Nunca use senhas fracas
- Nunca commite o arquivo `.env` no Git

### 7. Instalar Dependências e Iniciar o Servidor

**Via SSH (recomendado):**

1. Acesse o terminal SSH da Hostinger
2. Navegue até `public_html/`:

```bash
cd ~/public_html
```

3. Instale as dependências:

```bash
npm install --production
```

4. Crie as pastas necessárias:

```bash
mkdir -p uploads
chmod 755 uploads
```

5. Inicie o servidor (teste primeiro):

```bash
node server.js
```

Se aparecer:

```
🚀 ModaControl Pro rodando na porta 3000
✅ Conexão com MySQL estabelecida com sucesso
```

Está funcionando!

**Para manter rodando em background:**

Use PM2 (se disponível):

```bash
npm install -g pm2
pm2 start server.js --name modacontrol
pm2 save
pm2 startup
```

Ou use o script do cPanel/hPanel para Node.js.

### 8. Configurar Node.js no hPanel

1. No hPanel, vá em **Avançado** → **Aplicativos Node.js**
2. Clique em **Criar aplicação**
3. Preencha:
   - **Nome**: modacontrol
   - **Domínio**: selecione seu domínio
   - **Pasta raiz**: `public_html`
   - **Arquivo de inicialização**: `server.js`
   - **Versão do Node**: 18.x ou superior
   - **Modo**: Production
4. Clique em **Executar NPM Install**
5. Aguarde a instalação
6. Clique em **Iniciar**

### 9. Verificar se Está Funcionando

Acesse seu domínio:

- Loja online: `https://seudominio.com.br/`
- Painel admin: `https://seudominio.com.br/admin`
- PDV: `https://seudominio.com.br/pdv`
- Login: `https://seudominio.com.br/login`

**Credenciais padrão:**
- Email: `admin@modacontrol.com.br`
- Senha: `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro acesso!

---

## 🔧 Solução de Problemas

### Erro: "Cannot find module"

```bash
cd ~/public_html
npm install
```

### Erro: "EACCES: permission denied"

```bash
chmod -R 755 ~/public_html
chmod -R 755 ~/public_html/uploads
```

### Erro: "Port 3000 already in use"

No `.env`, altere:

```env
PORT=3001
```

E reconfigure a aplicação Node.js no hPanel.

### Erro: "Access denied for user"

Verifique as credenciais do banco no `.env`:

```env
DB_USER=usuario_correto
DB_PASSWORD=senha_correta
DB_NAME=banco_correto
```

### Erro 404 em rotas

Verifique se o arquivo `server.js` está na raiz de `public_html/`.

### Uploads não funcionam

```bash
mkdir -p ~/public_html/uploads
chmod 755 ~/public_html/uploads
```

### CORS Error no navegador

Verifique o `CORS_ORIGINS` no `.env`:

```env
CORS_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br
```

---

## 🔒 Segurança em Produção

### Checklist Antes de Publicar

- [ ] Senha do banco forte (12+ caracteres)
- [ ] JWT_SECRET aleatório e seguro
- [ ] Arquivo `.env` não está no Git
- [ ] Pasta `uploads` com permissões corretas (755)
- [ ] HTTPS ativo no domínio
- [ ] CORS configurado apenas para domínios permitidos
- [ ] Senha do admin alterada após primeiro acesso
- [ ] Backups automáticos configurados

### Alterar Senha do Administrador

1. Acesse o painel admin
2. Vá em **Configurações** → **Usuários**
3. Clique em **Editar** no usuário administrador
4. Altere a senha

Ou via MySQL:

```sql
-- Gere o hash em: https://bcrypt-generator.com/
-- Use salt rounds: 10
UPDATE users SET password = 'hash_gerado' WHERE email = 'admin@modacontrol.com.br';
```

### Backup do Banco de Dados

**Via phpMyAdmin:**

1. Acesse o phpMyAdmin
2. Selecione o banco
3. Clique em **Exportar**
4. Escolha o formato SQL
5. Clique em **Executar**

**Via SSH:**

```bash
mysqldump -u usuario -p nome_do_banco > backup_$(date +%Y%m%d).sql
```

---

## 📊 Comandos Úteis

### Via SSH

```bash
# Ver logs da aplicação
pm2 logs modacontrol

# Reiniciar aplicação
pm2 restart modacontrol

# Parar aplicação
pm2 stop modacontrol

# Ver status
pm2 status

# Instalar dependências
cd ~/public_html && npm install --production

# Verificar se o servidor está rodando
curl http://localhost:3000

# Ver uso de memória
pm2 monit
```

### Via MySQL

```sql
-- Ver todas as tabelas
SHOW TABLES;

-- Ver estrutura de uma tabela
DESCRIBE products;

-- Contar produtos
SELECT COUNT(*) FROM products;

-- Ver pedidos recentes
SELECT * FROM sales_orders ORDER BY created_at DESC LIMIT 10;

-- Resetar senha do admin
UPDATE users SET password = '$2a$10$...' WHERE email = 'admin@modacontrol.com.br';
```

---

## 🔄 Atualizações

### Para Atualizar o Sistema

1. Faça backup do banco de dados
2. Faça backup da pasta `uploads/`
3. Faça backup do arquivo `.env`
4. Substitua os arquivos do sistema (exceto `.env` e `uploads/`)
5. Execute `npm install` se houver novas dependências
6. Reinicie a aplicação

### Para Adicionar Novos Produtos via SQL

```sql
INSERT INTO products (company_id, category_id, brand_id, name, slug, sku, price, cost_price, status)
VALUES (1, 1, 1, 'Nome do Produto', 'nome-do-produto', 'SKU-001', 99.90, 40.00, 'active');

INSERT INTO product_variants (product_id, company_id, color, size, sku, price, stock_quantity)
VALUES (LAST_INSERT_ID(), 1, 'Preto', 'M', 'SKU-001-PR-M', 99.90, 10);
```

---

## 📞 Suporte

### Documentação

- Express.js: https://expressjs.com/
- MySQL: https://dev.mysql.com/doc/
- Hostinger: https://www.hostinger.com.br/tutorials

### Logs de Erro

Verifique os logs para diagnosticar problemas:

```bash
pm2 logs modacontrol --lines 100
```

Ou no hPanel:

**Aplicativos Node.js** → **modacontrol** → **Logs**

---

## ✅ Checklist Final

Antes de considerar a publicação concluída:

- [ ] Banco de dados criado e populado
- [ ] Arquivos enviados para `public_html/`
- [ ] Arquivo `.env` configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Aplicação Node.js iniciada
- [ ] Loja online acessível (`/`)
- [ ] Painel admin acessível (`/admin`)
- [ ] PDV acessível (`/pdv`)
- [ ] Login funcionando
- [ ] CRUD de produtos funcionando
- [ ] Upload de imagens funcionando
- [ ] HTTPS ativo
- [ ] Senha do admin alterada
- [ ] Backup configurado

---

## 📝 Notas Finais

- O sistema usa **EJS** para renderização no servidor, não precisa de build de frontend
- Todas as rotas são gerenciadas pelo Express.js
- O banco MySQL é essencial para o funcionamento
- Mantenha o arquivo `.env` seguro e fora do controle de versão
- Faça backups regulares do banco de dados
- Monitore os logs para identificar problemas

---

**Versão:** 1.0.0
**Última atualização:** 2024
**Desenvolvido por:** ModaControl Pro Team
