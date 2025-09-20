// ==========================================
// 5. JOB SCHEDULER SERVICE
// ==========================================
// backend/src/services/jobs/job-scheduler.service.js

const cron = require('node-cron');
const logger = require('../../config/logger');
const defaultLogger = require('../../config/logger');
const JobQueueService = require('./job-queue.service');
const IntegrationFactory = require('../integrations/integration-factory');

class JobSchedulerService {
  constructor(repositories) {
    this.jobsRepository = repositories.jobs;
    this.settingsRepository = repositories.settings;
    this.transportadorasRepository = repositories.transportadoras;
    this.notasRepository = repositories.notas;
    this.ocorrenciasRepository = repositories.ocorrencias;
    
    this.queueService = new JobQueueService();
    this.scheduledJobs = new Map(); // ✅ Correto
    this.isRunning = false;
    this.config = null;
  }


  // Inicializar scheduler
  async initialize() {
    try {
      // Inicializar factory de integrações
      IntegrationFactory.initialize();
      
      // Carregar configurações
      await this.loadConfig();
      
      // Agendar job principal
      await this.scheduleMainJob();
      
      logger.info('Job Scheduler inicializado com sucesso');
      
    } catch (error) {
      logger.error('Erro ao inicializar Job Scheduler:', error);
      throw error;
    }
  }

  // Carregar configurações do banco
  async loadConfig() {
    try {
      const settings = await this.settingsRepository.findBySlug('integration_config');
      
      this.config = {
        enabled: true,
        pollInterval: 300, // 5 minutos
        rateLimits: {
          jamef: { requests: 100, per: 'minute' }
        },
        timeouts: {
          default: 30000,
          jamef: 15000
        },
        retry: {
          attempts: 3,
          exponential: true
        },
        ...settings?.settings
      };
      
      logger.info('Configurações carregadas:', this.config);
      
    } catch (error) {
      logger.warn('Erro ao carregar configurações, usando padrões:', error.message);
      
      // Configurações padrão
      this.config = {
        enabled: true,
        pollInterval: 300,
        rateLimits: {},
        timeouts: { default: 30000 },
        retry: { attempts: 3, exponential: true }
      };
    }
  }

