// ==========================================
// 2. SCRIPT DE ESTATÍSTICAS DETALHADAS
// ==========================================
// backend/scripts/external-stats.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Database = require('../src/database/connection');
const logger = require('../src/config/logger');

async function showStats() {
  const database = new Database();
  
  try {
    await database.connect();
    
    const periodo = process.argv[2] || '7'; // dias
    
    logger.info(`=== ESTATÍSTICAS DAS APIS EXTERNAS (${periodo} dias) ===`);

    // 1. Resumo geral
    await showGeneralStats(database, periodo);
    
    // 2. Estatísticas por integração
    await showIntegrationStats(database, periodo);
    
    // 3. Estatísticas por operação
    await showOperationStats(database, periodo);
    
    // 4. Top IPs
    await showTopIPs(database, periodo);
    
    // 5. Horários de pico
    await showPeakHours(database, periodo);

  } catch (error) {
    logger.error('Erro ao gerar estatísticas:', error);
  } finally {
    await database.disconnect();
  }
}

async function showGeneralStats(database, periodo) {
  const query = `
    SELECT 
      COUNT(*) as total_requests,
      COUNT(DISTINCT integracao) as total_integracoes,
      COUNT(DISTINCT ip) as total_ips,
      COUNT(CASE WHEN resultado->>'error' IS NULL THEN 1 END) as successful,
      COUNT(CASE WHEN resultado->>'error' IS NOT NULL THEN 1 END) as failed,
      ROUND(AVG(request_size), 2) as avg_size,
      MIN(created_at) as first_request,
      MAX(created_at) as last_request
    FROM external_logs 
    WHERE created_at >= NOW() - INTERVAL '${periodo} days'
  `;

  const result = await database.query(query);
  const stats = result.rows[0];

  const successRate = stats.total_requests > 0 ? 
    Math.round((stats.successful / stats.total_requests) * 100) : 0;

  logger.info('\n📊 RESUMO GERAL:');
  logger.info(`Total de requests: ${stats.total_requests}`);
  logger.info(`Integrações ativas: ${stats.total_integracoes}`);
  logger.info(`IPs únicos: ${stats.total_ips}`);
  logger.info(`Taxa de sucesso: ${successRate}% (${stats.successful}/${stats.total_requests})`);
  logger.info(`Tamanho médio: ${stats.avg_size} bytes`);
  
  if (stats.first_request) {
    logger.info(`Primeiro request: ${stats.first_request}`);
    logger.info(`Último request: ${stats.last_request}`);
  }
}

async function showIntegrationStats(database, periodo) {
  const query = `
    SELECT 
      integracao,
      COUNT(*) as total_requests,
      COUNT(CASE WHEN resultado->>'error' IS NULL THEN 1 END) as successful,
      COUNT(CASE WHEN resultado->>'error' IS NOT NULL THEN 1 END) as failed,
      ROUND(AVG(request_size), 2) as avg_size,
      COUNT(DISTINCT ip) as unique_ips
    FROM external_logs 
    WHERE created_at >= NOW() - INTERVAL '${periodo} days'
    GROUP BY integracao
    ORDER BY total_requests DESC
  `;

  const result = await database.query(query);

  logger.info('\n📈 POR INTEGRAÇÃO:');
  
  if (result.rows.length === 0) {
    logger.info('Nenhuma atividade encontrada');
    return;
  }

  result.rows.forEach(row => {
    const successRate = Math.round((row.successful / row.total_requests) * 100);
    logger.info(
      `${row.integracao}: ${row.total_requests} requests, ` +
      `${successRate}% sucesso, ${row.unique_ips} IPs`
    );
  });
}

async function showOperationStats(database, periodo) {
  const query = `
    SELECT 
      operacao,
      COUNT(*) as total_requests,
      COUNT(CASE WHEN resultado->>'error' IS NULL THEN 1 END) as successful,
      ROUND(AVG(request_size), 2) as avg_size
    FROM external_logs 
    WHERE created_at >= NOW() - INTERVAL '${periodo} days'
    GROUP BY operacao
    ORDER BY total_requests DESC
  `;

  const result = await database.query(query);

  logger.info('\n🔧 POR OPERAÇÃO:');
  result.rows.forEach(row => {
    const successRate = Math.round((row.successful / row.total_requests) * 100);
    logger.info(
      `${row.operacao}: ${row.total_requests} requests, ` +
      `${successRate}% sucesso`
    );
  });
}

async function showTopIPs(database, periodo) {
  const query = `
    SELECT 
      ip,
      COUNT(*) as requests,
      COUNT(DISTINCT integracao) as integracoes
    FROM external_logs 
    WHERE created_at >= NOW() - INTERVAL '${periodo} days'
      AND ip IS NOT NULL
    GROUP BY ip
    ORDER BY requests DESC
    LIMIT 10
  `;

  const result = await database.query(query);

  logger.info('\n🌐 TOP 10 IPs:');
  result.rows.forEach((row, index) => {
    logger.info(`${index + 1}. ${row.ip}: ${row.requests} requests, ${row.integracoes} integrações`);
  });
}

async function showPeakHours(database, periodo) {
  const query = `
    SELECT 
      EXTRACT(HOUR FROM created_at) as hora,
      COUNT(*) as requests
    FROM external_logs 
    WHERE created_at >= NOW() - INTERVAL '${periodo} days'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY requests DESC
    LIMIT 5
  `;

  const result = await database.query(query);

  logger.info('\n⏰ HORÁRIOS DE PICO:');
  result.rows.forEach((row, index) => {
    logger.info(`${index + 1}. ${row.hora}h: ${row.requests} requests`);
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  showStats();
}

module.exports = { showStats };