// routes/webhook.routes.js
const express = require('express');
const router = express.Router();

const WebhookController = require('../controllers/webhook.controller');
const { validate } = require('../middlewares/validate.middleware');
const { webhookNotaFiscalSchema } = require('../validations/webhook.validation');
const logger = require('../config/logger');

const controller = new WebhookController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Ocorrencia:
 *       type: object
 *       required:
 *         - nro_nf
 *         - dataHoraEvento
 *         - dataHoraEnvio
 *         - codigo
 *         - descricao
 *       properties:
 *         nro_nf:
 *           type: string
 *           description: Número da nota fiscal
 *           example: "1875722"
 *         dataHoraEvento:
 *           type: string
 *           format: date-time
 *           description: Data e hora do evento
 *           example: "2025-01-07T00:18:24.000-03:00"
 *         dataHoraEnvio:
 *           type: string
 *           format: date-time
 *           description: Data e hora do envio
 *           example: "2025-01-07T00:18:27.000-03:00"
 *         codigo:
 *           type: string
 *           description: Código da ocorrência
 *           example: "82"
 *         descricao:
 *           type: string
 *           description: Descrição da ocorrência
 *           example: "SAIDA DA UNIDADE"
 *         complemento:
 *           type: string
 *           description: Informações complementares
 *           example: "Saida da unidade JUNDIAI em 07/01/25, 00:18h"
 *         nomeRecebedor:
 *           type: string
 *           description: Nome do recebedor (quando aplicável)
 *           example: "CARLOS ROBERTO"
 *         docRecebedor:
 *           type: string
 *           description: Documento do recebedor
 *           example: "84587962585"
 *         latitude:
 *           type: string
 *           description: Coordenada de latitude
 *           example: "-23.1864"
 *         longitude:
 *           type: string
 *           description: Coordenada de longitude
 *           example: "-46.8842"
 *         linkComprovante:
 *           type: string
 *           format: uri
 *           description: Link para comprovante de entrega
 *           example: "https://comprovante.tnt.com/12345.pdf"
 *         dataHoraAgendamento:
 *           type: string
 *           format: date-time
 *           description: Data e hora de agendamento
 *         novaDataPrevisao:
 *           type: string
 *           format: date-time
 *           description: Nova data de previsão
 *           example: "2025-01-09T06:16:00.000-03:00"
 *     
 *     Recebedor:
 *       type: object
 *       required:
 *         - documento
 *         - nome
 *       properties:
 *         cod_cliente:
 *           type: string
 *           example: "56440"
 *         documento:
 *           type: string
 *           example: "24876491000369"
 *         nome:
 *           type: string
 *           example: "POLICLINICA QUALITY LTDA"
 *         endereco:
 *           type: string
 *           example: "R RIACHUELO,685"
 *         bairro:
 *           type: string
 *           example: "CAVALHADA I"
 *         cep:
 *           type: string
 *           example: "78216-010"
 *         cidade:
 *           type: string
 *           example: "CÃCERES"
 *         uf:
 *           type: string
 *           example: "MT"
 *         contato:
 *           type: string
 *           example: "65 32236048"
 *     
 *     Remetente:
 *       type: object
 *       required:
 *         - documento
 *         - nome
 *       properties:
 *         documento:
 *           type: string
 *           example: "61418042000131"
 *         nome:
 *           type: string
 *           example: "CIRURGICA FERNANDES C.MAT.CIR.HO.SO.LTDA"
 *     
 *     Transportadora:
 *       type: object
 *       required:
 *         - cnpj
 *         - nome
 *       properties:
 *         cnpj:
 *           type: string
 *           example: "95591723000119"
 *         nome:
 *           type: string
 *           example: "TNT MERCURIO CARGAS E ENCOMENDAS EXPRESSAS LTDA"
 *         endereco:
 *           type: string
 *           example: "AV. MARGINAL DIREITA DO TIETE, 2500"
 *         municipio:
 *           type: string
 *           example: "SÃO PAULO"
 *         uf:
 *           type: string
 *           example: "SP"
 *     
 *     EnderecoEntrega:
 *       type: object
 *       properties:
 *         endereco:
 *           type: string
 *           example: "R RIACHUELO,685"
 *         bairro:
 *           type: string
 *           example: "CAVALHADA I"
 *         cep:
 *           type: string
 *           example: "78216-010"
 *         cidade:
 *           type: string
 *           example: "CÃCERES"
 *         uf:
 *           type: string
 *           example: "MT"
 *         doca:
 *           type: string
 *           example: "71"
 *         rota:
 *           type: string
 *           example: ""
 *     
 *     NotaFiscalCompleta:
 *       type: object
 *       required:
 *         - nro
 *         - recebedor
 *         - remetente
 *         - transportadora
 *       properties:
 *         peso_calculo:
 *           type: number
 *           example: 1.032
 *         observacoes:
 *           type: string
 *           example: "Observações da nota fiscal"
 *         previsao_entrega:
 *           type: string
 *           format: date-time
 *           example: "2025-07-15T09:19:17.000000Z"
 *         chave_nf:
 *           type: string
 *           example: "35250761418042000131550040018757221276116250"
 *         ser:
 *           type: integer
 *           example: 4
 *         emi_nf:
 *           type: string
 *           format: date-time
 *           example: "2025-07-04T00:00:00.000000Z"
 *         nro:
 *           type: integer
 *           example: 1875722
 *         nro_pedido:
 *           type: integer
 *           example: 2413919
 *         peso_real:
 *           type: number
 *           example: 1.032
 *         cod_rep:
 *           type: integer
 *           example: 121
 *         nome_rep:
 *           type: string
 *           example: "PINHEIRO & SCRIVANTE REP. COMERCIAIS LTD"
 *         qtd_volumes:
 *           type: integer
 *           example: 1
 *         metro_cubico:
 *           type: number
 *           example: 0.01132866
 *         mensagem:
 *           type: string
 *           example: ""
 *         valor:
 *           type: number
 *           example: 748.14
 *         data_entrega:
 *           type: string
 *           example: ""
 *         status_nf:
 *           type: string
 *           enum: [pendente, em_transito, entregue, devolvida, cancelada, pedido reservado]
 *           example: "em_transito"
 *         nf_retida:
 *           type: boolean
 *           example: false
 *         valor_frete:
 *           type: number
 *           example: 25.50
 *         recebedor:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Recebedor'
 *         endereco_entrega:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EnderecoEntrega'
 *         remetente:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Remetente'
 *         transportadora:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Transportadora'
 *         ocorrencias:
 *           type: array
 *           description: Array de ocorrências de tracking (opcional)
 *           items:
 *             $ref: '#/components/schemas/Ocorrencia'
 *     
 *     WebhookResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "1 notas fiscais processadas com sucesso"
 *         data:
 *           type: object
 *           properties:
 *             processed:
 *               type: integer
 *               description: Quantidade de notas fiscais processadas
 *               example: 1
 *             total:
 *               type: integer
 *               description: Total de notas fiscais enviadas
 *               example: 1
 *             ocorrencias_processadas:
 *               type: integer
 *               description: Total de ocorrências de tracking processadas
 *               example: 4
 *             errors:
 *               type: array
 *               description: Lista de erros encontrados
 *               items:
 *                 type: string
 *               example: []
 *             duration_ms:
 *               type: integer
 *               description: Tempo de processamento em milissegundos
 *               example: 1250
 */

