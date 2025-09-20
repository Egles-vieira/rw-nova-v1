const express = require('express');
const router = express.Router();
const Joi = require('joi');

const CodigoOcorrenciasController = require('../controllers/codigo-ocorrencias.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createCodigoOcorrencia,
  updateCodigoOcorrencia,
  listCodigoOcorrencias,
  codigoOcorrenciaParams
} = require('../validations/codigo-ocorrencias.validation');

const controller = new CodigoOcorrenciasController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/codigos-ocorrencia:
 *   get:
 *     summary: Listar códigos de ocorrência
 *     tags: [Códigos de Ocorrência]
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
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [entrega, coleta, incidente, informativo]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: processo
 *         schema:
 *           type: string
 *           enum: [pre-entrega, em-entrega, pos-entrega, administrativo]
 *         description: Filtrar por processo
 *       - in: query
 *         name: finalizadora
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por finalizadora
 *       - in: query
 *         name: api
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por disponibilidade na API
 *     responses:
 *       200:
 *         description: Lista de códigos de ocorrência
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listCodigoOcorrencias),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/{id}:
 *   get:
 *     summary: Buscar código de ocorrência por ID
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do código de ocorrência
 *     responses:
 *       200:
 *         description: Código de ocorrência encontrado
 *       404:
 *         description: Código de ocorrência não encontrado
 */
router.get('/:id',
  validateParams(codigoOcorrenciaParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/codigo/{codigo}:
 *   get:
 *     summary: Buscar código de ocorrência por código numérico
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código numérico da ocorrência
 *     responses:
 *       200:
 *         description: Código de ocorrência encontrado
 *       404:
 *         description: Código de ocorrência não encontrado
 */
router.get('/codigo/:codigo',
  validateParams(Joi.object({ codigo: Joi.number().integer().positive().required() })),
  controller.getByCodigo.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia:
 *   post:
 *     summary: Criar novo código de ocorrência
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - descricao
 *               - tipo
 *               - processo
 *             properties:
 *               codigo:
 *                 type: integer
 *                 example: 1
 *               descricao:
 *                 type: string
 *                 example: "Mercadoria entregue com sucesso"
 *               tipo:
 *                 type: string
 *                 enum: [entrega, coleta, incidente, informativo]
 *                 example: "entrega"
 *               processo:
 *                 type: string
 *                 enum: [pre-entrega, em-entrega, pos-entrega, administrativo]
 *                 example: "em-entrega"
 *               finalizadora:
 *                 type: boolean
 *                 example: true
 *               api:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Código de ocorrência criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Código já existe
 */
router.post('/',
  authorize(['admin', 'gestor']),
  validate(createCodigoOcorrencia),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/{id}:
 *   put:
 *     summary: Atualizar código de ocorrência
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do código de ocorrência
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo:
 *                 type: integer
 *                 example: 1
 *               descricao:
 *                 type: string
 *                 example: "Mercadoria entregue com sucesso"
 *               tipo:
 *                 type: string
 *                 enum: [entrega, coleta, incidente, informativo]
 *                 example: "entrega"
 *               processo:
 *                 type: string
 *                 enum: [pre-entrega, em-entrega, pos-entrega, administrativo]
 *                 example: "em-entrega"
 *               finalizadora:
 *                 type: boolean
 *                 example: true
 *               api:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Código de ocorrência atualizado com sucesso
 *       404:
 *         description: Código de ocorrência não encontrado
 *       409:
 *         description: Código já existe
 */
router.put('/:id',
  authorize(['admin', 'gestor']),
  validateParams(codigoOcorrenciaParams),
  validate(updateCodigoOcorrencia),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/{id}:
 *   delete:
 *     summary: Deletar código de ocorrência
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do código de ocorrência
 *     responses:
 *       200:
 *         description: Código de ocorrência deletado com sucesso
 *       404:
 *         description: Código de ocorrência não encontrado
 *       409:
 *         description: Código está em uso e não pode ser deletado
 */
router.delete('/:id',
  authorize(['admin']),
  validateParams(codigoOcorrenciaParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/{id}/restore:
 *   post:
 *     summary: Restaurar código de ocorrência deletado
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do código de ocorrência
 *     responses:
 *       200:
 *         description: Código de ocorrência restaurado com sucesso
 *       404:
 *         description: Código de ocorrência não encontrado
 */
router.post('/:id/restore',
  authorize(['admin']),
  validateParams(codigoOcorrenciaParams),
  controller.restore.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/tipos:
 *   get:
 *     summary: Listar tipos de ocorrência disponíveis
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de ocorrência
 */
router.get('/tipos',
  controller.getTipos.bind(controller)
);

/**
 * @swagger
 * /api/codigos-ocorrencia/processos:
 *   get:
 *     summary: Listar processos disponíveis
 *     tags: [Códigos de Ocorrência]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de processos
 */
router.get('/processos',
  controller.getProcessos.bind(controller)
);

module.exports = router;