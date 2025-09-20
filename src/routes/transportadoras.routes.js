const express = require('express');
const router = express.Router();

const TransportadorasController = require('../controllers/transportadoras.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createTransportadora,
  updateTransportadora,
  listTransportadoras,
  searchTransportadoras,
  transportadoraParams,
  cnpjParams,
  ufParams
} = require('../validations/transportadoras.validation');

const controller = new TransportadorasController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/transportadoras:
 *   get:
 *     summary: Listar transportadoras
 *     tags: [Transportadoras]
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
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtrar por nome
 *       - in: query
 *         name: uf
 *         schema:
 *           type: string
 *         description: Filtrar por UF
 *     responses:
 *       200:
 *         description: Lista de transportadoras
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listTransportadoras),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/search:
 *   get:
 *     summary: Buscar transportadoras por nome
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search',
  validateQuery(searchTransportadoras),
  controller.search.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/stats:
 *   get:
 *     summary: Estatísticas gerais de transportadoras
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/integration:
 *   get:
 *     summary: Listar transportadoras com integração ativa
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/integration',
  controller.getForIntegration.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/cnpj/{cnpj}:
 *   get:
 *     summary: Buscar transportadora por CNPJ
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/cnpj/:cnpj',
  validateParams(cnpjParams),
  controller.getByCnpj.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/uf/{uf}:
 *   get:
 *     summary: Buscar transportadoras por UF
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/uf/:uf',
  validateParams(ufParams),
  controller.getByUf.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/{id}:
 *   get:
 *     summary: Buscar transportadora por ID
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  validateParams(transportadoraParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras:
 *   post:
 *     summary: Criar nova transportadora
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cnpj
 *               - nome
 *               - endereco
 *               - municipio
 *               - uf
 *             properties:
 *               cnpj:
 *                 type: string
 *                 example: "11.222.333/0001-81"
 *               nome:
 *                 type: string
 *                 example: "Transportadora ABC Ltda"
 *               endereco:
 *                 type: string
 *                 example: "Rua das Flores, 123"
 *               municipio:
 *                 type: string
 *                 example: "São Paulo"
 *               uf:
 *                 type: string
 *                 example: "SP"
 */
router.post('/',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem criar
  validate(createTransportadora),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/{id}:
 *   put:
 *     summary: Atualizar transportadora
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem editar
  validateParams(transportadoraParams),
  validate(updateTransportadora),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/{id}:
 *   delete:
 *     summary: Deletar transportadora
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  authorize(['admin']), // Apenas admin pode deletar
  validateParams(transportadoraParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/transportadoras/{id}/restore:
 *   post:
 *     summary: Restaurar transportadora deletada
 *     tags: [Transportadoras]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/restore',
  authorize(['admin']), // Apenas admin pode restaurar
  validateParams(transportadoraParams),
  controller.restore.bind(controller)
);

module.exports = router;