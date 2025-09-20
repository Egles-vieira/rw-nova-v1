// ==========================================
// 4. EXTERNAL OCORRENCIAS CONTROLLER
// ==========================================
// backend/src/controllers/external-ocorrencias.controller.js

const BaseController = require('./base.controller');
const OcorrenciaProcessorService = require('../services/external/ocorrencia-processor.service');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class ExternalOcorrenciasController extends BaseController {
  constructor(repositories) {
    super(repositories.externalLogs);
    this.repositories = repositories;
    this.processor = new OcorrenciaProcessorService(repositories);
  }

  // Receber ocorrências via API externa
  async receiveOcorrencias(req, res) {
    try {
      const startTime = Date.now();
      const { ocorrencias } = req.body;

      // Validações básicas
      if (!ocorrencias) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Campo "ocorrencias" é obrigatório no body da requisição'
        });
      }

      if (!Array.isArray(ocorrencias)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Campo "ocorrencias" deve ser um array'
        });
      }

      if (ocorrencias.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Array "ocorrencias" não pode estar vazio'
        });
      }

      // Limite de processamento por request
      if (ocorrencias.length > 200) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Máximo de 200 ocorrências por requisição'
        });
      }

      logger.info('Recebendo ocorrências via API externa:', {
        integracao: req.externalAuth.integracao,
        transportadora: req.externalAuth.transportadora.nome,
        quantidade: ocorrencias.length,
        ip: req.ip
      });

      // Processar ocorrências
      const results = await this.processor.processOcorrencias(
        ocorrencias,
        req.externalAuth.token.token
      );

      const processingTime = Date.now() - startTime;

      // Log do resultado
      logger.info('Processamento de ocorrências concluído:', {
        integracao: req.externalAuth.integracao,
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        errors: results.errors,
        processingTime: `${processingTime}ms`
      });

      // Registrar operação no banco
      await this.logExternalOperation(req, 'ocorrencias', results);

      // Resposta de sucesso
      const httpStatus = results.errors > 0 ? HTTP_STATUS.PARTIAL_CONTENT : HTTP_STATUS.OK;

      return res.status(httpStatus).json({
        success: true,
        message: `${results.processed} ocorrências processadas`,
        data: {
          summary: {
            processed: results.processed,
            created: results.created,
            updated: results.updated,
            errors: results.errors,
            processing_time_ms: processingTime
          },
          details: results.details
        },
        integracao: req.externalAuth.integracao,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao processar ocorrências externas:', error);

      // Log do erro
      await this.logExternalOperation(req, 'ocorrencias', { error: error.message });

      return this.handleError(res, error, {
        integracao: req.externalAuth?.integracao,
        operation: 'receive_ocorrencias'
      });
    }
  }

  // Consultar ocorrências de uma nota fiscal
  async consultarOcorrenciasNF(req, res) {
    try {
      const { nro_nf } = req.params;
      const { limite = 50 } = req.query;

      if (!nro_nf) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Número da nota fiscal é obrigatório'
        });
      }

      // Buscar nota fiscal
      const notaFiscal = await this.repositories.notas.findByNroCtrc(parseInt(nro_nf));

      if (!notaFiscal) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      // Buscar ocorrências
      const ocorrencias = await this.repositories.ocorrencias.findByNroNF(
        notaFiscal.nro_ctrc,
        parseInt(limite)
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          nota_fiscal: {
            nro: notaFiscal.nro,
            chave_nf: notaFiscal.chave_cte,
            status: notaFiscal.status_nf,
            finalizada: notaFiscal.finalizada
          },
          ocorrencias: ocorrencias.map(ocorrencia => ({
            codigo: ocorrencia.codigo,
            descricao: ocorrencia.descricao,
            data_evento: ocorrencia.dataHoraEvento,
            recebedor: ocorrencia.nomeRecebedor,
            documento_recebedor: ocorrencia.docRecebedor,
            localizacao: ocorrencia.latitude && ocorrencia.longitude ? {
              latitude: ocorrencia.latitude,
              longitude: ocorrencia.longitude
            } : null,
            comprovante: ocorrencia.linkComprovante,
            data_registro: ocorrencia.created_at
          })),
          total: ocorrencias.length
        }
      });

    } catch (error) {
      logger.error('Erro ao consultar ocorrências da NF:', error);
      return this.handleError(res, error);
    }
  }

  // Webhook para receber notificações
  async webhook(req, res) {
    try {
      const { evento, dados } = req.body;

      logger.info('Webhook recebido:', {
        integracao: req.externalAuth.integracao,
        evento: evento,
        dados: dados,
        ip: req.ip
      });

      // Processar diferentes tipos de evento
      switch (evento) {
        case 'ocorrencia':
          await this.processWebhookOcorrencia(dados);
          break;
        case 'status_alterado':
          await this.processWebhookStatusAlterado(dados);
          break;
        default:
          logger.warn('Tipo de evento webhook desconhecido:', evento);
      }

      // Registrar webhook
      await this.logExternalOperation(req, 'webhook', { evento, dados });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook processado com sucesso',
        evento: evento
      });

    } catch (error) {
      logger.error('Erro ao processar webhook:', error);
      return this.handleError(res, error);
    }
  }

  // Processar webhook de ocorrência
  async processWebhookOcorrencia(dados) {
    try {
      if (dados && dados.nro_nf && dados.codigo) {
        await this.processor.processSingleOcorrencia(dados, 'webhook');
      }
    } catch (error) {
      logger.error('Erro ao processar webhook de ocorrência:', error);
    }
  }

  // Processar webhook de status alterado
  async processWebhookStatusAlterado(dados) {
    try {
      if (dados && dados.nro_nf && dados.novo_status) {
        const notaFiscal = await this.repositories.notas.findByNroCtrc(dados.nro_nf);
        
        if (notaFiscal) {
          await this.repositories.notas.update(notaFiscal.id, {
            status_nf: dados.novo_status,
            updated_at: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao processar webhook de status:', error);
    }
  }

  // Log de operação externa
  async logExternalOperation(req, operation, result) {
    try {
      const logData = {
        integracao: req.externalAuth.integracao,
        transportadora_id: req.externalAuth.transportadora.id,
        operacao: operation,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        resultado: result,
        request_size: JSON.stringify(req.body).length,
        created_at: new Date()
      };

      await this.repositories.externalLogs.create(logData);

    } catch (error) {
      logger.error('Erro ao registrar log de operação externa:', error);
    }
  }
}

module.exports = ExternalOcorrenciasController;

