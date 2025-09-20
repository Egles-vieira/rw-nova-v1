// ==========================================
// 4. SEEDS PARA CONFIGURAÇÕES INICIAIS
// ==========================================
// backend/src/database/seeds/jobs.seed.js

const logger = require('../../config/logger');

async function seedJobsConfiguration(database) {
  try {
    logger.info('Iniciando seed de configurações de jobs...');

    // 1. Configurações de integração
    const integrationConfigQuery = `
      INSERT INTO settings (slug, env, settings, created_at, updated_at)
      VALUES ('integration_config', 'production', $1, NOW(), NOW())
      ON CONFLICT (slug, env) DO UPDATE SET
        settings = EXCLUDED.settings,
        updated_at = NOW()
    `;

    const integrationConfig = {
      enabled: true,
      poll_interval: 300,
      rate_limits: {
        jamef: { requests: 100, per: 'minute' },
        braspress: { requests: 500, per: 'hour' },
        tnt: { requests: 200, per: 'minute' }
      },
      timeouts: {
        default: 30000,
        jamef: 15000,
        braspress: 45000,
        tnt: 20000
      },
      retry: {
        attempts: 3,
        exponential: true,
        base_delay: 1000
      },
      circuit_breaker: {
        enabled: true,
        failure_threshold: 5,
        reset_timeout: 60000
      }
    };

    await database.query(integrationConfigQuery, [JSON.stringify(integrationConfig)]);

    // 2. Configurações de monitoramento
    const monitoringConfigQuery = `
      INSERT INTO settings (slug, env, settings, created_at, updated_at)
      VALUES ('monitoring_config', 'production', $1, NOW(), NOW())
      ON CONFLICT (slug, env) DO UPDATE SET
        settings = EXCLUDED.settings,
        updated_at = NOW()
    `;

    const monitoringConfig = {
      alertas: {
        erro_threshold: 5,
        inatividade_hours: 4,
        email_notifications: false,
        webhook_url: null
      },
      dashboard: {
        periodo_padrao: 7,
        refresh_interval: 30,
        auto_refresh: true
      },
      logs: {
        retention_days: 30,
        max_log_size: 1000000
      }
    };

    await database.query(monitoringConfigQuery, [JSON.stringify(monitoringConfig)]);

    // 3. Códigos de ocorrência para APIs
    const codigosQuery = `
      INSERT INTO codigo_ocorrencias (codigo, descricao, tipo, processo, finalizadora, api, created_at)
      VALUES 
        (1, 'Coleta realizada', 'coleta', 'pickup', false, true, NOW()),
        (2, 'Em trânsito', 'transporte', 'transport', false, true, NOW()),
        (3, 'Saiu para entrega', 'entrega', 'delivery', false, true, NOW()),
        (4, 'Entregue', 'entrega', 'delivered', true, true, NOW()),
        (5, 'Tentativa de entrega', 'entrega', 'delivery_attempt', false, true, NOW()),
        (6, 'Devolvido', 'devolucao', 'returned', true, true, NOW()),
        (7, 'Extraviado', 'problema', 'lost', true, true, NOW()),
        (8, 'Avariado', 'problema', 'damaged', false, true, NOW()),
        (9, 'Aguardando retirada', 'entrega', 'waiting_pickup', false, true, NOW()),
        (99, 'Outros eventos', 'outros', 'other', false, true, NOW())
      ON CONFLICT (codigo) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        tipo = EXCLUDED.tipo,
        processo = EXCLUDED.processo,
        finalizadora = EXCLUDED.finalizadora,
        api = EXCLUDED.api
    `;

    await database.query(codigosQuery);

    // 4. Tokens de exemplo (desabilitados)
    const tokensQuery = `
      INSERT INTO api_tokens (integracao, token, active, created_at)
      VALUES 
        ('jamef', 'EXEMPLO_TOKEN_JAMEF_DESABILITADO', false, NOW()),
        ('braspress', 'EXEMPLO_TOKEN_BRASPRESS_DESABILITADO', false, NOW()),
        ('tnt', 'EXEMPLO_TOKEN_TNT_DESABILITADO', false, NOW())
      ON CONFLICT DO NOTHING
    `;

    await database.query(tokensQuery);

    logger.info('Seed de configurações de jobs concluído com sucesso');

  } catch (error) {
    logger.error('Erro no seed de configurações de jobs:', error);
    throw error;
  }
}

module.exports = { seedJobsConfiguration };

// ==========================================
// 5. SCRIPT DE SETUP COMPLETO
// ==========================================
// backend/scripts/setup-jobs.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Database = require('../src/database/connection');
const { seedJobsConfiguration } = require('../src/database/seeds/jobs.seed');
const JobManagerService = require('../src/services/jobs/job-manager.service');
const logger = require('../src/config/logger');

async function setupJobs() {
  let database;

  try {
    logger.info('=== SETUP DO SISTEMA DE JOBS ===');

    // 1. Conectar ao banco
    database = new Database();
    await database.connect();
    logger.info('✓ Conexão com banco estabelecida');

    // 2. Executar seeds
    await seedJobsConfiguration(database);
    logger.info('✓ Configurações iniciais criadas');

    // 3. Testar inicialização do sistema
    const jobManager = new JobManagerService(database);
    await jobManager.initialize();
    logger.info('✓ Sistema de jobs inicializado');

    // 4. Testar funcionamento básico
    const scheduler = jobManager.getScheduler();
    const status = scheduler.getStatus();
    logger.info('✓ Status do scheduler:', status);

    // 5. Parar sistema
    await jobManager.shutdown();
    logger.info('✓ Sistema finalizado corretamente');

    logger.info('=== SETUP CONCLUÍDO COM SUCESSO ===');

  } catch (error) {
    logger.error('❌ Erro no setup:', error);
    process.exit(1);
  } finally {
    if (database) {
      await database.disconnect();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupJobs();
}

module.exports = { setupJobs };
