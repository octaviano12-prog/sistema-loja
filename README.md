# ModaControl Pro

Sistema completo de gestão para loja de roupas com loja online, PDV, controle de estoque, financeiro, emissão de notas fiscais e muito mais.

## 🎯 Características

- **Loja Online Completa** - E-commerce profissional com carrinho, checkout e rastreamento
- **PDV (Ponto de Venda)** - Sistema de caixa para loja física
- **Controle de Estoque** - Grade por cor e tamanho
- **Gestão de Clientes** - CRM completo com histórico
- **Financeiro** - Contas a pagar/receber e fluxo de caixa
- **Notas Fiscais** - Preparado para integração com APIs fiscais
- **Relatórios** - Dashboard com métricas e gráficos
- **Multi-empresa** - Estrutura SaaS para múltiplas lojas
- **Responsivo** - Funciona em desktop, tablet e celular

## 🛠️ Tecnologias

- **Backend:** Node.js + Express.js
- **Frontend:** EJS + Tailwind CSS
- **Banco de Dados:** MySQL
- **Autenticação:** JWT
- **Upload:** Multer

## 📋 Pré-requisitos

- Node.js 18+
- MySQL 5.7+ ou MariaDB 10.3+
- Servidor com suporte a Node.js (Hostinger, DigitalOcean, AWS, etc.)

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/modacontrol-pro.git
cd modacontrol-hostinger/backend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

```bash
# Crie o banco no MySQL
mysql -u root -p
CREATE DATABASE modacontrol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Importe o schema
mysql -u root -p modacontrol < ../database/schema.sql

# Importe os dados iniciais
mysql -u root -p modacontrol < ../database/seed.sql
```

### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=modacontrol

JWT_SECRET=gere_uma_chave_segura_aqui
JWT_EXPIRES_IN=24h

CORS_ORIGINS=http://localhost:3000
```

### 5. Inicie o servidor

```bash
npm start
```

O sistema estará disponível em:

- Loja online: http://localhost:3000/
- Painel admin: http://localhost:3000/admin
- PDV: http://localhost:3000/pdv

## 🔑 Credenciais Padrão

- **Email:** admin@modacontrol.com.br
- **Senha:** admin123

⚠️ **IMPORTANTE:** Altere a senha após o primeiro acesso!

## 📁 Estrutura do Projeto

```
modacontrol-hostinger/
├── backend/
│   ├── config/
│   │   └── database.js       # Conexão MySQL
│   ├── middleware/
│   │   └── auth.js           # Autenticação JWT
│   ├── routes/               # Rotas da API
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   └── ... (mais rotas)
│   ├── views/                # Templates EJS
│   │   ├── admin/           # Painel administrativo
│   │   ├── pdv/             # Ponto de venda
│   │   ├── store/           # Loja online
│   │   └── login.ejs
│   ├── uploads/              # Arquivos enviados
│   ├── public/               # Arquivos estáticos
│   ├── .env.example          # Template de variáveis
│   ├── package.json
│   └── server.js             # Arquivo principal
├── database/
│   ├── schema.sql            # Estrutura do banco
│   └── seed.sql              # Dados iniciais
├── README.md
└── README_DEPLOY_HOSTINGER.md
```

## 🎨 Módulos do Sistema

### 1. Loja Online (/)

- Página inicial com banners e produtos em destaque
- Catálogo com filtros por categoria, preço, cor, tamanho
- Página de produto com galeria de imagens
- Carrinho de compras
- Checkout completo
- Rastreamento de pedidos
- Área do cliente

### 2. Painel Administrativo (/admin)

- Dashboard com métricas e gráficos
- Gestão de produtos com variações
- Controle de estoque
- Gestão de clientes (CRM)
- Gestão de pedidos
- Ponto de venda (PDV)
- Financeiro (contas a pagar/receber)
- Relatórios
- Notas fiscais
- Cupons de desconto
- Configurações
- Gestão de usuários

### 3. PDV (/pdv)

- Interface rápida para vendas no balcão
- Abertura e fechamento de caixa
- Sangria e suprimento
- Múltiplas formas de pagamento
- Impressão de comprovante
- Busca por código de barras

## 📊 Banco de Dados

O sistema utiliza **40+ tabelas** organizadas em módulos:

- **companies** - Empresas (multi-tenant)
- **branches** - Filiais
- **users** - Usuários
- **roles** - Perfis de acesso
- **products** - Produtos
- **product_variants** - Variações (cor/tamanho)
- **customers** - Clientes
- **sales_orders** - Pedidos de venda
- **stock_movements** - Movimentações de estoque
- **cash_registers** - Caixas
- **invoices** - Notas fiscais
- **accounts_payable** - Contas a pagar
- **accounts_receivable** - Contas a receber
- E muitas outras...

Veja o arquivo `database/schema.sql` para a estrutura completa.

## 🔐 Segurança

- Senhas criptografadas com bcrypt
- Autenticação JWT
- Proteção contra SQL injection
- CORS configurável
- Validação de dados
- Logs de auditoria
- Permissões por perfil

## 📱 Responsivo

O sistema é totalmente responsivo e funciona em:

- Desktop
- Tablet
- Smartphone

## 🌐 Publicação na Hostinger

Para instruções detalhadas de publicação na Hostinger, consulte:

**[README_DEPLOY_HOSTINGER.md](README_DEPLOY_HOSTINGER.md)**

## 🔄 Atualizações

### Versão 1.0.0 (2024)

- Sistema completo lançado
- Loja online funcional
- PDV integrado
- Gestão de estoque por grade
- Financeiro completo
- Relatórios e dashboard
- Estrutura SaaS pronta

## 📞 Suporte

Para dúvidas e suporte:

- Email: suporte@modacontrol.com.br
- Documentação: [wiki](https://github.com/seu-usuario/modacontrol-pro/wiki)

## 📝 Licença

Este projeto é proprietário. Todos os direitos reservados.

## 👨‍💻 Desenvolvedores

Desenvolvido com ❤️ pela equipe ModaControl Pro.

---

**Versão:** 1.0.0
**Última atualização:** 2024
