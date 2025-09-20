// routes/ocorrencias.routes.js
const express = require('express');
const router = express.Router();

const OcorrenciasController = require('../controllers/ocorrencias.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createOcorrencia, updateOcorrencia, listOcorrencias,
  ocorrenciaParams, codigoParams, tipoParams, processoParams
} = require('../validations/ocorrencias.validation');

const controller = new OcorrenciasController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/ocorrencias:
 *   get:
 *     summary: Listar códigos de ocorrência
 *     tags: [Ocorrências]
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
 *           enum: [entrega, coleta, ocorrencia, status, informativo]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: processo
 *         schema:
 *           type: string
 *           enum: [transporte, entrega, coleta, finalizacao, cancelamento, informativo]
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
 *         description: Filtrar por status API
 *     responses:
 *       200:
 *         description: Lista de códigos de ocorrência
 */
router.get('/',
  validateQuery(listOcorrencias),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/stats:
 *   get:
 *     summary: Estatísticas dos códigos de ocorrência
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas dos códigos
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/search:
 *   get:
 *     summary: Buscar códigos por descrição
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Limite de resultados
 *     responses:
 *       200:
 *         description: Resultados da busca
 */
router.get('/search',
  controller.search.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/finalizadoras:
 *   get:
 *     summary: Buscar códigos finalizadores
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Códigos finalizadores
 */
router.get('/finalizadoras',
  controller.getFinalizadoras.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/ativas-api:
 *   get:
 *     summary: Buscar códigos ativos para API
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Códigos ativos para API
 */
router.get('/ativas-api',
  controller.getAtivasApi.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/codigo/{codigo}:
 *   get:
 *     summary: Buscar código de ocorrência por código
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código da ocorrência
 *     responses:
 *       200:
 *         description: Código de ocorrência encontrado
 *       404:
 *         description: Código não encontrado
 */
router.get('/codigo/:codigo',
  validateParams(codigoParams),
  controller.getByCodigo.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/tipo/{tipo}:
 *   get:
 *     summary: Buscar códigos por tipo
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema:
 *           type: string
 *           enum: [entrega, coleta, ocorrencia, status, informativo]
 *         description: Tipo de ocorrência
 *     responses:
 *       200:
 *         description: Códigos do tipo especificado
 */
router.get('/tipo/:tipo',
  validateParams(tipoParams),
  controller.getByTipo.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/processo/{processo}:
 *   get:
 *     summary: Buscar códigos por processo
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processo
 *         required: true
 *         schema:
 *           type: string
 *           enum: [transporte, entrega, coleta, finalizacao, cancelamento, informativo]
 *         description: Processo da ocorrência
 *     responses:
 *       200:
 *         description: Códigos do processo especificado
 */
router.get('/processo/:processo',
  validateParams(processoParams),
  controller.getByProcesso.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/{id}:
 *   get:
 *     summary: Buscar código de ocorrência por ID
 *     tags: [Ocorrências]
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
 *         description: Código não encontrado
 */
router.get('/:id',
  validateParams(ocorrenciaParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias:
 *   post:
 *     summary: Criar novo código de ocorrência
 *     tags: [Ocorrências]
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
 *                 example: 123
 *               descricao:
 *                 type: string
 *                 example: "Entrega realizada com sucesso"
 *               tipo:
 *                 type: string
 *                 enum: [entrega, coleta, ocorrencia, status, informativo]
 *                 example: "entrega"
 *               processo:
 *                 type: string
 *                 enum: [transporte, entrega, coleta, finalizacao, cancelamento, informativo]
 *                 example: "entrega"
 *               finalizadora:
 *                 type: boolean
 *                 example: true
 *               api:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Código de ocorrência criado
 */
router.post('/',
  authorize(['admin', 'gestor']),
  validate(createOcorrencia),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/{id}/toggle-api:
 *   patch:
 *     summary: Ativar/desativar para API
 *     tags: [Ocorrências]
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
 *         description: Status da API atualizado
 */
router.patch('/:id/toggle-api',
  authorize(['admin', 'gestor']),
  validateParams(ocorrenciaParams),
  controller.toggleApi.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/{id}/toggle-finalizadora:
 *   patch:
 *     summary: Marcar/desmarcar como finalizadora
 *     tags: [Ocorrências]
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
 *         description: Status finalizadora atualizado
 */
router.patch('/:id/toggle-finalizadora',
  authorize(['admin', 'gestor']),
  validateParams(ocorrenciaParams),
  controller.toggleFinalizadora.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/{id}:
 *   put:
 *     summary: Atualizar código de ocorrência
 *     tags: [Ocorrências]
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
 *               descricao:
 *                 type: string
 *               tipo:
 *                 type: string
 *                 enum: [entrega, coleta, ocorrencia, status, informativo]
 *               processo:
 *                 type: string
 *                 enum: [transporte, entrega, coleta, finalizacao, cancelamento, informativo]
 *               finalizadora:
 *                 type: boolean
 *               api:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Código de ocorrência atualizado
 */
router.put('/:id',
  authorize(['admin', 'gestor']),
  validateParams(ocorrenciaParams),
  validate(updateOcorrencia),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/ocorrencias/{id}:
 *   delete:
 *     summary: Deletar código de ocorrência
 *     tags: [Ocorrências]
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
 *         description: Código de ocorrência deletado
 *       409:
 *         description: Não é possível deletar código vinculado a transportadoras
 */
router.delete('/:id',
  authorize(['admin']),
  validateParams(ocorrenciaParams),
  controller.delete.bind(controller)
);

module.exports = router;