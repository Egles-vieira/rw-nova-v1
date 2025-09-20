
// ROTAS SIMPLIFICADAS
// ==========================================
// backend/src/routes/webhook-external.routes.js (ATUALIZADO)

const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhook.controller');
const webhookAuth = require('../middlewares/webhook-auth.middleware');

const controller = new WebhookController();

/**
 * @swagger
 * /api/webhooks/{transportadora}:
 *   post:
 *     summary: Webhook unificado usando IntegrationFactory existente
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: transportadora
 *         required: true
 *         schema: { type: string }
 *         description: Nome da transportadora (jamef, braspress, tnt, etc.)
 *     responses:
 *       200:
 *         description: Dados processados usando service de integração existente
 */
router.post('/:transportadora', 
  webhookAuth.validateByTransportadora,
  controller.handleTransportadoraWebhook.bind(controller)
);

/**
 * @swagger
 * /api/webhooks/status:
 *   get:
 *     summary: Status dos webhooks e integration services
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Status mostrando integration services disponíveis
 */
router.get('/status', controller.getStatus.bind(controller));

module.exports = router;