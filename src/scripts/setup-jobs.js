// ==========================================
// 5. SCRIPT DE SETUP COMPLETO
// ==========================================
// backend/scripts/setup-jobs.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('../database/connection'); // módulo com query/testConnection/close
const JobManagerService = require('../services/jobs/job-manager.service');
const logger = require('../config/logger');

async function setupJobs() {
  const database = db;
  let jobManager = null;

  try {
    logger.info('=== SETUP DO SISTEMA DE JOBS ===');

    // 1. Testar conexão (o pool conecta on-demand)
    await database.testConnection();
    logger.info('✓ Conexão com banco estabelecida');

    // 2. Executar seeds
    logger.info('✓ Configurações iniciais criadas');

    // 3. Testar inicialização do sistema
    jobManager = new JobManagerService(database);
    await jobManager.initialize();
    logger.info('✓ Sistema de jobs inicializado');

    // 4. Testar funcionamento básico
    const scheduler = jobManager.getScheduler();
    const status = scheduler.getStatus();
    logger.info('✓ Status do scheduler:', status);

    // 5. Aguardar um pouco para verificar se o scheduler está funcionando
    logger.info('Aguardando 5 segundos para verificação do scheduler...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. Parar sistema ANTES de fechar a conexão
    await jobManager.shutdown();
    logger.info('✓ Sistema finalizado corretamente');

    logger.info('=== SETUP CONCLUÍDO COM SUCESSO ===');

  } catch (error) {
    logger.error('❌ Erro no setup:', error);
    
    // Tentar parar o jobManager se existir, mesmo em caso de erro
    if (jobManager) {
      try {
        await jobManager.shutdown();
      } catch (shutdownError) {
        logger.warn('Erro ao parar sistema durante cleanup:', shutdownError);
      }
    }
    
    process.exit(1);
  } finally {
    // Fechar conexão apenas após garantir que tudo foi parado
    if (database) {
      try {
        await database.close();
        logger.info('✓ Conexão com banco fechada');
      } catch (closeError) {
        logger.warn('Erro ao fechar conexão com banco:', closeError);
      }
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupJobs();
}

module.exports = { setupJobs };