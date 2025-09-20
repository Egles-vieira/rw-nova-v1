const express = require('express');
const router = express.Router();

const ClientesController = require('../controllers/clientes.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createCliente,
  updateCliente,
  listClientes,
  searchClientes,
  clienteParams,
  documentoParams,
  codClienteParams,
  ufParams,
  cidadeParams
} = require('../validations/clientes.validation');

const controller = new ClientesController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Listar clientes
 *     tags: [Clientes]
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
 *         description: Filtrar por CPF/CNPJ
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
 *         description: Lista de clientes
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listClientes),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/clientes/search:
 *   get:
 *     summary: Buscar clientes por nome
 *     tags: [Clientes]
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
 *         description: Lista de clientes encontrados
 */
router.get('/search',
  validateQuery(searchClientes),
  controller.search.bind(controller)
);

/**
 * @swagger
 * /api/clientes/stats:
 *   get:
 *     summary: Estatísticas gerais de clientes
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de clientes
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/clientes/documento/{documento}:
 *   get:
 *     summary: Buscar cliente por CPF/CNPJ
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documento
 *         required: true
 *         schema:
 *           type: string
 *         description: CPF ou CNPJ do cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente não encontrado
 */
router.get('/documento/:documento',
  validateParams(documentoParams),
  controller.getByDocumento.bind(controller)
);

/**
 * @swagger
 * /api/clientes/codigo/{codCliente}:
 *   get:
 *     summary: Buscar cliente por código
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codCliente
 *         required: true
 *         schema:
 *           type: integer
 *         description: Código do cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente não encontrado
 */
router.get('/codigo/:codCliente',
  validateParams(codClienteParams),
  controller.getByCodCliente.bind(controller)
);

/**
 * @swagger
 * /api/clientes/uf/{uf}:
 *   get:
 *     summary: Buscar clientes por UF
 *     tags: [Clientes]
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
 *         description: Lista de clientes da UF
 */
router.get('/uf/:uf',
  validateParams(ufParams),
  controller.getByUf.bind(controller)
);

/**
 * @swagger
 * /api/clientes/cidade/{cidade}:
 *   get:
 *     summary: Buscar clientes por cidade
 *     tags: [Clientes]
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
 *         description: Lista de clientes da cidade
 */
router.get('/cidade/:cidade',
  validateParams(cidadeParams),
  controller.getByCidade.bind(controller)
);

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Buscar cliente por ID
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente não encontrado
 */
router.get('/:id',
  validateParams(clienteParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/clientes/{id}/stats:
 *   get:
 *     summary: Buscar cliente com estatísticas detalhadas
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente com estatísticas
 *       404:
 *         description: Cliente não encontrado
 */
router.get('/:id/stats',
  validateParams(clienteParams),
  controller.getWithStats.bind(controller)
);

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Criar novo cliente
 *     tags: [Clientes]
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
 *               - cod_cliente
 *               - nome
 *             properties:
 *               documento:
 *                 type: string
 *                 example: "123.456.789-01"
 *                 description: CPF ou CNPJ do cliente
 *               cod_cliente:
 *                 type: integer
 *                 example: 12345
 *                 description: Código único do cliente
 *               nome:
 *                 type: string
 *                 example: "João Silva"
 *                 description: Nome do cliente
 *               endereco:
 *                 type: string
 *                 example: "Rua das Flores, 123"
 *               bairro:
 *                 type: string
 *                 example: "Centro"
 *               cep:
 *                 type: string
 *                 example: "01234-567"
 *               cidade:
 *                 type: string
 *                 example: "São Paulo"
 *               uf:
 *                 type: string
 *                 example: "SP"
 *               contato:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *     responses:
 *       201:
 *         description: Cliente criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Cliente já existe
 */
router.post('/',
  authorize(['admin', 'gestor', 'operador']), // Admin, gestor e operador podem criar
  validate(createCliente),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     summary: Atualizar cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documento:
 *                 type: string
 *                 example: "123.456.789-01"
 *               cod_cliente:
 *                 type: integer
 *                 example: 12345
 *               nome:
 *                 type: string
 *                 example: "João Silva"
 *               endereco:
 *                 type: string
 *                 example: "Rua das Flores, 123"
 *               bairro:
 *                 type: string
 *                 example: "Centro"
 *               cep:
 *                 type: string
 *                 example: "01234-567"
 *               cidade:
 *                 type: string
 *                 example: "São Paulo"
 *               uf:
 *                 type: string
 *                 example: "SP"
 *               contato:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *     responses:
 *       200:
 *         description: Cliente atualizado com sucesso
 *       404:
 *         description: Cliente não encontrado
 *       409:
 *         description: Conflito de dados
 */
router.put('/:id',
  authorize(['admin', 'gestor', 'operador']), // Admin, gestor e operador podem editar
  validateParams(clienteParams),
  validate(updateCliente),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/clientes/{id}:
 *   delete:
 *     summary: Deletar cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente deletado com sucesso
 *       404:
 *         description: Cliente não encontrado
 *       409:
 *         description: Cliente possui dados associados
 */
router.delete('/:id',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem deletar
  validateParams(clienteParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/clientes/{id}/restore:
 *   post:
 *     summary: Restaurar cliente deletado
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente restaurado com sucesso
 *       404:
 *         description: Cliente não encontrado
 */
router.post('/:id/restore',
  authorize(['admin']), // Apenas admin pode restaurar
  validateParams(clienteParams),
  controller.restore.bind(controller)
);

module.exports = router;