  // Agendar job principal
  async scheduleMainJob() {
    if (!this.config.enabled) {
      logger.info('Jobs desabilitados na configuração');
      return;
    }

    // Converter intervalo para cron
    const intervalMinutes = Math.max(1, this.config.pollInterval / 60);
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    // Cancelar job existente se houver
    if (this.scheduledJobs.has('main')) {
      this.scheduledJobs.get('main').destroy();
    }

    // Agendar novo job
    const task = cron.schedule(cronExpression, async () => {
      if (!this.isRunning) {
        await this.executeMainJob();
      }
    }, {
      scheduled: true
    });

    this.scheduledJobs.set('main', task);
    
    logger.info(`Job principal agendado: ${cronExpression} (a cada ${intervalMinutes} minutos)`);
  }


// Executar job principal
async executeMainJob() {
  if (this.isRunning) {
    logger.warn('Job já está em execução, pulando ciclo');
    return;
  }

  this.isRunning = true;
  const startTime = Date.now();
  const cycleId = Date.now(); // ✅ ID único para o ciclo

  try {
    logger.info(`=== INICIANDO CICLO DE INTEGRAÇÃO [${cycleId}] ===`);

    // Registrar início da integração
    const integracaoId = await this.jobsRepository.createIntegracao({
      integracao: 'transportadoras_api',
      qtd: 0,
      inicio: new Date()
    });

    // Buscar transportadoras ativas com integração API
    const transportadoras = await this.transportadorasRepository.findForIntegration();
    
    if (transportadoras.length === 0) {
      logger.info('Nenhuma transportadora com integração ativa encontrada');
      return;
    }

    logger.info(`${transportadoras.length} transportadoras encontradas para integração`, {
      cycle_id: cycleId,
      transportadoras: transportadoras.map(t => ({
        id: t.id,
        nome: t.nome,
        integracao: t.integracao_ocorrencia
      }))
    });

    let totalProcessed = 0;

    // Processar cada transportadora
    for (const transportadora of transportadoras) {
      try {
        const processed = await this.processTransportadora(transportadora);
        totalProcessed += processed;
        
        logger.info(`Transportadora ${transportadora.nome} processada: ${processed} NFs`, {
          cycle_id: cycleId,
          transportadora: transportadora.nome,
          nfs_processadas: processed
        });
        
      } catch (error) {
        logger.error(`Erro ao processar transportadora ${transportadora.id}:`, {
          cycle_id: cycleId,
          transportadora_id: transportadora.id,
          error: error.message,
          stack: error.stack
        });
        
        await this.jobsRepository.createLog({
          integracao: 'transportadoras_api',
          nro: transportadora.id,
          texto: `Erro: ${error.message}`
        });
      }
    }

    // Finalizar integração
    await this.jobsRepository.updateIntegracao(integracaoId, {
      qtd: totalProcessed,
      fim: new Date()
    });

    const duration = Date.now() - startTime;
    logger.info(`=== CICLO FINALIZADO [${cycleId}]: ${totalProcessed} NFs processadas em ${duration}ms ===`, {
      cycle_id: cycleId,
      total_nfs: totalProcessed,
      duration_ms: duration,
      transportadoras_count: transportadoras.length
    });

  } catch (error) {
    logger.error('Erro no ciclo de integração:', {
      cycle_id: cycleId,
      error: error.message,
      stack: error.stack
    });
  } finally {
    this.isRunning = false;
  }
}

// Processar uma transportadora
async processTransportadora(transportadora) {
  const transportadoraInfo = {
    id: transportadora.id,
    nome: transportadora.nome,
    integracao: transportadora.integracao_ocorrencia
  };

  logger.info(`Iniciando processamento da transportadora`, {
    transportadora: transportadoraInfo,
    etapa: 'inicio'
  });

  // Buscar NFs não finalizadas desta transportadora
  const notasNaoFinalizadas = await this.notasRepository.findPendingByTransportadora(transportadora.id);
  
  if (notasNaoFinalizadas.length === 0) {
    logger.info(`Nenhuma NF pendente encontrada para a transportadora`, {
      transportadora: transportadoraInfo,
    });
    return 0;
  }

  logger.info(`NFs pendentes identificadas para processamento`, {
    transportadora: transportadoraInfo,
    quantidade_nfs: notasNaoFinalizadas.length,
    nfs: notasNaoFinalizadas.map(nota => ({
      nro_ctrc: nota.nro_ctrc,
      chave_nf: nota.chave_nf,
      cliente: nota.nome_rep,
      cod_rep: nota.cod_rep,
      status: nota.status_nf
    })),
    etapa: 'nf_encontradas'
  });

  // Obter configuração da API
  const apiConfig = await this.getAPIConfig(transportadora);
  
  if (!apiConfig || !apiConfig.token) {
    logger.warn(`Configuração de API não disponível para a transportadora`, {
      transportadora: transportadoraInfo,
      possui_config: !!apiConfig,
      possui_token: !!(apiConfig?.token),
      etapa: 'config_api'
    });
    return 0;
  }

  logger.info(`Configuração de API obtida com sucesso`, {
    transportadora: transportadoraInfo,
    config: {
      timeout: apiConfig.timeout,
      retry_attempts: apiConfig.retry?.attempts,
      rate_limit: apiConfig.requests ? `${apiConfig.requests} requests/${apiConfig.per}` : 'padrão'
    },
    etapa: 'config_ok'
  });

  let processed = 0;
  let batchNumber = 1;
  const totalBatches = Math.ceil(notasNaoFinalizadas.length / this.getRateLimitBatchSize(transportadora.integracao_ocorrencia));

  // Processar NFs em lotes respeitando rate limit
  const batchSize = this.getRateLimitBatchSize(transportadora.integracao_ocorrencia);
  
  logger.info(`Iniciando processamento em lotes`, {
    transportadora: transportadoraInfo,
    total_nfs: notasNaoFinalizadas.length,
    batch_size: batchSize,
    total_batches: totalBatches,
    etapa: 'inicio_lotes'
  });
  
  for (let i = 0; i < notasNaoFinalizadas.length; i += batchSize) {
    const batch = notasNaoFinalizadas.slice(i, i + batchSize);
    
    logger.info(`Processando lote ${batchNumber}/${totalBatches}`, {
      transportadora: transportadoraInfo,
      batch_number: batchNumber,
      total_batches: totalBatches,
      nfs_no_lote: batch.length,
      nfs: batch.map(n => n.nro_ctrc),
      intervalo: `${i}-${Math.min(i + batchSize, notasNaoFinalizadas.length)}/${notasNaoFinalizadas.length}`,
      etapa: 'processamento_lote'
    });
    
    try {
      await this.processBatch(batch, transportadora, apiConfig);
      processed += batch.length;
      
      logger.info(`Lote ${batchNumber}/${totalBatches} processado com sucesso`, {
        transportadora: transportadoraInfo,
        batch_number: batchNumber,
        nfs_processadas: batch.length,
        total_processadas: processed,
        progresso: `${processed}/${notasNaoFinalizadas.length}`,
        etapa: 'lote_concluido'
      });
      
      // Delay entre lotes apenas se não for o último lote
      if (i + batchSize < notasNaoFinalizadas.length) {
        const delayMs = 2000;
        logger.info(`Aguardando ${delayMs}ms antes do próximo lote...`, {
          transportadora: transportadoraInfo,
          delay_ms: delayMs,
          etapa: 'delay_lote'
        });
        
        await this.sleep(delayMs);
      }
      
    } catch (error) {
      logger.error(`Erro ao processar lote ${batchNumber} da transportadora`, {
        transportadora: transportadoraInfo,
        batch_number: batchNumber,
        error: error.message,
        stack: error.stack,
        nfs_no_lote: batch.map(n => n.nro_ctrc),
        etapa: 'erro_lote'
      });
      
      // Continuar com os próximos lotes mesmo com erro neste
    }
    
    batchNumber++;
  }

  logger.info(`Processamento da transportadora concluído`, {
    transportadora: transportadoraInfo,
    total_nfs: notasNaoFinalizadas.length,
    nfs_processadas: processed,
    taxa_sucesso: `${((processed / notasNaoFinalizadas.length) * 100).toFixed(1)}%`,
    etapa: 'conclusao'
  });

  return processed;
}


