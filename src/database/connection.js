// backend/src/database/connection.js
const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../config/logger');

const sslConfig = config.database.ssl
  ? { rejectUnauthorized: false } // ou use CA se tiver (ver nota abaixo)
  : false;

// Pool de conexões PostgreSQL
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: sslConfig,
  min: config.database.poolMin,
  max: config.database.poolMax,
  connectionTimeoutMillis: config.database.connectionTimeout,
  idleTimeoutMillis: config.database.idleTimeout,
  query_timeout: 30000,
  statement_timeout: 30000,
  application_name: 'road-rw-api'
});

// Teste simples de conexão: retorna boolean
async function testConnection() {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const ms = Date.now() - start;
    logger.info(`Database connected successfully (${ms}ms)`);
    return true;
  } catch (err) {
    logger.error('Database connection failed:', err);
    return false;
  }
}

// Health check detalhado: retorna objeto com métricas
async function healthCheck() {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT NOW() as now');
    const durationMs = Date.now() - start;
    return {
      status: 'up',
      now: result.rows[0].now,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      latencyMs: durationMs
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
      latencyMs: Date.now() - start
    };
  }
}

// Encerrar pool com grace
async function close() {
  try {
    await pool.end();
  } catch (err) {
    logger.error('Erro ao encerrar pool do Postgres:', err);
  }
}

// Helper padrão de query
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  res.durationMs = Date.now() - start;
  return res;
}

module.exports = {
  pool,
  query,
  testConnection,
  healthCheck,
  close
};
