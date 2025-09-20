// ==========================================
// 1. WEBHOOK ROUTES - Arquivo Principal
// ==========================================
// backend/src/routes/webhook.routes.js

const express = require('express');
const router = express.Router();

const WebhookController = require('../controllers/webhook.controller');
const { validate } = require('../middlewares/validate.middleware');
const logger = require('../config/logger');

// Schemas de validação
const {
  webhookNotaFiscalSchema,
  webhookOcorrenciasSchema
} = require('../validations/webhook.validation');

const controller = new WebhookController();

/**
 * @swagger
 * tags:
 *   name: Webhook
 *   description: Endpoints para receber dados via webhook
 */

/**
 * @swagger
 * /api/webhook/notafiscal:
 *   post:
 *     summary: Receber dados de nota fiscal via webhook
 *     tags: [Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notfis:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nro_nf:
 *                       type: string
 *                     serie_nf:
 *                       type: string
 *                     valor_nf:
 *                       type: number
 *                     peso_nf:
 *                       type: number
 *                     cliente:
 *                       type: object
 *                       properties:
 *                         nome:
 *                           type: string
 *                         cnpj:
 *                           type: string
 *                         endereco:
 *                           type: string
 *                         municipio:
 *                           type: string
 *                         uf:
 *                           type: string
 *     responses:
 *       200:
 *         description: Dados processados com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/notafiscal',
  validate(webhookNotaFiscalSchema),
  controller.receiveNotaFiscal.bind(controller)
);

/**
 * @swagger
 * /api/webhook/ocorrencias:
 *   post:
 *     summary: Receber ocorrências de tracking via webhook
 *     tags: [Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ocorrencias:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nro_nf:
 *                       type: string
 *                     codigo:
 *                       type: string
 *                     descricao:
 *                       type: string
 *                     data_ocorrencia:
 *                       type: string
 *                       format: date-time
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     linkComprovante:
 *                       type: string
 *     responses:
 *       200:
 *         description: Ocorrências processadas com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Nota fiscal não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/ocorrencias',
  validate(webhookOcorrenciasSchema),
  controller.receiveOcorrencias.bind(controller)
);

/**
 * @swagger
 * /api/webhook/status:
 *   get:
 *     summary: Verificar status do webhook
 *     tags: [Webhook]
 *     responses:
 *       200:
 *         description: Status do webhook
 */
router.get('/status', controller.getStatus.bind(controller));

// Middleware de log para todas as requisições do webhook
router.use((req, res, next) => {
  logger.info('Webhook request received', {
    method: req.method,
    url: req.originalUrl,
    body: req.body ? Object.keys(req.body) : null,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

module.exports = router;