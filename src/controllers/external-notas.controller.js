// ==========================================
// 3. EXTERNAL NOTAS CONTROLLER
// ==========================================
// backend/src/controllers/external-notas.controller.js

const BaseController = require('./base.controller');
const NotaFiscalProcessorService = require('../services/external/nota-fiscal-processor.service');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class ExternalNotasController extends BaseController {
  constructor(repositories) {
    super(repositories.externalLogs); // Repository de logs
    this.repositories = repositories;
    this.processor = new NotaFiscalProcessorService(repositories);
  }

  // Receber notas fiscais via API externa
  async receiveNotasFiscais(req, res) {
    try {
      const startTime = Date.now();
      const { notfis } = req.body;

      // Validações básicas
      if (!notfis) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Campo "notfis" é obrigatório no body da requisição'
        });
      }

      if (!Array.isArray(notfis)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Campo "notfis" deve ser um array'
        });
      }

      if (notfis.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Array "notfis" não pode estar vazio'
        });
      }

      // Limite de processamento por request
      if (notfis.length > 100) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Máximo de 100 notas fiscais por requisição'
        });
      }

      logger.info('Recebendo notas fiscais via API externa:', {
        integracao: req.externalAuth.integracao,
        transportadora: req.externalAuth.transportadora.nome,
        quantidade: notfis.length,
        ip: req.ip
      });

      // Processar notas fiscais
      const results = await this.processor.processNotasFiscais(
        notfis, 
        req.externalAuth.token.token
      );

      const processingTime = Date.now() - startTime;

      // Log do resultado
      logger.info('Processamento de notas fiscais concluído:', {
        integracao: req.externalAuth.integracao,
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        errors: results.errors,
        processingTime: `${processingTime}ms`
      });

      // Registrar operação no banco
      await this.logExternalOperation(req, 'notas_fiscais', results);

      // Resposta de sucesso
      const httpStatus = results.errors > 0 ? HTTP_STATUS.PARTIAL_CONTENT : HTTP_STATUS.OK;
      
      return res.status(httpStatus).json({
        success: true,
        message: `${results.processed} notas fiscais processadas`,
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
      logger.error('Erro ao processar notas fiscais externas:', error);

      // Log do erro
      await this.logExternalOperation(req, 'notas_fiscais', { error: error.message });

      return this.handleError(res, error, {
        integracao: req.externalAuth?.integracao,
        operation: 'receive_notas_fiscais'
      });
    }
  }

  // Consultar status de nota fiscal
  async consultarStatusNF(req, res) {
    try {
      const { chave_nf } = req.params;

      if (!chave_nf) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Chave da nota fiscal é obrigatória'
        });
      }

      // Buscar nota fiscal
      const notaFiscal = await this.repositories.notas.findByChaveNF(chave_nf);

      if (!notaFiscal) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      // Buscar última ocorrência
      const ultimaOcorrencia = await this.repositories.ocorrencias.getLastOcorrencia(notaFiscal.nro_ctrc);

      // Buscar cliente e transportadora
      const [cliente, transportadora] = await Promise.all([
        this.repositories.clientes.findById(notaFiscal.cliente_id),
        this.repositories.transportadoras.findById(notaFiscal.transportadora_id)
      ]);

      const response = {
        success: true,
        data: {
          nota_fiscal: {
            nro: notaFiscal.nro,
            chave_nf: notaFiscal.chave_cte,
            status: notaFiscal.status_nf,
            finalizada: notaFiscal.finalizada,
            data_emissao: notaFiscal.emi_nf,
            previsao_entrega: notaFiscal.previsao_entrega,
            data_entrega: notaFiscal.data_entrega,
            valor: notaFiscal.valor,
            peso: notaFiscal.peso_real,
            volumes: notaFiscal.qtd_volumes
          },
          cliente: cliente ? {
            nome: cliente.nome,
            documento: cliente.cnpj,
            cidade: cliente.cidade,
            uf: cliente.uf
          } : null,
          transportadora: transportadora ? {
            nome: transportadora.nome,
            cnpj: transportadora.cnpj
          } : null,
          ultima_ocorrencia: ultimaOcorrencia ? {
            codigo: ultimaOcorrencia.codigo,
            descricao: ultimaOcorrencia.descricao,
            data_evento: ultimaOcorrencia.dataHoraEvento,
            recebedor: ultimaOcorrencia.nomeRecebedor
          } : null
        }
      };

      return res.status(HTTP_STATUS.OK).json(response);

    } catch (error) {
      logger.error('Erro ao consultar status da NF:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar notas fiscais por critérios
  async buscarNotasFiscais(req, res) {
    try {
      const {
        nro_pedido,
        data_inicio,
        data_fim,
        status,
        transportadora,
        limite = 50
      } = req.query;

      // Validações
      if (limite > 100) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Limite máximo de 100 registros por consulta'
        });
      }

      // Construir filtros
      const filtros = {
        limite: parseInt(limite)
      };

      if (nro_pedido) {
        filtros.nro_pedido = parseInt(nro_pedido);
      }

      if (data_inicio) {
        filtros.data_inicio = new Date(data_inicio);
      }

      if (data_fim) {
        filtros.data_fim = new Date(data_fim);
      }

      if (status) {
        filtros.status = status;
      }

      if (transportadora) {
        filtros.transportadora = transportadora;
      }

      // Buscar notas fiscais
      const notasFiscais = await this.repositories.notas.findWithFilters(filtros);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          notas_fiscais: notasFiscais,
          total: notasFiscais.length,
          filtros: filtros
        }
      });

    } catch (error) {
      logger.error('Erro ao buscar notas fiscais:', error);
      return this.handleError(res, error);
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

module.exports = ExternalNotasController;
