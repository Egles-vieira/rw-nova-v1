const express = require('express');
const router = express.Router();
const Joi = require('joi'); // ← faltava

const NotasFiscaisController = require('../controllers/notas-fiscais.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middlewares/validate.middleware');
const {
  createNotaFiscal, updateNotaFiscal, listNotasFiscais,
  notaFiscalParams, chaveParams, numeroSerieParams,
  statsByPeriodQuery, finalizarSchema, updateStatusSchema,
  romaneioAssociationSchema // ← ADICIONE ESTA LINHA
} = require('../validations/notas-fiscais.validation');

const controller = new NotasFiscaisController();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * /api/notas-fiscais:
 *   get:
 *     summary: Listar notas fiscais
 *     tags: [Notas Fiscais]
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
 *         name: chave_nf
 *         schema:
 *           type: string
 *         description: Filtrar por chave da nota fiscal
 *       - in: query
 *         name: cliente_id
 *         schema:
 *           type: integer
 *         description: Filtrar por cliente
 *       - in: query
 *         name: transportadora_id
 *         schema:
 *           type: integer
 *         description: Filtrar por transportadora
 *       - in: query
 *         name: status_nf
 *         schema:
 *           type: string
 *           enum: [pendente, em_transito, entregue, devolvida, cancelada]
 *         description: Filtrar por status
 *       - in: query
 *         name: finalizada
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por finalizada
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
 *         description: Lista de notas fiscais
 *       401:
 *         description: Não autorizado
 */
