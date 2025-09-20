// ==========================================
// 2. MONITORING ROUTES
// ==========================================
// backend/src/routes/monitoring.routes.js

const express = require('express');

// Middlewares
const { validateBody, validateParams, validateQuery } = require('../middlewares/validate.middleware');

// Middleware de injeção de controllers
const injectMonitoringControllers = require('../middlewares/monitoring.middleware');

// Validações
const {
  dashboardValidation,
  transportadoraMetricsValidation,
  performanceStatsValidation,
  logsFilterValidation,
  exportReportValidation,
  monitoringConfigValidation
} = require('../validations/monitoring.validation');

/**
 * Exporta uma fábrica de router para permitir injeção do jobManager.
 */
module.exports = (jobManager) => {
  const router = express.Router();

  // ✅ Importe a função de autenticação e use a função (não o objeto)
  const { authenticate: auth } = require('../middlewares/auth.middleware');

  // Aplicar autenticação a todas as rotas
  router.use(auth);

  // ✅ Injeta controllers de monitoring em req (depende do jobManager)
  router.use(injectMonitoringControllers(jobManager));

  /**
   * @swagger
   * tags:
   *   name: Monitoring
   *   description: Monitoramento e dashboards
   */

  router.get('/dashboard',
    validateQuery(dashboardValidation),
    (req, res) => req.monitoringController.getDashboard(req, res)
  );

  router.get('/transportadora/:transportadoraId/metrics',
    validateParams(transportadoraMetricsValidation.params),
    validateQuery(transportadoraMetricsValidation.query),
    (req, res) => req.monitoringController.getTransportadoraMetrics(req, res)
  );

  router.get('/performance',
    validateQuery(performanceStatsValidation),
    (req, res) => req.monitoringController.getPerformanceStats(req, res)
  );

  router.get('/health',
    (req, res) => req.monitoringController.getHealthReport(req, res)
  );

  router.get('/logs',
    validateQuery(logsFilterValidation),
    (req, res) => req.monitoringController.getLogs(req, res)
  );

  router.get('/alerts',
    (req, res) => req.monitoringController.getActiveAlerts(req, res)
  );

  router.get('/nf-status',
    (req, res) => req.monitoringController.getNFStatusSummary(req, res)
  );

  router.get('/export',
    validateQuery(exportReportValidation),
    (req, res) => req.monitoringController.exportReport(req, res)
  );

  router.get('/config',
    (req, res) => req.monitoringController.getMonitoringConfig(req, res)
  );

  router.put('/config',
    validateBody(monitoringConfigValidation),
    (req, res) => req.monitoringController.updateMonitoringConfig(req, res)
  );

  return router;
};
