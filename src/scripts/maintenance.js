// ==========================================
// 6. EXEMPLO DE SCRIPT DE MANUTENÇÃO
// ==========================================
// scripts/maintenance.js

const Database = require('../src/database/connection');
const logger = require('../src/config/logger');

async function maintenanceTasks() {
  const database = new Database();
  
  try {
    await database.connect();
    logger.info('Iniciando tarefas de manutenção...');

    // 1. Limpar logs antigos
    await cleanOldLogs(database);
    
    // 2. Reprocessar NFs com erro
    await reprocessErrorNFs(database);
    
    // 3. Atualizar estatísticas
    await updateStatistics(database);
    
    logger.info('Tarefas de manutenção concluídas');
    
  } catch (error) {
    logger.error('Erro nas tarefas de manutenção:', error);
  } finally {
    await database.disconnect();
  }
}

async function cleanOldLogs(database) {
  const query = `
    DELETE FROM log_integracaos 
    WHERE created_at < NOW() - INTERVAL '30 days'
  `;
  
  const result = await database.query(query);
  logger.info(`${result.rowCount} logs antigos removidos`);
}

async function reprocessErrorNFs(database) {
  const query = `
    UPDATE notas_fiscais 
    SET status_api = NULL 
    WHERE status_api = 'erro' 
      AND updated_at < NOW() - INTERVAL '1 hour'
  `;
  
  const result = await database.query(query);
  logger.info(`${result.rowCount} NFs marcadas para reprocessamento`);
}

async function updateStatistics(database) {
  // Implementar cache de estatísticas se necessário
  logger.info('Estatísticas atualizadas');
}

// Executar se chamado diretamente
if (require.main === module) {
  maintenanceTasks();
}

module.exports = { maintenanceTasks };