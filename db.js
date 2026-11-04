require('dotenv').config({ quiet: true });
const { Pool, types } = require('pg');

types.setTypeParser(1082, (valor) => valor);

if (!process.env.DB_PASSWORD) {
  console.warn('AVISO: DB_PASSWORD não definido. Copie .env.example para .env e preencha a senha.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'sgcp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

pool.on('error', (erro) => console.error('Erro inesperado no banco:', erro.message));

module.exports = pool;