router.get('/',
  validateQuery(listNotasFiscais),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/stats:
 *   get:
 *     summary: Estatísticas gerais de notas fiscais
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de notas fiscais
 */
router.get('/stats',
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/stats/period:
 *   get:
 *     summary: Estatísticas por período
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: data_fim
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Estatísticas por período
 */
router.get('/stats/period',
  validateQuery(statsByPeriodQuery),
  controller.getStatsByPeriod.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/pendentes-romaneio:
 *   get:
 *     summary: Buscar notas fiscais pendentes de romaneio
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transportadoraId
 *         schema:
 *           type: integer
 *         description: Filtrar por transportadora
 *     responses:
 *       200:
 *         description: Notas fiscais pendentes de romaneio
 */
router.get('/pendentes-romaneio',
  controller.getPendentesRomaneio.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/com-atraso:
 *   get:
 *     summary: Buscar notas fiscais com atraso na entrega
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notas fiscais com atraso
 */
router.get('/com-atraso',
  controller.getComAtraso.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/chave-nf/{chave}:
 *   get:
 *     summary: Buscar nota fiscal por chave da NF
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chave
 *         required: true
 *         schema:
 *           type: string
 *         description: Chave da nota fiscal (44 dígitos)
 *     responses:
 *       200:
 *         description: Nota fiscal encontrada
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.get('/chave-nf/:chave',
  validateParams(chaveParams),
  controller.getByChaveNf.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/chave-cte/{chave}:
 *   get:
 *     summary: Buscar nota fiscal por chave do CTE
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chave
 *         required: true
 *         schema:
 *           type: string
 *         description: Chave do CTE (44 dígitos)
 *     responses:
 *       200:
 *         description: Nota fiscal encontrada
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.get('/chave-cte/:chave',
  validateParams(chaveParams),
  controller.getByChaveCte.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/numero/{numero}/serie/{serie}:
 *   get:
 *     summary: Buscar notas fiscais por número e série
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numero
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número da nota fiscal
 *       - in: path
 *         name: serie
 *         required: true
 *         schema:
 *           type: integer
 *         description: Série da nota fiscal
 *     responses:
 *       200:
 *         description: Notas fiscais encontradas
 */
router.get('/numero/:numero/serie/:serie',
  validateParams(numeroSerieParams),
  controller.getByNumeroSerie.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/cliente/{clienteId}:
 *   get:
 *     summary: Buscar notas fiscais por cliente
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por status
 *       - in: query
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Notas fiscais do cliente
 */
router.get('/cliente/:clienteId',
  validateParams(notaFiscalParams.rename('id', 'clienteId')),
  controller.getByCliente.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/romaneio/{romaneioId}:
 *   get:
 *     summary: Buscar notas fiscais por romaneio
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: romaneioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do romaneio
 *     responses:
 *       200:
 *         description: Notas fiscais do romaneio
 */
router.get('/romaneio/:romaneioId',
  validateParams(notaFiscalParams.rename('id', 'romaneioId')),
  controller.getByRomaneio.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{id}:
 *   get:
 *     summary: Buscar nota fiscal por ID
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da nota fiscal
 *     responses:
 *       200:
 *         description: Nota fiscal encontrada
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.get('/:id',
  validateParams(notaFiscalParams),
  controller.get.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais:
 *   post:
 *     summary: Criar nova nota fiscal
 *     tags: [Notas Fiscais]
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
 *               - embarcador_id
 *               - transportadora_id
 *               - cod_rep
 *               - nome_rep
 *               - emi_nf
 *               - peso_calculo
 *             properties:
 *               cliente_id:
 *                 type: integer
 *                 example: 1
 *               embarcador_id:
 *                 type: integer
 *                 example: 1
 *               transportadora_id:
 *                 type: integer
 *                 example: 1
 *               cod_rep:
 *                 type: integer
 *                 example: 123
 *               nome_rep:
 *                 type: string
 *                 example: "João Silva"
 *               emi_nf:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               peso_calculo:
 *                 type: number
 *                 example: 1500.50
 *               chave_nf:
 *                 type: string
 *                 example: "35200114200166000187550010000000015180044003"
 *               nro:
 *                 type: integer
 *                 example: 1234
 *               ser:
 *                 type: integer
 *                 example: 1
 *               valor:
 *                 type: number
 *                 example: 5000.00
 *               qtd_volumes:
 *                 type: integer
 *                 example: 10
 *               previsao_entrega:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-20"
 *     responses:
 *       201:
 *         description: Nota fiscal criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post('/',
  authorize(['admin', 'gestor', 'operador']),
  validate(createNotaFiscal),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{id}/status:
 *   patch:
 *     summary: Atualizar status da nota fiscal
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da nota fiscal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pendente, em_transito, entregue, devolvida, cancelada]
 *                 example: "em_transito"
 *               observacoes:
 *                 type: string
 *                 example: "Saiu para entrega"
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.patch('/:id/status',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(notaFiscalParams),
  validate(updateStatusSchema),
  controller.updateStatus.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{id}/finalizar:
 *   patch:
 *     summary: Finalizar nota fiscal
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da nota fiscal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data_entrega
 *             properties:
 *               data_entrega:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-20"
 *               hora_entrega:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
 *                 example: "14:30:00"
 *               observacoes:
 *                 type: string
 *                 example: "Entrega realizada com sucesso"
 *     responses:
 *       200:
 *         description: Nota fiscal finalizada com sucesso
 *       404:
 *         description: Nota fiscal não encontrada
 *       409:
 *         description: Nota fiscal já foi finalizada
 */
router.patch('/:id/finalizar',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(notaFiscalParams),
  validate(finalizarSchema),
  controller.finalizar.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/romaneio/{romaneioId}/associar:
 *   post:
 *     summary: Associar notas fiscais a um romaneio
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: romaneioId
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
 *             required:
 *               - notaIds
 *             properties:
 *               notaIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3, 4]
 *     responses:
 *       200:
 *         description: Notas fiscais associadas com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/romaneio/:romaneioId/associar',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(notaFiscalParams.rename('id', 'romaneioId')),
  validate(romaneioAssociationSchema),
  controller.associarRomaneio.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/romaneio/desassociar:
 *   post:
 *     summary: Desassociar notas fiscais de romaneio
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notaIds
 *             properties:
 *               notaIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3, 4]
 *     responses:
 *       200:
 *         description: Notas fiscais desassociadas com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/romaneio/desassociar',
  authorize(['admin', 'gestor', 'operador']),
  validate(romaneioAssociationSchema),
  controller.desassociarRomaneio.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{id}:
 *   put:
 *     summary: Atualizar nota fiscal
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da nota fiscal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cliente_id:
 *                 type: integer
 *               embarcador_id:
 *                 type: integer
 *               transportadora_id:
 *                 type: integer
 *               cod_rep:
 *                 type: integer
 *               nome_rep:
 *                 type: string
 *               peso_calculo:
 *                 type: number
 *               peso_real:
 *                 type: number
 *               qtd_volumes:
 *                 type: integer
 *               valor:
 *                 type: number
 *               previsao_entrega:
 *                 type: string
 *                 format: date
 *               observacoes:
 *                 type: string
 *               status_nf:
 *                 type: string
 *                 enum: [pendente, em_transito, entregue, devolvida, cancelada]
 *     responses:
 *       200:
 *         description: Nota fiscal atualizada com sucesso
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.put('/:id',
  authorize(['admin', 'gestor', 'operador']),
  validateParams(notaFiscalParams),
  validate(updateNotaFiscal),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{id}:
 *   delete:
 *     summary: Deletar nota fiscal
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da nota fiscal
 *     responses:
 *       200:
 *         description: Nota fiscal deletada com sucesso
 *       404:
 *         description: Nota fiscal não encontrada
 *       409:
 *         description: Não é possível deletar nota fiscal finalizada ou associada a romaneio
 */
router.delete('/:id',
  authorize(['admin', 'gestor']), // Apenas admin e gestor podem deletar
  validateParams(notaFiscalParams),
  controller.delete.bind(controller)
);

/**
 * @swagger
 * /api/notas-fiscais/{id}/restore:
 *   post:
 *     summary: Restaurar nota fiscal deletada
 *     tags: [Notas Fiscais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da nota fiscal
 *     responses:
 *       200:
 *         description: Nota fiscal restaurada com sucesso
 *       404:
 *         description: Nota fiscal não encontrada
 */
router.post('/:id/restore',
  authorize(['admin']), // Apenas admin pode restaurar
  validateParams(notaFiscalParams),
  controller.restore.bind(controller)
);

module.exports = router;