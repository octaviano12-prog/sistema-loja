const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function findSqlFile(fileName) {
  const candidates = [
    path.join(__dirname, '..', 'database', fileName),
    path.join(__dirname, 'database', fileName),
    path.join(process.cwd(), 'database', fileName),
    path.join(process.cwd(), '..', 'database', fileName)
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Arquivo ${fileName} não encontrado. Procurei em: ${candidates.join(', ')}`);
  }
  return found;
}

async function createSetupConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });
}

async function runSqlFile(connection, fileName) {
  const filePath = findSqlFile(fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Executando ${filePath}...`);
  await connection.query(sql);
}

async function main() {
  if (!process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error('Configure DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no arquivo .env antes de executar.');
  }

  const connection = await createSetupConnection();
  try {
    await runSqlFile(connection, 'schema.sql');
    await runSqlFile(connection, 'seed.sql');
    console.log('Banco de dados configurado com sucesso.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Erro ao configurar o banco de dados:', error.message);
  process.exit(1);
});
