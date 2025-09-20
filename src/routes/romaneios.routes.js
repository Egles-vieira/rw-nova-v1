const express = require('express');
const router = express.Router();

const RomaneiosController = require('../controllers/romaneios.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createRomaneioSchema,
  updateRomaneioSchema,
  updateRotasSchema,
  queryRomaneiosSchema,
  paramsRomaneioSchema,
  numeroParamSchema,
  placaParamSchema,
  motoristaParamSchema,
  roteirizacaoParamSchema
} = require('../validations/romaneios.validation');

const controller = new RomaneiosController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/romaneios:
 *   get:
 *     summary: Listar romaneios
 *     tags: [Romaneios]
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
 *         name: numero
 *         schema:
 *           type: integer
 *         description: Filtrar por número do romaneio
 *       - in: query
 *         name: motorista_id
 *         schema:
 *           type: integer
 *         description: Filtrar por motorista
 *       - in: query
 *         name: placa_cavalo
 *         schema:
 *           type: string
 *         description: Filtrar por placa do cavalo
 *       - in: query
 *         name: roteirizacao
 *         schema:
 *           type: string
 *           enum: [manual, automatica, otimizada]
 *         description: Filtrar por tipo de roteirização
 *       - in: query
 *         name: roteirizar
 *         schema:
 *           type: boolean
 *         description: Filtrar por romaneios para roteirizar
 *       - in: query
 *         name: unidade
 *         schema:
 *           type: string
 *         description: Filtrar por unidade
 *       - in: query
 *         name: doca
 *         schema:
 *           type: string
 *         description: Filtrar por doca
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início (emissão)
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim (emissão)
 *     responses:
 *       200:
 *         description: Lista de romaneios
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(queryRomaneiosSchema),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/stats:
 *   get:
 *     summary: Estatísticas gerais de romaneios
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de romaneios
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/numero/{numero}:
 *   get:
 *     summary: Buscar romaneio por número
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numero
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número do romaneio
 *     responses:
 *       200:
 *         description: Romaneio encontrado
 *       404:
 *         description: Romaneio não encontrado
 */
router.get('/numero/:numero',
  validateParams(numeroParamSchema),
  controller.getByNumero.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/placa/{placa}:
 *   get:
 *     summary: Buscar romaneios por placa do cavalo
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema:
 *           type: string
 *         description: Placa do cavalo
 *     responses:
 *       200:
 *         description: Romaneios encontrados
 */
router.get('/placa/:placa',
  validateParams(placaParamSchema),
  controller.getByPlacaCavalo.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/motorista/{motorista_id}:
 *   get:
 *     summary: Buscar romaneios por motorista
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: motorista_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do motorista
 *     responses:
 *       200:
 *         description: Romaneios do motorista encontrados
 */
router.get('/motorista/:motorista_id',
  validateParams(motoristaParamSchema),
  controller.getByMotorista.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/roteirizacao/{status}:
 *   get:
 *     summary: Buscar romaneios por status de roteirização
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [manual, automatica, otimizada]
 *         description: Status de roteirização
 *     responses:
 *       200:
 *         description: Romaneios encontrados
 */
router.get('/roteirizacao/:status',
  validateParams(roteirizacaoParamSchema),
  controller.getByRoteirizacao.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/{id}/notas-fiscais:
 *   get:
 *     summary: Buscar notas fiscais do romaneio
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     responses:
 *       200:
 *         description: Notas fiscais do romaneio
 */
router.get('/:id/notas-fiscais',
  validateParams(paramsRomaneioSchema),
  controller.getNotasFiscais.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/{id}:
 *   get:
 *     summary: Buscar romaneio por ID
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     responses:
 *       200:
 *         description: Romaneio encontrado
 *       404:
 *         description: Romaneio não encontrado
 */
router.get('/:id',
  validateParams(paramsRomaneioSchema),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/romaneios:
 *   post:
 *     summary: Criar novo romaneio
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - placa_cavalo
 *               - emissao
 *               - motorista_id
 *             properties:
 *               numero:
 *                 type: integer
 *                 example: 12345
 *               unidade:
 *                 type: string
 *                 example: "Centro de Distribuição"
 *               placa_cavalo:
 *                 type: string
 *                 example: "ABC1234"
 *               placa_carreta:
 *                 type: string
 *                 example: "XYZ5678"
 *               emissao:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               motorista_id:
 *                 type: integer
 *                 example: 1
 *               capacidade_veiculo:
 *                 type: number
 *                 example: 5000.00
 *               roteirizacao:
 *                 type: string
 *                 enum: [manual, automatica, otimizada]
 *                 example: "manual"
 *               peso:
 *                 type: number
 *                 example: 2500.50
 *               cubagem:
 *                 type: number
 *                 example: 15.75
 *               doca:
 *                 type: string
 *                 example: "Doca 1"
 *               roteirizar:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Romaneio criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post('/',
  authorize(['admin', 'gestor', 'operador']),
  validate(createRomaneioSchema),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/{id}/rotas:
 *   patch:
 *     summary: Atualizar rotas do romaneio
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rotas:
 *                 type: object
 *                 description: Dados das rotas
 *               markers:
 *                 type: object
 *                 description: Marcadores do mapa
 *               maplink_info:
 *                 type: object
 *                 description: Informações do Maplink
 *     responses:
 *       200:
 *         description: Rotas atualizadas com sucesso
 *       404:
 *         description: Romaneio não encontrado
 */
router.patch('/:id/rotas',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(paramsRomaneioSchema),
  validate(updateRotasSchema),
  controller.updateRotas.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/{id}/roteirizar:
 *   patch:
 *     summary: Marcar/desmarcar romaneio para roteirização
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     responses:
 *       200:
 *         description: Status de roteirização atualizado
 *       404:
 *         description: Romaneio não encontrado
 */
router.patch('/:id/roteirizar',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(paramsRomaneioSchema),
  controller.toggleRoteirizar.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/{id}:
 *   put:
 *     summary: Atualizar romaneio
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero:
 *                 type: integer
 *               unidade:
 *                 type: string
 *               placa_cavalo:
 *                 type: string
 *               placa_carreta:
 *                 type: string
 *               emissao:
 *                 type: string
 *                 format: date
 *               motorista_id:
 *                 type: integer
 *               capacidade_veiculo:
 *                 type: number
 *               roteirizacao:
 *                 type: string
 *                 enum: [manual, automatica, otimizada]
 *               peso:
 *                 type: number
 *               cubagem:
 *                 type: number
 *               doca:
 *                 type: string
 *               roteirizar:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Romaneio atualizado com sucesso
 *       404:
 *         description: Romaneio não encontrado
 */
router.put('/:id',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(paramsRomaneioSchema),
  validate(updateRomaneioSchema),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/romaneios/{id}:
 *   delete:
 *     summary: Deletar romaneio
 *     tags: [Romaneios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     responses:
 *       200:
 *         description: Romaneio deletado com sucesso
 *       404:
 *         description: Romaneio não encontrado
 *       409:
 *         description: Não é possível deletar romaneio com notas fiscais associadas
 */
router.delete('/:id',
  authorize(['admin', 'gestor']),
  validateParams(paramsRomaneioSchema),
  controller.delete.bind(controller)
);

module.exports = router;