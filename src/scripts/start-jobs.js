
// ==========================================
// 1. START JOBS SCRIPT
// ==========================================
// backend/scripts/start-jobs.js

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../database/connection');
const JobManagerService = require('../services/jobs/job-manager.service');
const logger = require('../config/logger');


class JobsManager {
  constructor() {
    this.database = db;
    this.jobManager = null;
    this.isRunning = false;
  }

  async start() {
    try {
      logger.info('=== INICIANDO SISTEMA DE JOBS ===');

      // 1. Conectar ao banco
      await this.database.testConnection();
      logger.info('✓ Conexão com banco estabelecida');

      // 2. Inicializar sistema de jobs
      this.jobManager = new JobManagerService(this.database);
      await this.jobManager.initialize();
      logger.info('✓ Sistema de jobs inicializado');

      // 3. Marcar como rodando
      this.isRunning = true;

      // 4. Obter status inicial
      const scheduler = this.jobManager.getScheduler();
      const status = scheduler.getStatus();
      
      logger.info('✓ Status do scheduler:', {
        enabled: status.config?.enabled,
        pollInterval: status.config?.poll_interval,
        scheduledJobs: status.scheduledJobs
      });

      logger.info('=== SISTEMA DE JOBS INICIADO COM SUCESSO ===');
      logger.info('Pressione Ctrl+C para parar o sistema');

      // 5. Configurar handlers de finalização
      this.setupShutdownHandlers();

      // 6. Manter processo ativo
      this.keepAlive();

    } catch (error) {
      logger.error('❌ Erro ao iniciar sistema de jobs:', error);
      await this.stop();
      process.exit(1);
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.info('Sistema já está parado');
      return;
    }

    try {
      logger.info('=== PARANDO SISTEMA DE JOBS ===');

      if (this.jobManager) {
        await this.jobManager.shutdown();
        logger.info('✓ Sistema de jobs finalizado');
      }

      if (this.database) {
        await this.database.disconnect();
        logger.info('✓ Conexão com banco fechada');
      }

      this.isRunning = false;
      logger.info('=== SISTEMA PARADO COM SUCESSO ===');

    } catch (error) {
      logger.error('❌ Erro ao parar sistema:', error);
    }
  }

  async getStatus() {
    if (!this.isRunning || !this.jobManager) {
      return { running: false, message: 'Sistema não está rodando' };
    }

    try {
      const scheduler = this.jobManager.getScheduler();
      const repositories = this.jobManager.getRepositories();
      
      const status = scheduler.getStatus();
      const stats = await repositories.jobs.getJobStats();
      const systemStatus = this.jobManager.getSystemStatus();

      return {
        running: true,
        system: systemStatus,
        scheduler: status,
        statistics: stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Erro ao obter status:', error);
      return { 
        running: true, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  setupShutdownHandlers() {
    // Finalização graceful
    const gracefulShutdown = async (signal) => {
      logger.info(`Recebido sinal ${signal}, iniciando finalização graceful...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Handler para erros não capturados
    process.on('uncaughtException', async (error) => {
      logger.error('Erro não capturado:', error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Promise rejeitada não tratada:', { reason, promise });
      await this.stop();
      process.exit(1);
    });
  }

  keepAlive() {
    // Manter processo ativo e imprimir status periodicamente
    setInterval(async () => {
      try {
        const status = await this.getStatus();
        
        logger.info('Status periódico:', {
          running: status.running,
          uptime: Math.floor(status.uptime / 60) + ' min',
          memoryUsage: Math.floor(status.memory?.heapUsed / 1024 / 1024) + ' MB'
        });

        // Verificar saúde do sistema
        if (status.scheduler && !status.scheduler.running) {
          logger.warn('⚠️  Scheduler não está rodando!');
        }

      } catch (error) {
        logger.error('Erro no status periódico:', error);
      }
    }, 5 * 60 * 1000); // A cada 5 minutos
  }
}

// Função principal
async function startJobs() {
  const manager = new JobsManager();
  await manager.start();
}

// Executar se chamado diretamente
if (require.main === module) {
  startJobs();
}

module.exports = { JobsManager, startJobs };
