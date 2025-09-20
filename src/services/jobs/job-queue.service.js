
// ==========================================
// 4. JOB QUEUE SERVICE
// ==========================================
// backend/src/services/jobs/job-queue.service.js

const logger = require('../../config/logger');
const IntegrationFactory = require('../integrations/integration-factory');

class JobQueueService {
  constructor() {
    this.queues = new Map(); // transportadora -> queue
    this.processing = new Map(); // transportadora -> isProcessing
    this.processors = new Map(); // transportadora -> processor function
  }

  // Criar fila para uma transportadora
  createQueue(transportadoraId, config = {}) {
    const queueName = `transportadora_${transportadoraId}`;
    
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
      this.processing.set(queueName, false);
      
      logger.info(`Fila criada para transportadora ${transportadoraId}`, config);
    }

    return queueName;
  }

  // Adicionar job na fila
  async addJob(transportadoraId, jobData) {
    const queueName = this.createQueue(transportadoraId);
    const queue = this.queues.get(queueName);

    const job = {
      id: Date.now() + Math.random(),
      transportadoraId,
      data: jobData,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      status: 'pending'
    };

    queue.push(job);
    
    logger.info(`Job adicionado na fila ${queueName}:`, {
      jobId: job.id,
      queueSize: queue.length
    });

    // Processar fila se não estiver sendo processada
    if (!this.processing.get(queueName)) {
      setImmediate(() => this.processQueue(queueName));
    }

    return job.id;
  }

  // Processar fila de uma transportadora
  async processQueue(queueName) {
    if (this.processing.get(queueName)) {
      return;
    }

    this.processing.set(queueName, true);
    const queue = this.queues.get(queueName);

    logger.info(`Iniciando processamento da fila ${queueName}:`, {
      queueSize: queue.length
    });

    while (queue.length > 0) {
      const job = queue.shift();
      
      try {
        await this.processJob(job);
        job.status = 'completed';
        
        logger.info(`Job ${job.id} processado com sucesso`);
        
      } catch (error) {
        job.attempts++;
        job.lastError = error.message;
        
        if (job.attempts < job.maxAttempts) {
          // Adicionar de volta na fila com delay
          setTimeout(() => {
            queue.push(job);
            if (!this.processing.get(queueName)) {
              this.processQueue(queueName);
            }
          }, 5000 * job.attempts); // Backoff
          
          logger.warn(`Job ${job.id} falhou, tentativa ${job.attempts}/${job.maxAttempts}:`, error.message);
        } else {
          job.status = 'failed';
          logger.error(`Job ${job.id} falhou definitivamente:`, error.message);
        }
      }

      // Rate limiting entre jobs
      if (queue.length > 0) {
        await this.sleep(1000); // 1 segundo entre requests
      }
    }

    this.processing.set(queueName, false);
    logger.info(`Processamento da fila ${queueName} finalizado`);
  }

// Processar um job individual
async processJob(jobData) {
  const { numeroNF, transportadora, apiConfig, detalhesNF } = jobData;
  
  logger.info(`Iniciando processamento da NF ${numeroNF}`, {
    nf: numeroNF,
    transportadora: transportadora.nome,
    integracao: transportadora.integracao_ocorrencia,
    detalhes: detalhesNF
  });

  try {
    // Processar a NF...
    const resultado = await this.integrationService.processarNF(numeroNF, transportadora, apiConfig);
    
    logger.info(`NF ${numeroNF} processada com sucesso`, {
      nf: numeroNF,
      status: resultado.status,
      transportadora: transportadora.nome,
      tempo_processamento: resultado.tempo
    });
    
    return resultado;
    
  } catch (error) {
    logger.error(`Falha no processamento da NF ${numeroNF}: ${error.message}`, {
      nf: numeroNF,
      transportadora: transportadora.nome,
      error: error.message,
      tentativa: jobData.attempts
    });
    
    throw error;
  }
}

  // Obter status das filas
  getQueueStatus() {
    const status = {};

    for (const [queueName, queue] of this.queues.entries()) {
      status[queueName] = {
        size: queue.length,
        processing: this.processing.get(queueName),
        jobs: queue.map(job => ({
          id: job.id,
          status: job.status,
          attempts: job.attempts,
          createdAt: job.createdAt
        }))
      };
    }

    return status;
  }

  // Limpar fila
  clearQueue(transportadoraId) {
    const queueName = `transportadora_${transportadoraId}`;
    const queue = this.queues.get(queueName);
    
    if (queue) {
      const cleared = queue.length;
      queue.length = 0;
      
      logger.info(`Fila ${queueName} limpa: ${cleared} jobs removidos`);
      return cleared;
    }
    
    return 0;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = JobQueueService;