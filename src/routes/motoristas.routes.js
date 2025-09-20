const express = require('express');
const router = express.Router();

const MotoristasController = require('../controllers/motoristas.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createMotorista,
  updateMotorista,
  listMotoristas,
  searchMotoristas,
  motoristaParams,
  cpfParams,
  cidadeParams
} = require('../validations/motoristas.validation');

const controller = new MotoristasController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/motoristas:
 *   get:
 *     summary: Listar motoristas
 *     tags: [Motoristas]
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
 *         name: cpf
 *         schema:
 *           type: string
 *         description: Filtrar por CPF
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *         description: Filtrar por cidade
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista de motoristas
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listMotoristas),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/search:
 *   get:
 *     summary: Buscar motoristas por nome
 *     tags: [Motoristas]
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
 *         description: Motoristas encontrados
 */
router.get('/search',
  validateQuery(searchMotoristas),
  controller.search.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/stats:
 *   get:
 *     summary: Estatísticas gerais de motoristas
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de motoristas
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/active-messages:
 *   get:
 *     summary: Listar motoristas ativos para mensagens
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Motoristas ativos para mensagens
 */
router.get('/active-messages',
  controller.getActiveForMessages.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/cpf/{cpf}:
 *   get:
 *     summary: Buscar motorista por CPF
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
 *         required: true
 *         schema:
 *           type: string
 *         description: CPF do motorista
 *     responses:
 *       200:
 *         description: Motorista encontrado
 *       404:
 *         description: Motorista não encontrado
 */
router.get('/cpf/:cpf',
  validateParams(cpfParams),
  controller.getByCpf.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/cidade/{cidade}:
 *   get:
 *     summary: Buscar motoristas por cidade
 *     tags: [Motoristas]
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
 *         description: Motoristas encontrados
 */
router.get('/cidade/:cidade',
  validateParams(cidadeParams),
  controller.getByCidade.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/{id}:
 *   get:
 *     summary: Buscar motorista por ID
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     responses:
 *       200:
 *         description: Motorista encontrado
 *       404:
 *         description: Motorista não encontrado
 */
router.get('/:id',
  validateParams(motoristaParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/{id}/jornada:
 *   get:
 *     summary: Buscar motorista com jornada de trabalho
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     responses:
 *       200:
 *         description: Motorista com jornada encontrado
 */
router.get('/:id/jornada',
  validateParams(motoristaParams),
  controller.getWithJornada.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/{id}/legislacao:
 *   get:
 *     summary: Buscar motorista com informações de legislação
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     responses:
 *       200:
 *         description: Motorista com legislação encontrado
 */
router.get('/:id/legislacao',
  validateParams(motoristaParams),
  controller.getWithLegislacao.bind(controller)
);

/**
 * @swagger
 * /api/motoristas:
 *   post:
 *     summary: Criar novo motorista
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - cpf
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "João"
 *               sobrenome:
 *                 type: string
 *                 example: "Silva"
 *               cpf:
 *                 type: string
 *                 example: "123.456.789-10"
 *               email:
 *                 type: string
 *                 example: "joao.silva@email.com"
 *               contato:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *               send_mensagem:
 *                 type: boolean
 *                 example: true
 *               legislacao_id:
 *                 type: integer
 *                 example: 1
 *               cidade:
 *                 type: string
 *                 example: "São Paulo"
 *               estado:
 *                 type: string
 *                 example: "SP"
 *               cep:
 *                 type: string
 *                 example: "01234-567"
 *     responses:
 *       201:
 *         description: Motorista criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: CPF já cadastrado
 */
router.post('/',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem criar
  validate(createMotorista),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/{id}:
 *   put:
 *     summary: Atualizar motorista
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               sobrenome:
 *                 type: string
 *               cpf:
 *                 type: string
 *               email:
 *                 type: string
 *               contato:
 *                 type: string
 *               send_mensagem:
 *                 type: boolean
 *               legislacao_id:
 *                 type: integer
 *               cidade:
 *                 type: string
 *               estado:
 *                 type: string
 *               cep:
 *                 type: string
 *     responses:
 *       200:
 *         description: Motorista atualizado com sucesso
 *       404:
 *         description: Motorista não encontrado
 *       409:
 *         description: CPF já cadastrado
 */
router.put('/:id',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem editar
  validateParams(motoristaParams),
  validate(updateMotorista),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/{id}:
 *   delete:
 *     summary: Deletar motorista
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     responses:
 *       200:
 *         description: Motorista deletado com sucesso
 *       404:
 *         description: Motorista não encontrado
 *       409:
 *         description: Motorista possui romaneios associados
 */
router.delete('/:id',
  authorize(['admin']), // Apenas admin pode deletar
  validateParams(motoristaParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/motoristas/{id}/restore:
 *   post:
 *     summary: Restaurar motorista deletado
 *     tags: [Motoristas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     responses:
 *       200:
 *         description: Motorista restaurado com sucesso
 *       404:
 *         description: Motorista não encontrado
 */
router.post('/:id/restore',
  authorize(['admin']), // Apenas admin pode restaurar
  validateParams(motoristaParams),
  controller.restore.bind(controller)
);

module.exports = router;