 // Processar lote de NFs
async processBatch(notas, transportadora, apiConfig) {
  const promises = notas.map(async (nota) => {
    try {
      // ✅ Log detalhado do início do processamento
      logger.info(`Processando NF ${nota.nro_ctrc} - Transportadora: ${transportadora.nome}`, {
        nf: nota.nro_ctrc,
        transportadora: transportadora.nome,
        transportadora_id: transportadora.id,
        chave_nf: nota.chave_nf,
        cliente: nota.nome_rep
      });

      // Adicionar job na fila
      await this.queueService.addJob(transportadora.id, {
        numeroNF: nota.nro_ctrc,
        transportadora,
        apiConfig,
        // ✅ Adicionar mais detalhes para logging
        detalhesNF: {
          chave_nf: nota.chave_nf,
          cliente: nota.nome_rep,
          cod_rep: nota.cod_rep,
          valor: nota.valor,
          peso: nota.peso_calculo
        }
      });

      // ✅ Log de sucesso
      logger.info(`NF ${nota.nro_ctrc} adicionada na fila com sucesso`, {
        nf: nota.nro_ctrc,
        transportadora: transportadora.nome,
        status: 'enqueued'
      });

    } catch (error) {
      // ✅ Log de erro detalhado
      logger.error(`Erro ao processar NF ${nota.nro_ctrc}: ${error.message}`, {
        nf: nota.nro_ctrc,
        transportadora: transportadora.nome,
        error: error.message,
        stack: error.stack
      });
      
      await this.jobsRepository.createLog({
        integracao: 'transportadoras_api',
        nro: nota.nro_ctrc,
        texto: `Erro: ${error.message}`
      });
    }
  });

  await Promise.allSettled(promises);
}

  // Obter configuração da API para transportadora
  async getAPIConfig(transportadora) {
    try {
      // Buscar token da API
      const apiToken = await this.settingsRepository.getActiveToken(transportadora.integracao_ocorrencia);
      
      if (!apiToken) {
        return null;
      }

      const config = this.config.rateLimits[transportadora.integracao_ocorrencia] || {};
      const timeout = this.config.timeouts[transportadora.integracao_ocorrencia] || this.config.timeouts.default;

      return {
        token: apiToken.token,
        timeout,
        retry: this.config.retry,
        ...config
      };

    } catch (error) {
      logger.error(`Erro ao obter configuração da API para ${transportadora.nome}:`, error);
      return null;
    }
  }

  // Obter tamanho do lote baseado no rate limit
  getRateLimitBatchSize(integracao) {
    const rateLimit = this.config.rateLimits[integracao];
    
    if (!rateLimit) return 10; // Padrão
    
    // Calcular lote seguro (50% do limite)
    return Math.max(1, Math.floor(rateLimit.requests * 0.5));
  }

  // Parar scheduler
// Parar scheduler
async stop() {
  logger.info('Parando Job Scheduler...'); // ✅ Usar logger importado
  
  for (const [name, task] of this.scheduledJobs.entries()) {
    try {
      if (task && typeof task.stop === 'function') task.stop();
      if (task && typeof task.destroy === 'function') task.destroy();
      logger.info(`Tarefa parada: ${name}`); // ✅ Usar logger importado
    } catch (e) {
      logger.warn(`Falha ao parar tarefa ${name}: ${e.message}`); // ✅ Usar logger importado
    }
  }
  
  // Limpar jobs agendados
  this.scheduledJobs.clear();
  this.isRunning = false;
  
  logger.info('Job Scheduler parado com sucesso'); // ✅ Usar logger importado
}

  // Executar job manualmente
  async runManual() {
    if (this.isRunning) {
      throw new Error('Job já está em execução');
    }
    
    logger.info('Executando job manual...');
    await this.executeMainJob();
  }

  // Recarregar configurações
  async reloadConfig() {
    await this.loadConfig();
    await this.scheduleMainJob();
    logger.info('Configurações recarregadas');
  }

  // Status do scheduler
  getStatus() {
    return {
      running: this.isRunning,
      config: this.config,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      queueStatus: this.queueService.getQueueStatus()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = JobSchedulerService;