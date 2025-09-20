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
