const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');
const { validateQuery } = require('../middlewares/validate.middleware');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Geração de relatórios
 */

// Import monitoring controller for report functionality
const MonitoringController = require('../controllers/monitoring.controller');
const MonitoringRepository = require('../repositories/monitoring.repository');

// Initialize controller with repository
const monitoringRepository = new MonitoringRepository();
const monitoringController = new MonitoringController(monitoringRepository);

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Exportar relatório
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema: { type: string, default: 'performance' }
 *       - in: query
 *         name: formato
 *         schema: { type: string, default: 'json' }
 *       - in: query
 *         name: periodo
 *         schema: { type: integer, default: 30 }
 *       - in: query
 *         name: transportadoraId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Relatório exportado com sucesso
 */
router.get('/export', auth, (req, res) => {
  monitoringController.exportReport(req, res);
});

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Dashboard de relatórios
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200:
 *         description: Dashboard recuperado com sucesso
 */
router.get('/dashboard', auth, (req, res) => {
  monitoringController.getDashboard(req, res);
});

module.exports = router;