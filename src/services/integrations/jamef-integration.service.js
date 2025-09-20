// ==========================================
// 2. JAMEF INTEGRATION SERVICE
// ==========================================
// backend/src/services/integrations/jamef-integration.service.js

const axios = require('axios');
const BaseIntegrationService = require('./base-integration.service');
const logger = require('../../config/logger');

class JamefIntegrationService extends BaseIntegrationService {
  constructor(config = {}) {
    super({
      name: 'jamef',
      timeout: 15000,
      retryAttempts: 3,
      rateLimitRequests: 100,
      rateLimitPer: 'minute',
      ...config
    });

    this.baseURL = config.baseURL || 'https://api.jamef.com.br';
    this.apiVersion = config.apiVersion || 'v1';
  }

  async consultarAPI(numeroNF, transportadoraConfig) {
    await this.checkRateLimit();

    const url = `${this.baseURL}/${this.apiVersion}/rastreamento`;
    const headers = {
      'Authorization': `Bearer ${transportadoraConfig.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    logger.info(`Consultando API Jamef para NF ${numeroNF}`);

    const response = await axios.post(url, {
      numero_nf: numeroNF,
      tipo: 'nota_fiscal'
    }, {
      headers,
      timeout: this.timeout
    });

    if (response.status !== 200) {
      throw new Error(`API Jamef retornou status ${response.status}`);
    }

    return response.data;
  }

  parseResponse(response, numeroNF) {
    const ocorrencias = [];

    if (!response || !response.eventos) {
      logger.warn(`Resposta vazia da API Jamef para NF ${numeroNF}`);
      return ocorrencias;
    }

    for (const evento of response.eventos) {
      const ocorrencia = {
        nro_nf: parseInt(numeroNF),
        codigo: this.mapearCodigoJamef(evento.codigo),
        descricao: evento.descricao || 'Evento sem descrição',
        dataHoraEvento: this.parseDate(evento.data_hora),
        dataHoraEnvio: new Date(),
        nomeRecebedor: evento.recebedor?.nome || null,
        docRecebedor: evento.recebedor?.documento || null,
        latitude: evento.localizacao?.latitude || null,
        longitude: evento.localizacao?.longitude || null,
        linkComprovante: evento.comprovante_url || null
      };

      ocorrencias.push(ocorrencia);
    }

    logger.info(`${ocorrencias.length} ocorrências processadas da API Jamef para NF ${numeroNF}`);
    return ocorrencias;
  }

  mapearCodigoJamef(codigoJamef) {
    // Mapeamento dos códigos Jamef para códigos internos
    const mapeamento = {
      '01': 1,  // Coleta realizada
      '02': 2,  // Em trânsito
      '03': 3,  // Saiu para entrega
      '04': 4,  // Entregue
      '05': 5,  // Tentativa de entrega
      '06': 6,  // Devolvido
      '99': 99  // Outros
    };

    return mapeamento[codigoJamef] || 99;
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Assumindo formato 'YYYY-MM-DD HH:mm:ss'
      return new Date(dateString);
    } catch (error) {
      logger.warn(`Erro ao processar data: ${dateString}`);
      return null;
    }
  }


async parseWebhookData(webhookData) {
  const result = { notfis: [], ocorrencias: [] };

  try {
    // Usar a mesma lógica de parseResponse mas adaptada para webhook
    if (webhookData.tracking && Array.isArray(webhookData.tracking)) {
      for (const track of webhookData.tracking) {
        if (track.nf_number) {
          const nota = {
            nro_nf: track.nf_number,
            serie_nf: track.series,
            valor_nf: parseFloat(track.value) || null,
            peso_nf: parseFloat(track.weight) || null,
            data_emissao: this.parseDate(track.emission_date),
            
            cliente: track.customer_name ? {
              nome: track.customer_name,
              cnpj: track.customer_cnpj,
              endereco: track.customer_address,
              municipio: track.customer_city,
              uf: track.customer_state
            } : null,
            
            transportadora: {
              nome: 'Jamef',
              cnpj: '02404952000115'
            },
            
            endereco_entrega: track.delivery_address ? {
              destinatario: track.delivery_name,
              endereco: track.delivery_address,
              municipio: track.delivery_city,
              uf: track.delivery_state,
              cep: track.delivery_zip
            } : null
          };
          
          result.notfis.push(nota);
        }
      }
    }

    if (webhookData.events && Array.isArray(webhookData.events)) {
      for (const event of webhookData.events) {
        if (event.nf_number && event.event_code) {
          const ocorrencia = {
            nro_nf: event.nf_number,
            codigo: this.mapearCodigoJamef(event.event_code),
            descricao: event.event_description || 'Evento sem descrição',
            data_ocorrencia: this.parseDate(event.event_date),
            latitude: parseFloat(event.latitude) || null,
            longitude: parseFloat(event.longitude) || null,
            linkComprovante: event.proof_link || null
          };
          
          result.ocorrencias.push(ocorrencia);
        }
      }
    }

    logger.info(`Webhook Jamef processado: ${result.notfis.length} notas, ${result.ocorrencias.length} ocorrências`);
    return result;

  } catch (error) {
    logger.error('Erro ao processar webhook Jamef:', error);
    throw new Error(`Erro no processamento do webhook Jamef: ${error.message}`);
  }
}



}

module.exports = JamefIntegrationService;