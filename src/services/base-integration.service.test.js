// ==========================================
// 1. TESTES UNITÁRIOS - BASE INTEGRATION SERVICE
// ==========================================
// backend/tests/services/base-integration.service.test.js

const BaseIntegrationService = require('../../src/services/integrations/base-integration.service');

describe('BaseIntegrationService', () => {
  let service;

  beforeEach(() => {
    service = new (class TestIntegration extends BaseIntegrationService {
      async consultarAPI(numeroNF, config) {
        if (numeroNF === 'ERRO') {
          throw new Error('API Error');
        }
        return { success: true, numeroNF };
      }

      parseResponse(response, numeroNF) {
        return [{
          nro_nf: parseInt(numeroNF),
          codigo: 1,
          descricao: 'Teste',
          dataHoraEvento: new Date()
        }];
      }
    })({ name: 'test' });
  });

  describe('Circuit Breaker', () => {
    test('deve iniciar como CLOSED', () => {
      expect(service.circuitState).toBe('CLOSED');
      expect(service.isRequestAllowed()).toBe(true);
    });

    test('deve abrir circuito após falhas consecutivas', async () => {
      service.failureThreshold = 2;

      // Primeira falha
      try {
        await service.consultar('ERRO', {});
      } catch (error) {
        // Esperado
      }

      expect(service.circuitState).toBe('CLOSED');
      expect(service.failureCount).toBe(1);

      // Segunda falha - deve abrir circuito
      try {
        await service.consultar('ERRO', {});
      } catch (error) {
        // Esperado
      }

      expect(service.circuitState).toBe('OPEN');
      expect(service.isRequestAllowed()).toBe(false);
    });

    test('deve resetar circuito após sucesso', async () => {
      service.circuitState = 'HALF_OPEN';
      
      const result = await service.consultar('123', {});
      
      expect(result.success).toBe(true);
      expect(service.circuitState).toBe('CLOSED');
      expect(service.failureCount).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    test('deve fazer retry em caso de erro', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Temp error'))
        .mockResolvedValueOnce({ success: true });

      const result = await service.retryRequest(mockFn, 2);
      
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    test('deve falhar após esgotar tentativas', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new Error('Persistent error'));

      await expect(service.retryRequest(mockFn, 2))
        .rejects.toThrow('Persistent error');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rate Limiting', () => {
    test('deve permitir requests dentro do limite', async () => {
      service.rateLimitRequests = 2;
      service.requestCount = 1;

      const allowed = await service.checkRateLimit();
      expect(allowed).toBe(true);
      expect(service.requestCount).toBe(2);
    });

    test('deve bloquear requests acima do limite', async () => {
      service.rateLimitRequests = 1;
      service.requestCount = 1;

      await expect(service.checkRateLimit())
        .rejects.toThrow('Rate limit excedido');
    });
  });
});

// ==========================================
// 2. TESTES - JOB QUEUE SERVICE
// ==========================================
// backend/tests/services/job-queue.service.test.js

const JobQueueService = require('../../src/services/jobs/job-queue.service');

describe('JobQueueService', () => {
  let queueService;

  beforeEach(() => {
    queueService = new JobQueueService();
  });

  describe('Queue Management', () => {
    test('deve criar fila para transportadora', () => {
      const queueName = queueService.createQueue(1);
      
      expect(queueName).toBe('transportadora_1');
      expect(queueService.queues.has(queueName)).toBe(true);
      expect(queueService.processing.get(queueName)).toBe(false);
    });

    test('deve adicionar job na fila', async () => {
      const jobId = await queueService.addJob(1, {
        numeroNF: '123',
        transportadora: { nome: 'Teste' }
      });

      expect(jobId).toBeDefined();
      
      const queue = queueService.queues.get('transportadora_1');
      expect(queue).toHaveLength(1);
      expect(queue[0].data.numeroNF).toBe('123');
    });

    test('deve limpar fila', () => {
      queueService.createQueue(1);
      queueService.queues.get('transportadora_1').push({ id: 1 });
      
      const cleared = queueService.clearQueue(1);
      
      expect(cleared).toBe(1);
      expect(queueService.queues.get('transportadora_1')).toHaveLength(0);
    });
  });

  describe('Status Monitoring', () => {
    test('deve retornar status das filas', () => {
      queueService.createQueue(1);
      queueService.createQueue(2);
      
      const status = queueService.getQueueStatus();
      
      expect(status).toHaveProperty('transportadora_1');
      expect(status).toHaveProperty('transportadora_2');
      expect(status.transportadora_1.size).toBe(0);
      expect(status.transportadora_1.processing).toBe(false);
    });
  });
});

// ==========================================
// 3. TESTES - JOBS CONTROLLER
// ==========================================
// backend/tests/controllers/jobs.controller.test.js

const request = require('supertest');
const express = require('express');
const JobsController = require('../../src/controllers/jobs.controller');

describe('JobsController', () => {
  let app;
  let mockRepository;
  let mockScheduler;
  let controller;

  beforeEach(() => {
    mockRepository = {
      getJobStats: jest.fn(),
      getRecentIntegrations: jest.fn(),
      createApiToken: jest.fn(),
      deactivateApiTokens: jest.fn()
    };

    mockScheduler = {
      getStatus: jest.fn(),
      isRunning: false,
      runManual: jest.fn(),
      stop: jest.fn(),
      initialize: jest.fn(),
      reloadConfig: jest.fn(),
      queueService: {
        clearQueue: jest.fn()
      }
    };

    controller = new JobsController(mockRepository, mockScheduler);

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
    
    app.get('/status', (req, res) => controller.getStatus(req, res));
    app.post('/run', (req, res) => controller.runManual(req, res));
    app.post('/api-tokens', (req, res) => controller.setApiToken(req, res));
  });

  describe('GET /status', () => {
    test('deve retornar status dos jobs', async () => {
      mockScheduler.getStatus.mockReturnValue({
        running: false,
        config: { enabled: true }
      });
      
      mockRepository.getJobStats.mockResolvedValue({
        total_integracoes: 10,
        concluidas: 8
      });

      const response = await request(app).get('/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scheduler.running).toBe(false);
      expect(response.body.data.statistics.total_integracoes).toBe(10);
    });
  });

  describe('POST /run', () => {
    test('deve executar job manual', async () => {
      const response = await request(app).post('/run');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('iniciado manualmente');
    });

    test('deve falhar se job já estiver rodando', async () => {
      mockScheduler.isRunning = true;

      const response = await request(app).post('/run');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api-tokens', () => {
    test('deve criar token de API', async () => {
      mockRepository.deactivateApiTokens.mockResolvedValue();
      mockRepository.createApiToken.mockResolvedValue({
        id: 1,
        integracao: 'jamef',
        active: true
      });

      const response = await request(app)
        .post('/api-tokens')
        .send({
          integracao: 'jamef',
          token: 'test-token-123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integracao).toBe('jamef');
      expect(mockRepository.deactivateApiTokens).toHaveBeenCalledWith('jamef');
    });
  });
});



// ==========================================
// 5. EXEMPLO DE MONITORAMENTO PERSONALIZADO
// ==========================================
// examples/custom-monitoring.js

/**
 * Exemplo: Sistema de alertas personalizado
 */

const nodemailer = require('nodemailer');

class CustomAlertService {
  constructor(config) {
    this.emailTransporter = nodemailer.createTransporter(config.email);
    this.webhookUrl = config.webhookUrl;
    this.thresholds = config.thresholds;
  }

  // Verificar alertas personalizados
  async checkCustomAlerts(monitoringRepository) {
    const alerts = [];

    // Alerta: Taxa de erro acima do limite
    const errorRate = await this.checkErrorRate(monitoringRepository);
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: `Taxa de erro: ${errorRate}% (limite: ${this.thresholds.errorRate}%)`,
        value: errorRate
      });
    }

    // Alerta: NFs paradas há muito tempo
    const stuckNFs = await this.checkStuckNFs(monitoringRepository);
    if (stuckNFs > this.thresholds.stuckNFs) {
      alerts.push({
        type: 'STUCK_NFS',
        severity: 'WARNING',
        message: `${stuckNFs} NFs paradas há mais de 24h`,
        value: stuckNFs
      });
    }

    // Enviar alertas
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }

    return alerts;
  }

  async checkErrorRate(repository) {
    const stats = await repository.getPerformanceStats({ periodo: 1 });
    const latest = stats[stats.length - 1];
    
    if (!latest || latest.total_logs === 0) return 0;
    
    return (latest.erros / latest.total_logs) * 100;
  }

  async checkStuckNFs(repository) {
    const query = `
      SELECT COUNT(*) as stuck_count
      FROM notas_fiscais 
      WHERE finalizada = false 
        AND created_at < NOW() - INTERVAL '24 hours'
        AND (status_api IS NULL OR status_api != 'consultado_hoje')
    `;
    
    const result = await repository.database.query(query);
    return parseInt(result.rows[0].stuck_count);
  }

  async sendAlert(alert) {
    // Email
    if (this.emailTransporter) {
      await this.emailTransporter.sendMail({
        from: 'alerts@roadrw.com',
        to: 'admin@roadrw.com',
        subject: `[ROAD-RW] Alerta: ${alert.type}`,
        html: `
          <h3>Alerta do Sistema de Integração</h3>
          <p><strong>Tipo:</strong> ${alert.type}</p>
          <p><strong>Severidade:</strong> ${alert.severity}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `
      });
    }

    // Webhook
    if (this.webhookUrl) {
      await axios.post(this.webhookUrl, {
        ...alert,
        timestamp: new Date().toISOString(),
        source: 'road-rw-jobs'
      });
    }
  }
}

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