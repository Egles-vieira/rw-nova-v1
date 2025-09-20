// ==========================================
// WEBHOOK CONTROLLER REFATORADO - USANDO PATTERN EXISTENTE
// ==========================================
// backend/src/controllers/webhook.controller.js

const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');
const WebhookService = require('../services/webhook.service');
const IntegrationFactory = require('../services/integrations/integration-factory');

class WebhookController {
  constructor() {
    this.service = new WebhookService();
  }

  // ==========================================
  // MÉTODO ÚNICO USANDO INTEGRATION FACTORY EXISTENTE
  // ==========================================
  async handleTransportadoraWebhook(req, res) {
    try {
      const { transportadora } = req.params || req.transportadora || 'generic';
      
      logger.info('Webhook recebido:', {
        transportadora: transportadora,
        ip: req.ip,
        contentLength: req.get('Content-Length'),
        userAgent: req.get('User-Agent')
      });

      // 1. Usar IntegrationFactory existente para obter o service
      const integrationService = this.getIntegrationService(transportadora);
      
      // 2. Transformar dados de webhook usando o service de integração
      const transformedData = await this.transformWebhookData(integrationService, req.body, transportadora);
      
      // 3. Processar dados usando WebhookService
      const result = await this.processTransformedData(transformedData);

      // 4. Resposta padronizada
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Webhook ${transportadora} processado com sucesso`,
        transportadora: transportadora,
        timestamp: new Date().toISOString(),
        data: result
      });

    } catch (error) {
      logger.error('Erro ao processar webhook:', {
        transportadora: req.params?.transportadora,
        error: error.message,
        stack: error.stack
      });
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Obter service de integração usando Factory existente
  getIntegrationService(transportadora) {
    try {
      // Tentar usar o IntegrationFactory existente
      if (IntegrationFactory.getAvailableServices().includes(transportadora)) {
        return IntegrationFactory.create(transportadora);
      }
      
      // Se não existe, retorna null para usar transformação genérica
      return null;
    } catch (error) {
      logger.warn(`Service de integração não encontrado para ${transportadora}:`, error.message);
      return null;
    }
  }

  // Transformar dados de webhook usando service existente ou genérico
  async transformWebhookData(integrationService, rawData, transportadora) {
    if (integrationService && typeof integrationService.parseWebhookData === 'function') {
      // Usar método específico do service se existir
      return await integrationService.parseWebhookData(rawData);
    }
    
    // Fallback para transformação genérica
    return this.genericWebhookTransform(rawData, transportadora);
  }

  // Transformação genérica para transportadoras sem service específico
  genericWebhookTransform(rawData, transportadora) {
    const result = { notfis: [], ocorrencias: [] };

    // Detectar formato automaticamente
    if (rawData.notfis && Array.isArray(rawData.notfis)) {
      result.notfis = rawData.notfis;
    }

    if (rawData.ocorrencias && Array.isArray(rawData.ocorrencias)) {
      result.ocorrencias = rawData.ocorrencias;
    }

    // Tentar inferir formato baseado na estrutura
    if (result.notfis.length === 0 && result.ocorrencias.length === 0) {
      result = this.inferWebhookFormat(rawData, transportadora);
    }

    return result;
  }

  // Inferir formato baseado na transportadora e estrutura de dados
  inferWebhookFormat(rawData, transportadora) {
    const result = { notfis: [], ocorrencias: [] };

    switch (transportadora.toLowerCase()) {
      case 'jamef':
        return this.transformJamefWebhook(rawData);
      case 'braspress':
        return this.transformBraspressWebhook(rawData);
      case 'tnt':
        return this.transformTNTWebhook(rawData);
      default:
        return this.autoDetectFormat(rawData);
    }
  }

  // Transformações específicas rápidas (baseadas nos services existentes)
  transformJamefWebhook(rawData) {
    const result = { notfis: [], ocorrencias: [] };

    // Baseado no JamefIntegrationService existente
    if (rawData.tracking && Array.isArray(rawData.tracking)) {
      for (const track of rawData.tracking) {
        if (track.nf_number) {
          result.notfis.push({
            nro_nf: track.nf_number,
            serie_nf: track.series,
            valor_nf: track.value,
            peso_nf: track.weight,
            cliente: track.customer_name ? {
              nome: track.customer_name,
              cnpj: track.customer_cnpj
            } : null,
            transportadora: {
              nome: 'Jamef',
              cnpj: '02404952000115'
            }
          });
        }
      }
    }

    if (rawData.events && Array.isArray(rawData.events)) {
      for (const event of rawData.events) {
        if (event.nf_number && event.event_code) {
          result.ocorrencias.push({
            nro_nf: event.nf_number,
            codigo: event.event_code,
            descricao: event.event_description,
            data_ocorrencia: event.event_date
          });
        }
      }
    }

    return result;
  }

  transformBraspressWebhook(rawData) {
    const result = { notfis: [], ocorrencias: [] };

    // Baseado no padrão do BraspressIntegrationService
    if (rawData.evento === 'nova_coleta' && rawData.dados) {
      result.notfis.push({
        nro_nf: rawData.dados.numero_nota,
        serie_nf: rawData.dados.serie,
        valor_nf: rawData.dados.valor,
        peso_nf: rawData.dados.peso,
        cliente: rawData.dados.remetente ? {
          nome: rawData.dados.remetente.nome,
          cnpj: rawData.dados.remetente.cnpj
        } : null,
        transportadora: {
          nome: 'Braspress',
          cnpj: '48588595000100'
        }
      });
    }

    if (rawData.evento === 'tracking_update' && rawData.dados) {
      result.ocorrencias.push({
        nro_nf: rawData.dados.numero_nota,
        codigo: rawData.dados.codigo_evento,
        descricao: rawData.dados.descricao_evento,
        data_ocorrencia: rawData.dados.data_evento
      });
    }

    return result;
  }

  transformTNTWebhook(rawData) {
    const result = { notfis: [], ocorrencias: [] };

    // TNT geralmente envia apenas tracking
    if (rawData.shipments && Array.isArray(rawData.shipments)) {
      for (const shipment of rawData.shipments) {
        if (shipment.events && Array.isArray(shipment.events)) {
          for (const event of shipment.events) {
            result.ocorrencias.push({
              nro_nf: shipment.reference || shipment.consignmentNumber,
              codigo: event.statusCode,
              descricao: event.statusDescription,
              data_ocorrencia: event.eventDate
            });
          }
        }
      }
    }

    return result;
  }

  autoDetectFormat(rawData) {
    const result = { notfis: [], ocorrencias: [] };

    // Auto-detecção baseada na estrutura dos dados
    if (Array.isArray(rawData)) {
      for (const item of rawData) {
        if (this.looksLikeNotaFiscal(item)) {
          result.notfis.push(item);
        } else if (this.looksLikeOcorrencia(item)) {
          result.ocorrencias.push(item);
        }
      }
    }

    return result;
  }

  looksLikeNotaFiscal(data) {
    const notaFields = ['nro_nf', 'numero_nf', 'nf_number', 'invoice_number'];
    const valorFields = ['valor', 'value', 'amount'];
    
    return notaFields.some(field => data[field]) && 
           valorFields.some(field => data[field]);
  }

  looksLikeOcorrencia(data) {
    const codigoFields = ['codigo', 'code', 'status_code', 'event_code'];
    const descricaoFields = ['descricao', 'description', 'message'];
    
    return codigoFields.some(field => data[field]) && 
           descricaoFields.some(field => data[field]);
  }

  // Processar dados transformados
  async processTransformedData(transformedData) {
    let result = { processed: 0, errors: [] };

    if (transformedData.notfis && transformedData.notfis.length > 0) {
      const notasResult = await this.service.processNotasFiscais(transformedData.notfis);
      result.processed += notasResult.processed;
      result.errors = result.errors.concat(notasResult.errors);
    }

    if (transformedData.ocorrencias && transformedData.ocorrencias.length > 0) {
      const ocorrenciasResult = await this.service.processOcorrencias(transformedData.ocorrencias);
      result.processed += ocorrenciasResult.processed;
      result.errors = result.errors.concat(ocorrenciasResult.errors);
    }

    return result;
  }

  // Métodos originais mantidos
  async receiveNotaFiscal(req, res) {
    try {
      const { notfis } = req.body;
      const result = await this.service.processNotasFiscais(notfis);
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais processadas com sucesso',
        data: result
      });
    } catch (error) {
      logger.error('Erro ao processar notas fiscais:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async receiveOcorrencias(req, res) {
    try {
      const { ocorrencias } = req.body;
      const result = await this.service.processOcorrencias(ocorrencias);
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Ocorrências processadas com sucesso',
        data: result
      });
    } catch (error) {
      logger.error('Erro ao processar ocorrências:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async getStatus(req, res) {
    try {
      const integrationServices = IntegrationFactory.getAvailableServices();
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Sistema de webhook ativo',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          notafiscal: '/api/webhook/notafiscal',
          ocorrencias: '/api/webhook/ocorrencias',
          status: '/api/webhook/status',
          transportadoras: integrationServices.map(t => `/api/webhooks/${t}`)
        },
        integration_services: integrationServices,
        webhook_transformers: ['jamef', 'braspress', 'tnt', 'generic']
      });
    } catch (error) {
      logger.error('Erro ao obter status:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  
// Adicionar este método ao WebhookController existente

  /**
   * Receber e processar ocorrências via webhook
   * @route POST /api/webhook/ocorrencia
   */
  async receiveOcorrencia(req, res) {
    try {
      const { ocorrencias } = req.body;

      if (!ocorrencias) {
        return res.status(400).json({
          success: false,
          message: 'Payload deve conter array de ocorrências'
        });
      }

      logger.info('Recebendo webhook de ocorrências:', {
        quantidade: Array.isArray(ocorrencias) ? ocorrencias.length : 1,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Processar ocorrências usando o service
      const results = await this.webhookService.processOcorrencias(ocorrencias);

      // Determinar status de resposta baseado nos resultados
      const statusCode = results.errors.length === 0 ? 200 : 
                        results.processed > 0 ? 207 : 400; // 207 = Multi-Status

      const response = {
        success: results.processed > 0,
        message: `${results.processed} ocorrências processadas com sucesso`,
        data: {
          total: Array.isArray(ocorrencias) ? ocorrencias.length : 1,
          processed: results.processed,
          errors: results.errors.length
        }
      };

      // Incluir detalhes dos erros se houverem
      if (results.errors.length > 0) {
        response.errors = results.errors;
      }

      logger.info('Webhook de ocorrências processado:', {
        statusCode,
        processed: results.processed,
        errors: results.errors.length,
        duration: new Date() - req.startTime
      });

      return res.status(statusCode).json(response);

    } catch (error) {
      logger.error('Erro no webhook de ocorrências:', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      return res.status(500).json({
        success: false,
        message: 'Erro interno no processamento das ocorrências',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }





}

module.exports = WebhookController;