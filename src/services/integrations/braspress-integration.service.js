// ==========================================
// 4. EXEMPLOS DE USO - ADICIONANDO NOVA TRANSPORTADORA
// ==========================================
// examples/add-new-integration.js

/**
 * Exemplo: Como adicionar uma nova integração (Braspress)
 */

// 1. Criar serviço de integração
// backend/src/services/integrations/braspress-integration.service.js

const axios = require('axios');
const xml2js = require('xml2js');
const BaseIntegrationService = require('./base-integration.service');

class BraspressIntegrationService extends BaseIntegrationService {
  constructor(config = {}) {
    super({
      name: 'braspress',
      timeout: 45000,
      retryAttempts: 3,
      rateLimitRequests: 500,
      rateLimitPer: 'hour',
      ...config
    });

    this.baseURL = config.baseURL || 'https://api.braspress.com.br';
    this.soapAction = 'http://tempuri.org/ConsultarRemessa';
  }

  async consultarAPI(numeroNF, transportadoraConfig) {
    await this.checkRateLimit();

    // Montar SOAP XML
    const soapEnvelope = `
      <?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <ConsultarRemessa xmlns="http://tempuri.org/">
            <usuario>${transportadoraConfig.usuario}</usuario>
            <senha>${transportadoraConfig.senha}</senha>
            <numeroRemessa>${numeroNF}</numeroRemessa>
          </ConsultarRemessa>
        </soap:Body>
      </soap:Envelope>
    `;

    const response = await axios.post(this.baseURL + '/ws/tracking.asmx', soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': this.soapAction
      },
      timeout: this.timeout
    });

    if (response.status !== 200) {
      throw new Error(`API Braspress retornou status ${response.status}`);
    }

    // Parser XML para JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    return result;
  }

  parseResponse(response, numeroNF) {
    const ocorrencias = [];

    try {
      const eventos = response['soap:Envelope']['soap:Body']['ConsultarRemessaResponse']['ConsultarRemessaResult']['Eventos']['Evento'];
      const eventArray = Array.isArray(eventos) ? eventos : [eventos];

      for (const evento of eventArray) {
        const ocorrencia = {
          nro_nf: parseInt(numeroNF),
          codigo: this.mapearCodigoBraspress(evento.Codigo),
          descricao: evento.Descricao || 'Evento sem descrição',
          dataHoraEvento: this.parseDate(evento.Data, evento.Hora),
          dataHoraEnvio: new Date(),
          nomeRecebedor: evento.Recebedor || null,
          docRecebedor: null,
          latitude: null,
          longitude: null,
          linkComprovante: null
        };

        ocorrencias.push(ocorrencia);
      }

    } catch (error) {
      logger.warn(`Erro ao processar resposta Braspress para NF ${numeroNF}:`, error);
    }

    return ocorrencias;
  }

  mapearCodigoBraspress(codigoBraspress) {
    const mapeamento = {
      '01': 1,  // Coleta
      '02': 2,  // Transferência
      '03': 3,  // Saiu para entrega
      '04': 4,  // Entregue
      '05': 5,  // Tentativa
      '06': 6   // Devolvido
    };

    return mapeamento[codigoBraspress] || 99;
  }

  parseDate(data, hora) {
    try {
      const dateStr = `${data} ${hora}`;
      return new Date(dateStr);
    } catch (error) {
      return null;
    }
  }
}

// 2. Registrar no factory
// backend/src/services/integrations/integration-factory.js (ADICIONAR)

const BraspressIntegrationService = require('./braspress-integration.service');

// No método initialize():
this.register('braspress', BraspressIntegrationService);

// 3. Atualizar validações
// backend/src/validations/jobs.validation.js (ATUALIZAR)

integracao: Joi.string()
  .valid('jamef', 'braspress', 'tnt', 'correios') // Adicionar 'braspress'
  .required()

// 4. Configurar no banco
/**
 * INSERT INTO settings (slug, env, settings)
 * VALUES ('integration_config', 'production', '{
 *   "rate_limits": {
 *     "braspress": {"requests": 500, "per": "hour"}
 *   },
 *   "timeouts": {
 *     "braspress": 45000
 *   }
 * }')
 * ON CONFLICT (slug, env) DO UPDATE SET settings = settings || EXCLUDED.settings;
 */