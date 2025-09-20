// routes/transportadora-codigo-ocorrencia.routes.js
const express = require('express');
const router = express.Router();

const TransportadoraCodigoOcorrenciaController = require('../controllers/transportadora-codigo-ocorrencia.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createVinculo, createMultipleVinculos, listVinculos,
  vinculoParams, transportadoraParams, codigoOcorrenciaParams
} = require('../validations/transportadora-codigo-ocorrencia.validation');

const controller = new TransportadoraCodigoOcorrenciaController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia:
 *   get:
 *     summary: Listar vínculos transportadora-código
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: transportadora_id
 *         schema:
 *           type: integer
 *         description: Filtrar por transportadora
 *       - in: query
 *         name: codigo_ocorrencia_codigo
 *         schema:
 *           type: integer
 *         description: Filtrar por código de ocorrência
 *     responses:
 *       200:
 *         description: Lista de vínculos
 */
router.get('/',
  validateQuery(listVinculos),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/stats:
 *   get:
 *     summary: Estatísticas dos vínculos
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas dos vínculos
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/transportadora/{transportadoraId}:
 *   get:
 *     summary: Buscar códigos por transportadora
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transportadoraId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da transportadora
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
 *     responses:
 *       200:
 *         description: Códigos da transportadora
 */
router.get('/transportadora/:transportadoraId',
  validateParams(transportadoraParams),
  controller.getByTransportadora.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/codigo-ocorrencia/{codigoOcorrencia}:
 *   get:
 *     summary: Buscar transportadoras por código de ocorrência
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigoOcorrencia
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código da ocorrência
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
 *     responses:
 *       200:
 *         description: Transportadoras do código
 */
router.get('/codigo-ocorrencia/:codigoOcorrencia',
  validateParams(codigoOcorrenciaParams),
  controller.getByCodigoOcorrencia.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/transportadora/{transportadoraId}/codigo-ocorrencia/{codigoOcorrencia}:
 *   get:
 *     summary: Buscar vínculo específico
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transportadoraId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da transportadora
 *       - in: path
 *         name: codigoOcorrencia
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código da ocorrência
 *     responses:
 *       200:
 *         description: Vínculo encontrado
 *       404:
 *         description: Vínculo não encontrado
 */
router.get('/transportadora/:transportadoraId/codigo-ocorrencia/:codigoOcorrencia',
  validateParams(transportadoraParams.rename('id', 'transportadoraId')),
  validateParams(codigoOcorrenciaParams),
  controller.getVinculo.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/multiple:
 *   post:
 *     summary: Criar múltiplos vínculos
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vinculos
 *             properties:
 *               vinculos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - transportadora_id
 *                     - codigo_ocorrencia_codigo
 *                     - codigo
 *                   properties:
 *                     transportadora_id:
 *                       type: integer
 *                       example: 1
 *                     codigo_ocorrencia_codigo:
 *                       type: integer
 *                       example: 123
 *                     codigo:
 *                       type: integer
 *                       example: 123
 *                     descricao:
 *                       type: string
 *                       example: "Descrição personalizada"
 *     responses:
 *       201:
 *         description: Vínculos criados
 */
router.post('/multiple',
  authorize(['admin', 'gestor']),
  validate(createMultipleVinculos),
  controller.createMultiple.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia:
 *   post:
 *     summary: Criar vínculo
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transportadora_id
 *               - codigo_ocorrencia_codigo
 *               - codigo
 *             properties:
 *               transportadora_id:
 *                 type: integer
 *                 example: 1
 *               codigo_ocorrencia_codigo:
 *                 type: integer
 *                 example: 123
 *               codigo:
 *                 type: integer
 *                 example: 123
 *               descricao:
 *                 type: string
 *                 example: "Descrição personalizada"
 *     responses:
 *       201:
 *         description: Vínculo criado
 */
router.post('/',
  authorize(['admin', 'gestor']),
  validate(createVinculo),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/{id}:
 *   put:
 *     summary: Atualizar vínculo
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do vínculo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transportadora_id:
 *                 type: integer
 *               codigo_ocorrencia_codigo:
 *                 type: integer
 *               codigo:
 *                 type: integer
 *               descricao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vínculo atualizado
 */
router.put('/:id',
  authorize(['admin', 'gestor']),
  validateParams(vinculoParams),
  validate(createVinculo),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/{id}:
 *   delete:
 *     summary: Deletar vínculo
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do vínculo
 *     responses:
 *       200:
 *         description: Vínculo deletado
 */
router.delete('/:id',
  authorize(['admin', 'gestor']),
  validateParams(vinculoParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/transportadora/{transportadoraId}:
 *   delete:
 *     summary: Deletar vínculos por transportadora
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transportadoraId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da transportadora
 *     responses:
 *       200:
 *         description: Vínculos deletados
 */
router.delete('/transportadora/:transportadoraId',
  authorize(['admin', 'gestor']),
  validateParams(transportadoraParams),
  controller.deleteByTransportadora.bind(controller)
);

/**
 * @swagger
 * /api/transportadora-codigo-ocorrencia/codigo-ocorrencia/{codigoOcorrencia}:
 *   delete:
 *     summary: Deletar vínculos por código de ocorrência
 *     tags: [Transportadora-Código Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigoOcorrencia
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código da ocorrência
 *     responses:
 *       200:
 *         description: Vínculos deletados
 */
router.delete('/codigo-ocorrencia/:codigoOcorrencia',
  authorize(['admin', 'gestor']),
  validateParams(codigoOcorrenciaParams),
  controller.deleteByCodigoOcorrencia.bind(controller)
);

module.exports = router;