/**
 * @swagger
 * /api/webhook/notafiscal:
 *   post:
 *     summary: Receber dados de nota fiscal via webhook com ocorrências de tracking
 *     description: |
 *       Endpoint para receber dados completos de notas fiscais incluindo:
 *       - Dados da nota fiscal
 *       - Informações de cliente (recebedor)
 *       - Informações de embarcador (remetente) 
 *       - Informações da transportadora
 *       - Endereço de entrega (opcional)
 *       - **Ocorrências de tracking (NOVO)** - Array com histórico de eventos da nota fiscal
 *       
 *       O sistema processa automaticamente:
 *       - Cria/atualiza registros sem duplicar dados
 *       - Processa múltiplas notas fiscais em uma requisição
 *       - Salva todas as ocorrências de tracking com timestamps
 *       - Retorna detalhes do processamento incluindo contadores de ocorrências
 *     tags: [Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notfis
 *             properties:
 *               notfis:
 *                 type: array
 *                 description: Array de notas fiscais para processar
 *                 items:
 *                   $ref: '#/components/schemas/NotaFiscalCompleta'
 *           examples:
 *             com_ocorrencias:
 *               summary: Nota fiscal com ocorrências de tracking
 *               description: Exemplo completo incluindo 4 ocorrências de tracking
 *               value:
 *                 notfis:
 *                   - nro: 1875722
 *                     chave_nf: "35250761418042000131550040018757221276116250"
 *                     valor: 748.14
 *                     status_nf: "em_transito"
 *                     recebedor:
 *                       - documento: "24876491000369"
 *                         nome: "POLICLINICA QUALITY LTDA"
 *                     remetente:
 *                       - documento: "61418042000131"
 *                         nome: "CIRURGICA FERNANDES LTDA"
 *                     transportadora:
 *                       - cnpj: "95591723000119"
 *                         nome: "TNT MERCURIO LTDA"
 *                     ocorrencias:
 *                       - nro_nf: "1875722"
 *                         dataHoraEvento: "2025-01-07T00:18:24.000-03:00"
 *                         dataHoraEnvio: "2025-01-07T00:18:27.000-03:00"
 *                         codigo: "82"
 *                         descricao: "SAIDA DA UNIDADE"
 *                         complemento: "Saida da unidade JUNDIAI"
 *                       - nro_nf: "1875722"
 *                         dataHoraEvento: "2025-01-10T16:20:10.000-03:00"
 *                         dataHoraEnvio: "2025-01-10T16:20:13.000-03:00"
 *                         codigo: "05"
 *                         descricao: "ENTREGA REALIZADA"
 *                         nomeRecebedor: "CARLOS ROBERTO"
 *                         docRecebedor: "84587962585"
 *                         linkComprovante: "https://comprovante.tnt.com/12345.pdf"
 *             sem_ocorrencias:
 *               summary: Nota fiscal simples (sem tracking)
 *               description: Exemplo básico apenas com dados da nota fiscal
 *               value:
 *                 notfis:
 *                   - nro: 12345
 *                     valor: 1000.50
 *                     recebedor:
 *                       - documento: "12345678000195"
 *                         nome: "EMPRESA TESTE LTDA"
 *                     remetente:
 *                       - documento: "98765432000198"
 *                         nome: "FORNECEDOR TESTE LTDA"
 *                     transportadora:
 *                       - cnpj: "11111111000111"
 *                         nome: "TRANSPORTADORA TESTE LTDA"
 *     responses:
 *       200:
 *         description: Dados processados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookResponse'
 *             examples:
 *               sucesso_com_ocorrencias:
 *                 summary: Processamento com ocorrências
 *                 value:
 *                   success: true
 *                   message: "1 notas fiscais processadas com sucesso"
 *                   data:
 *                     processed: 1
 *                     total: 1
 *                     ocorrencias_processadas: 4
 *                     errors: []
 *                     duration_ms: 1250
 *               sucesso_sem_ocorrencias:
 *                 summary: Processamento sem ocorrências
 *                 value:
 *                   success: true
 *                   message: "1 notas fiscais processadas com sucesso"
 *                   data:
 *                     processed: 1
 *                     total: 1
 *                     ocorrencias_processadas: 0
 *                     errors: []
 *                     duration_ms: 350
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Dados inválidos"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/notafiscal',
  validate(webhookNotaFiscalSchema),
  controller.receiveNotaFiscal.bind(controller)
);

/**
 * @swagger
 * /api/webhook/status:
 *   get:
 *     summary: Verificar status do webhook
 *     description: Endpoint para verificar se o webhook está funcionando e quais recursos suporta
 *     tags: [Webhook]
 *     responses:
 *       200:
 *         description: Status do webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Webhook ativo - suporta notas fiscais e ocorrências de tracking"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-16T14:30:00.000Z"
 *                 version:
 *                   type: string
 *                   example: "1.1.0"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["notas_fiscais", "ocorrencias_tracking", "clientes", "embarcadores", "transportadoras"]
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook ativo - suporta notas fiscais e ocorrências de tracking',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    features: ['notas_fiscais', 'ocorrencias_tracking', 'clientes', 'embarcadores', 'transportadoras']
  });
});

// Middleware de log para todas as requisições do webhook
router.use((req, res, next) => {
  logger.info('Webhook request received', {
    method: req.method,
    url: req.originalUrl,
    body: req.body ? {
      notfis_count: req.body.notfis?.length || 0,
      has_ocorrencias: req.body.notfis?.some(nf => nf.ocorrencias && nf.ocorrencias.length > 0) || false,
      total_ocorrencias: req.body.notfis?.reduce((acc, nf) => acc + (nf.ocorrencias?.length || 0), 0) || 0
    } : null,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

module.exports = router;