// routes/nota-fiscal-ocorrencias.routes.js
const express = require('express');
const router = express.Router();

const NotaFiscalOcorrenciasController = require('../controllers/nota-fiscal-ocorrencias.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  listOcorrenciasNotaFiscal,
  createOcorrenciaNotaFiscal,
  updateOcorrenciaNotaFiscal,
  notaFiscalParams,
  notaFiscalCodigoParams,
  notaFiscalOcorrenciaParams
} = require('../validations/nota-fiscal-ocorrencias.validation');

const controller = new NotaFiscalOcorrenciasController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias:
 *   get:
 *     summary: Listar ocorrências de uma nota fiscal
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Limite de registros por página
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [id, dataHoraEvento, dataHoraEnvio, codigo]
 *         description: Campo para ordenação
 *       - in: query
 *         name: orderDirection
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Direção da ordenação
 *     responses:
 *       200:
 *         description: Lista de ocorrências da nota fiscal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     nota_fiscal:
 *                       type: object
 *                     ocorrencias:
 *                       type: array
 *                     total_ocorrencias:
 *                       type: integer
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.get('/:nroNf/ocorrencias',
  validateParams(notaFiscalParams),
  validateQuery(listOcorrenciasNotaFiscal),
  controller.getOcorrenciasByNotaFiscal.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias/ultima:
 *   get:
 *     summary: Buscar última ocorrência de uma nota fiscal
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *     responses:
 *       200:
 *         description: Última ocorrência encontrada
 *       404:
 *         description: Nota fiscal ou ocorrência não encontrada
 */
router.get('/:nroNf/ocorrencias/ultima',
  validateParams(notaFiscalParams),
  controller.getLastOcorrenciaByNotaFiscal.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias/stats:
 *   get:
 *     summary: Estatísticas de ocorrências de uma nota fiscal
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *     responses:
 *       200:
 *         description: Estatísticas calculadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     nota_fiscal:
 *                       type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total_ocorrencias:
 *                           type: integer
 *                         primeira_ocorrencia:
 *                           type: object
 *                         ultima_ocorrencia:
 *                           type: object
 *                         status_atual:
 *                           type: string
 *                         finalizadora:
 *                           type: boolean
 *                         por_codigo:
 *                           type: array
 *                         timeline:
 *                           type: array
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.get('/:nroNf/ocorrencias/stats',
  validateParams(notaFiscalParams),
  controller.getOcorrenciasStats.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias/codigo/{codigo}:
 *   get:
 *     summary: Buscar ocorrências de uma nota fiscal por código
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código da ocorrência
 *     responses:
 *       200:
 *         description: Ocorrências encontradas
 *       404:
 *         description: Nota fiscal ou ocorrências não encontradas
 */
router.get('/:nroNf/ocorrencias/codigo/:codigo',
  validateParams(notaFiscalCodigoParams),
  controller.getOcorrenciasByNotaFiscalAndCodigo.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias:
 *   post:
 *     summary: Criar nova ocorrência para uma nota fiscal
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - descricao
 *               - dataHoraEnvio
 *             properties:
 *               codigo:
 *                 type: integer
 *                 example: 4
 *               descricao:
 *                 type: string
 *                 example: "Entregue ao destinatário"
 *               dataHoraEnvio:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-17T10:30:00.000Z"
 *               dataHoraEvento:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-17T09:15:00.000Z"
 *               complemento:
 *                 type: string
 *                 example: "Entrega realizada com sucesso"
 *               nomeRecebedor:
 *                 type: string
 *                 example: "João Silva"
 *               docRecebedor:
 *                 type: string
 *                 example: "12345678901"
 *               latitude:
 *                 type: number
 *                 example: -23.5505
 *               longitude:
 *                 type: number
 *                 example: -46.6333
 *               linkComprovante:
 *                 type: string
 *                 format: uri
 *                 example: "https://exemplo.com/comprovante/123456"
 *     responses:
 *       201:
 *         description: Ocorrência criada com sucesso
 *       404:
 *         description: Nota fiscal não encontrada
 *       409:
 *         description: Ocorrência já existe
 */
router.post('/:nroNf/ocorrencias',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(notaFiscalParams),
  validate(createOcorrenciaNotaFiscal),
  controller.createOcorrenciaForNotaFiscal.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias/{ocorrenciaId}:
 *   put:
 *     summary: Atualizar ocorrência específica
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *       - in: path
 *         name: ocorrenciaId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da ocorrência
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descricao:
 *                 type: string
 *               complemento:
 *                 type: string
 *               nomeRecebedor:
 *                 type: string
 *               docRecebedor:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               linkComprovante:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [waiting, running, finished]
 *     responses:
 *       200:
 *         description: Ocorrência atualizada com sucesso
 *       404:
 *         description: Nota fiscal ou ocorrência não encontrada
 *       400:
 *         description: Ocorrência não pertence à nota fiscal
 */
router.put('/:nroNf/ocorrencias/:ocorrenciaId',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(notaFiscalOcorrenciaParams),
  validate(updateOcorrenciaNotaFiscal),
  controller.updateOcorrencia.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{nroNf}/ocorrencias/{ocorrenciaId}:
 *   delete:
 *     summary: Excluir ocorrência específica
 *     tags: [Ocorrencias por nota fiscal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nroNf
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *       - in: path
 *         name: ocorrenciaId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da ocorrência
 *     responses:
 *       200:
 *         description: Ocorrência excluída com sucesso
 *       404:
 *         description: Nota fiscal ou ocorrência não encontrada
 *       400:
 *         description: Ocorrência não pertence à nota fiscal
 */
router.delete('/:nroNf/ocorrencias/:ocorrenciaId',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem excluir
  validateParams(notaFiscalOcorrenciaParams),
  controller.deleteOcorrencia.bind(controller)
);

module.exports = router;