const express = require('express');
const router = express.Router();

const EmbarcadoresController = require('../controllers/embarcadores.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createEmbarcador,
  updateEmbarcador,
  listEmbarcadores,
  searchEmbarcadores,
  embarcadorParams,
  documentoParams,
  ufParams,
  cidadeParams
} = require('../validations/embarcadores.validation');

const controller = new EmbarcadoresController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/embarcadores:
 *   get:
 *     summary: Listar embarcadores
 *     tags: [Embarcadores]
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
 *         name: documento
 *         schema:
 *           type: string
 *         description: Filtrar por CNPJ
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *         description: Filtrar por cidade
 *       - in: query
 *         name: uf
 *         schema:
 *           type: string
 *         description: Filtrar por UF
 *     responses:
 *       200:
 *         description: Lista de embarcadores
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listEmbarcadores),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/search:
 *   get:
 *     summary: Buscar embarcadores por nome
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
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
 *         description: Lista de embarcadores encontrados
 */
router.get('/search',
  validateQuery(searchEmbarcadores),
  controller.search.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/stats:
 *   get:
 *     summary: Estatísticas gerais de embarcadores
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de embarcadores
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/documento/{documento}:
 *   get:
 *     summary: Buscar embarcador por CNPJ
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documento
 *         required: true
 *         schema:
 *           type: string
 *         description: CNPJ do embarcador
 *     responses:
 *       200:
 *         description: Embarcador encontrado
 *       404:
 *         description: Embarcador não encontrado
 */
router.get('/documento/:documento',
  validateParams(documentoParams),
  controller.getByDocumento.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/uf/{uf}:
 *   get:
 *     summary: Buscar embarcadores por UF
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uf
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}$'
 *         description: UF (estado)
 *     responses:
 *       200:
 *         description: Lista de embarcadores da UF
 */
router.get('/uf/:uf',
  validateParams(ufParams),
  controller.getByUf.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/cidade/{cidade}:
 *   get:
 *     summary: Buscar embarcadores por cidade
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cidade
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da cidade
 *     responses:
 *       200:
 *         description: Lista de embarcadores da cidade
 */
router.get('/cidade/:cidade',
  validateParams(cidadeParams),
  controller.getByCidade.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/{id}:
 *   get:
 *     summary: Buscar embarcador por ID
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do embarcador
 *     responses:
 *       200:
 *         description: Embarcador encontrado
 *       404:
 *         description: Embarcador não encontrado
 */
router.get('/:id',
  validateParams(embarcadorParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/{id}/depositos:
 *   get:
 *     summary: Buscar embarcador com depósitos
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do embarcador
 *     responses:
 *       200:
 *         description: Embarcador com depósitos
 *       404:
 *         description: Embarcador não encontrado
 */
router.get('/:id/depositos',
  validateParams(embarcadorParams),
  controller.getWithDepositos.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores:
 *   post:
 *     summary: Criar novo embarcador
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documento
 *               - nome
 *             properties:
 *               documento:
 *                 type: string
 *                 example: "11.222.333/0001-81"
 *                 description: CNPJ do embarcador
 *               nome:
 *                 type: string
 *                 example: "Empresa ABC Ltda"
 *                 description: Nome do embarcador
 *               inscricao_estadual:
 *                 type: string
 *                 example: "123456789"
 *               cnpj:
 *                 type: string
 *                 example: "11.222.333/0001-81"
 *               endereco:
 *                 type: string
 *                 example: "Rua das Indústrias, 456"
 *               bairro:
 *                 type: string
 *                 example: "Distrito Industrial"
 *               cidade:
 *                 type: string
 *                 example: "São Paulo"
 *               cep:
 *                 type: string
 *                 example: "01234-567"
 *               uf:
 *                 type: string
 *                 example: "SP"
 *     responses:
 *       201:
 *         description: Embarcador criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Embarcador já existe
 */
router.post('/',
  authorize(['admin', 'gestor', 'operador']), // Admin, gestor e operador podem criar
  validate(createEmbarcador),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/{id}:
 *   put:
 *     summary: Atualizar embarcador
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do embarcador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documento:
 *                 type: string
 *                 example: "11.222.333/0001-81"
 *               nome:
 *                 type: string
 *                 example: "Empresa ABC Ltda"
 *               inscricao_estadual:
 *                 type: string
 *                 example: "123456789"
 *               cnpj:
 *                 type: string
 *                 example: "11.222.333/0001-81"
 *               endereco:
 *                 type: string
 *                 example: "Rua das Indústrias, 456"
 *               bairro:
 *                 type: string
 *                 example: "Distrito Industrial"
 *               cidade:
 *                 type: string
 *                 example: "São Paulo"
 *               cep:
 *                 type: string
 *                 example: "01234-567"
 *               uf:
 *                 type: string
 *                 example: "SP"
 *     responses:
 *       200:
 *         description: Embarcador atualizado com sucesso
 *       404:
 *         description: Embarcador não encontrado
 *       409:
 *         description: Conflito de dados
 */
router.put('/:id',
  authorize(['admin', 'gestor', 'operador']), // Admin, gestor e operador podem editar
  validateParams(embarcadorParams),
  validate(updateEmbarcador),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/{id}:
 *   delete:
 *     summary: Deletar embarcador
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do embarcador
 *     responses:
 *       200:
 *         description: Embarcador deletado com sucesso
 *       404:
 *         description: Embarcador não encontrado
 *       409:
 *         description: Embarcador possui dados associados
 */
router.delete('/:id',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem deletar
  validateParams(embarcadorParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/embarcadores/{id}/restore:
 *   post:
 *     summary: Restaurar embarcador deletado
 *     tags: [Embarcadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do embarcador
 *     responses:
 *       200:
 *         description: Embarcador restaurado com sucesso
 *       404:
 *         description: Embarcador não encontrado
 */
router.post('/:id/restore',
  authorize(['admin']), // Apenas admin pode restaurar
  validateParams(embarcadorParams),
  controller.restore.bind(controller)
);

module.exports = router;