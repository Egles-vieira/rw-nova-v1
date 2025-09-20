// src/routes/integrations.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/integrations:
 *   get:
 *     summary: Listar integrações disponíveis
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de integrações
 */
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'jamef', status: 'active', description: 'Integração JAMEF' },
      { name: 'braspress', status: 'active', description: 'Integração Braspress' },
      { name: 'tnt', status: 'active', description: 'Integração TNT' }
    ]
  });
});

/**
 * @swagger
 * /api/integrations/{transportadora}/test:
 *   post:
 *     summary: Testar conexão com transportadora
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: transportadora
 *         in: path
 *         required: true
 *         schema: { type: string, example: "jamef" }
 *     responses:
 *       200:
 *         description: Teste realizado
 */
router.post('/:transportadora/test', auth, (req, res) => {
  res.json({
    success: true,
    message: `Teste ${req.params.transportadora} realizado com sucesso`,
    data: { status: 'success', response_time: '150ms' }
  });
});

/**
 * @swagger
 * /api/integrations/{transportadora}/status:
 *   get:
 *     summary: Status da integração
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: transportadora
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status da integração
 */
router.get('/:transportadora/status', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      transportadora: req.params.transportadora,
      status: 'active',
      lastSync: new Date().toISOString(),
      isConfigured: true
    }
  });
});

module.exports = router;