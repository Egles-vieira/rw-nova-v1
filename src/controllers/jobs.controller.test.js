
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