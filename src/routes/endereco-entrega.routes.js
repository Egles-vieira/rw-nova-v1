const express = require('express');
const router = express.Router();

const EnderecoEntregaController = require('../controllers/endereco-entrega.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createEnderecoEntrega,
  updateEnderecoEntrega,
  listEnderecosEntrega,
  enderecoEntregaParams,
  updateCoordenadasSchema
} = require('../validations/endereco-entrega.validation');

const controller = new EnderecoEntregaController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/enderecos-entrega:
 *   get:
 *     summary: Listar endereços de entrega
 *     tags: [Endereços de Entrega]
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
 *         name: cliente_id
 *         schema:
 *           type: integer
 *         description: Filtrar por cliente
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
 *       - in: query
 *         name: restrito
 *         schema:
 *           type: boolean
 *         description: Filtrar por endereços restritos
 *     responses:
 *       200:
 *         description: Lista de endereços de entrega
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listEnderecosEntrega),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/cliente/{clienteId}:
 *   get:
 *     summary: Buscar endereços de entrega por cliente
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Endereços de entrega do cliente
 *       404:
 *         description: Cliente não encontrado
 */
router.get('/cliente/:clienteId',
  // Remova ou corrija a validação de parâmetros aqui
  // validateParams(enderecoEntregaParams.rename('id', 'clienteId')), ← Isso não funciona bem com Joi
  controller.getByCliente.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/localizacao:
 *   get:
 *     summary: Buscar endereços de entrega por cidade e UF
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cidade
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da cidade
 *       - in: query
 *         name: uf
 *         required: true
 *         schema:
 *           type: string
 *         description: UF (2 caracteres)
 *     responses:
 *       200:
 *         description: Endereços de entrega encontrados
 *       400:
 *         description: Cidade e UF são obrigatórios
 */
router.get('/localizacao',
  controller.getByCidadeUf.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/restritos:
 *   get:
 *     summary: Buscar endereços de entrega com restrição logística
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Endereços com restrição recuperados
 */
router.get('/restritos',
  controller.getComRestricao.bind(controller)
);

// ... outras rotas

/**
 * @swagger
 * /api/endereco-entrega/{id}:
 *   get:
 *     summary: Buscar endereço de entrega por ID
 *
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do endereço de entrega
 *     responses:
 *       200:
 *         description: Endereço de entrega encontrado
 *       404:
 *         description: Endereço de entrega não encontrado
 */
router.get('/:id', 
  validateParams(enderecoEntregaParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega:
 *   post:
 *     summary: Criar novo endereço de entrega
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cliente_id
 *               - endereco
 *               - bairro
 *               - cidade
 *               - uf
 *               - cep
 *             properties:
 *               cliente_id:
 *                 type: integer
 *                 example: 1
 *               endereco:
 *                 type: string
 *                 example: "Rua das Flores, 123"
 *               bairro:
 *                 type: string
 *                 example: "Centro"
 *               cidade:
 *                 type: string
 *                 example: "São Paulo"
 *               uf:
 *                 type: string
 *                 example: "SP"
 *               cep:
 *                 type: string
 *                 example: "01001000"
 *               doca:
 *                 type: string
 *                 example: "Doca 5"
 *               lat:
 *                 type: number
 *                 example: -23.550520
 *               lon:
 *                 type: number
 *                 example: -46.633308
 *               restricao_logistica_id:
 *                 type: integer
 *                 example: 1
 *               restrito:
 *                 type: boolean
 *                 example: false
 *               rota:
 *                 type: string
 *                 example: "Rota A"
 *     responses:
 *       201:
 *         description: Endereço de entrega criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post('/',
  authorize(['admin', 'gestor', 'operador']),
  validate(createEnderecoEntrega),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/{id}/coordenadas:
 *   patch:
 *     summary: Atualizar coordenadas do endereço de entrega
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do endereço de entrega
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lon
 *             properties:
 *               lat:
 *                 type: number
 *                 example: -23.550520
 *               lon:
 *                 type: number
 *                 example: -46.633308
 *     responses:
 *       200:
 *         description: Coordenadas atualizadas com sucesso
 *       404:
 *         description: Endereço de entrega não encontrado
 */
router.patch('/:id/coordenadas',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(enderecoEntregaParams),
  validate(updateCoordenadasSchema),
  controller.updateCoordenadas.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/{id}:
 *   put:
 *     summary: Atualizar endereço de entrega
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do endereço de entrega
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cliente_id:
 *                 type: integer
 *               endereco:
 *                 type: string
 *               bairro:
 *                 type: string
 *               cidade:
 *                 type: string
 *               uf:
 *                 type: string
 *               cep:
 *                 type: string
 *               doca:
 *                 type: string
 *               lat:
 *                 type: number
 *               lon:
 *                 type: number
 *               restricao_logistica_id:
 *                 type: integer
 *               restrito:
 *                 type: boolean
 *               rota:
 *                 type: string
 *     responses:
 *       200:
 *         description: Endereço de entrega atualizado com sucesso
 *       404:
 *         description: Endereço de entrega não encontrado
 */
router.put('/:id',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(enderecoEntregaParams),
  validate(updateEnderecoEntrega),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/{id}:
 *   delete:
 *     summary: Deletar endereço de entrega
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do endereço de entrega
 *     responses:
 *       200:
 *         description: Endereço de entrega deletado com sucesso
 *       404:
 *         description: Endereço de entrega não encontrado
 *       409:
 *         description: Não é possível deletar endereço associado a notas fiscais
 */
router.delete('/:id',
  authorize(['admin', 'gestor']),
  validateParams(enderecoEntregaParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/enderecos-entrega/{id}/restore:
 *   post:
 *     summary: Restaurar endereço de entrega deletado
 *     tags: [Endereços de Entrega]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do endereço de entrega
 *     responses:
 *       200:
 *         description: Endereço de entrega restaurado com sucesso
 *       404:
 *         description: Endereço de entrega não encontrado
 */
router.post('/:id/restore',
  authorize(['admin']),
  validateParams(enderecoEntregaParams),
  controller.restore.bind(controller)
);

module.exports = router;