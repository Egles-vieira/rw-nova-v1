// src/routes/external-apis.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/external-apis/tokens:
 *   get:
 *     summary: Listar tokens de API
 *     tags: [External APIs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de tokens
 */
router.get('/tokens', auth, (req, res) => {
  res.json({
    success: true,
    data: [
      { integracao: 'jamef', active: true, created_at: new Date().toISOString() },
      { integracao: 'braspress', active: false, created_at: new Date().toISOString() },
      { integracao: 'tnt', active: true, created_at: new Date().toISOString() }
    ]
  });
});

/**
 * @swagger
 * /api/external-apis/settings:
 *   get:
 *     summary: Configurações das APIs
 *     tags: [External APIs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configurações
 */
router.get('/settings', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      pollInterval: 300,
      concurrentJobs: 3,
      rateLimits: {
        jamef: { requests: 100, per: 'minute' },
        braspress: { requests: 500, per: 'hour' },
        tnt: { requests: 200, per: 'minute' }
      }
    }
  });
});

module.exports = router;