// ==========================================
// backend/src/routes/jobs.routes.js
// ==========================================
const { Router } = require('express');

// Middlewares
const { authenticate: auth } = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validate.middleware');
const { injectJobControllers } = require('../middlewares/jobs.middleware');

// Validações
const {
  runJobValidation,
  apiTokenValidation,
  integrationLogsValidation,
  processTransportadoraValidation,
  queueValidation
} = require('../validations/jobs.validation');

/**
 * Exporta uma fábrica de router para permitir injeção do jobManager.
 * No server.js: app.use('/api/jobs', require('./src/routes/jobs.routes')(jobManager));
 */
module.exports = (jobManager) => {
  const router = Router();

  // Injeta controllers de jobs em req (depende do jobManager)
  router.use(injectJobControllers(jobManager));

  /**
   * @swagger
   * tags:
   *   name: Jobs
   *   description: Gerenciamento de jobs de integração
   */

  /**
   * @swagger
   * /api/jobs/status:
   *   get:
   *     summary: Obter status geral dos jobs
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Status recuperado com sucesso
   */
  router.get('/status', auth, (req, res) => req.jobsController.getStatus(req, res));

  /**
   * @swagger
   * /api/jobs/run:
   *   post:
   *     summary: Executar job manualmente
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               transportadoraId: { type: integer, example: 1 }
   *               force: { type: boolean, example: false }
   *     responses:
   *       200:
   *         description: Job iniciado com sucesso
   */
  router.post('/run',
    auth,
    validateBody(runJobValidation),
    (req, res) => req.jobsController.runManual(req, res)
  );

  /**
   * @swagger
   * /api/jobs/stop:
   *   post:
   *     summary: Parar jobs
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Jobs parados com sucesso
   */
  router.post('/stop', auth, (req, res) => req.jobsController.stop(req, res));

  /**
   * @swagger
   * /api/jobs/restart:
   *   post:
   *     summary: Reiniciar jobs
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Jobs reiniciados com sucesso
   */
  router.post('/restart', auth, (req, res) => req.jobsController.restart(req, res));

  /**
   * @swagger
   * /api/jobs/reload-config:
   *   post:
   *     summary: Recarregar configurações
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Configurações recarregadas com sucesso
   */
  router.post('/reload-config', auth, (req, res) => req.jobsController.reloadConfig(req, res));

  /**
   * @swagger
   * /api/jobs/integrations:
   *   get:
   *     summary: Listar integrações recentes
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *       - in: query
   *         name: dias
   *         schema: { type: integer, default: 7 }
   *     responses:
   *       200:
   *         description: Lista de integrações recuperada com sucesso
   */
  router.get('/integrations',
    auth,
    validateQuery(integrationLogsValidation.query),
    (req, res) => req.jobsController.getIntegrations(req, res)
  );

  /**
   * @swagger
   * /api/jobs/integrations/{integracaoId}/logs:
   *   get:
   *     summary: Obter logs de uma integração
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: integracaoId
   *         required: true
   *         schema: { type: integer }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Logs recuperados com sucesso
   */
  router.get('/integrations/:integracaoId/logs',
    auth,
    validateParams(integrationLogsValidation.params),
    validateQuery(integrationLogsValidation.query),
    (req, res) => req.jobsController.getIntegrationLogs(req, res)
  );

  /**
   * @swagger
   * /api/jobs/transportadora/{transportadoraId}/process:
   *   post:
   *     summary: Processar transportadora específica
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: transportadoraId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Transportadora processada com sucesso
   */
  router.post('/transportadora/:transportadoraId/process',
    auth,
    validateParams(processTransportadoraValidation),
    (req, res) => req.jobsController.processTransportadora(req, res)
  );

  /**
   * @swagger
   * /api/jobs/transportadora/{transportadoraId}/queue/clear:
   *   delete:
   *     summary: Limpar fila de uma transportadora
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: transportadoraId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Fila limpa com sucesso
   */
  router.delete('/transportadora/:transportadoraId/queue/clear',
    auth,
    validateParams(queueValidation),
    (req, res) => req.jobsController.clearQueue(req, res)
  );

  /**
   * @swagger
   * /api/jobs/api-tokens:
   *   get:
   *     summary: Listar tokens de API
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Tokens listados com sucesso
   */
  router.get('/api-tokens', auth, (req, res) => req.jobsController.getApiTokens(req, res));

  /**
   * @swagger
   * /api/jobs/api-tokens:
   *   post:
   *     summary: Configurar token de API
   *     tags: [Jobs]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [integracao, token]
   *             properties:
   *               integracao: { type: string, example: jamef }
   *               token: { type: string }
   *               expiresAt: { type: string, format: date-time }
   *     responses:
   *       200:
   *         description: Token configurado com sucesso
   */
  router.post('/api-tokens',
    auth,
    validateBody(apiTokenValidation),
    (req, res) => req.jobsController.setApiToken(req, res)
  );

  return router;
};
