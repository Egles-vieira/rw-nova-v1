const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../config/logger');

// Pool de conexões PostgreSQL
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  min: config.database.poolMin,
  max: config.database.poolMax,
  connectionTimeoutMillis: config.database.connectionTimeout,
  idleTimeoutMillis: config.database.idleTimeout,
  query_timeout: 30000,
  statement_timeout: 30000,
  application_name: 'road-rw-api'
});

// Event listeners para monitoramento
pool.on('connect', (client) => {
  logger.info('Nova conexão estabelecida com PostgreSQL');
});

pool.on('acquire', (client) => {
  logger.debug('Cliente adquirido do pool');
});

pool.on('error', (err, client) => {
  logger.error('Erro inesperado no pool de conexões:', err);
});

pool.on('remove', (client) => {
  logger.debug('Cliente removido do pool');
});

// Função para testar conexão
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');
    logger.info('Conexão com PostgreSQL estabelecida:', {
      timestamp: result.rows[0].now,
      version: result.rows[0].version.split(' ')[0]
    });
    client.release();
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com PostgreSQL:', error);
    return false;
  }
};

// Função para executar queries com logs
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.nodeEnv === 'development') {
      logger.debug('Query executada:', {
        text,
        params,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Erro na query:', {
      text,
      params,
      duration: `${duration}ms`,
      error: error.message
    });
    throw error;
  }
};

// Função para transações
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Função para health check
const healthCheck = async () => {
  try {
    const result = await query('SELECT 1 as healthy');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Graceful shutdown
const close = async () => {
  try {
    await pool.end();
    logger.info('Pool de conexões PostgreSQL fechado');
  } catch (error) {
    logger.error('Erro ao fechar pool de conexões:', error);
  }
};

// Escutar eventos de processo para cleanup
process.on('SIGINT', close);
process.on('SIGTERM', close);

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  healthCheck,
  close
};