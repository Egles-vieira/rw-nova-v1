const BaseRepository = require('./base.repository');
const logger = require('../config/logger');
const Joi = require('joi');

class EnderecoEntregaRepository extends BaseRepository {
  constructor() {
    super('endereco_entrega');
    this.defaultLimit = this.defaultLimit || 20;
    this.maxLimit = this.maxLimit || 100;
  }

  // Buscar endereços por cliente
  async findByCliente(clienteId) {
    try {
      const result = await this.findAll({
        filters: { cliente_id: clienteId },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      logger.error('Erro ao buscar endereços por cliente:', error);
      throw error;
    }
  }

  /**
 * Buscar endereço de entrega por cliente e CEP
 */
async findByClienteAndCep(clienteId, cep) {
  try {
    const sql = `
      SELECT * FROM endereco_entrega 
      WHERE cliente_id = $1 
      AND cep = $2 
      LIMIT 1
    `;
    
    const result = await this.database.query(sql, [clienteId, cep]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Erro ao buscar endereço por cliente e CEP:', {
      cliente_id: clienteId,
      cep,
      error: error.message
    });
    throw error;
  }
}


// Adicionar este método ao EnderecoEntregaRepository

  /**
   * Processa endereço de entrega - cria novo ou atualiza existente
   * @param {Object} enderecoData - Dados do endereço
   * @param {number} clienteId - ID do cliente
   * @returns {Object} - Endereço processado com ID
   */
  async processEnderecoEntrega(enderecoData, clienteId) {
    try {
      // Validar dados obrigatórios
      if (!enderecoData.endereco || !enderecoData.cidade || !enderecoData.uf) {
        throw new Error('Endereço, cidade e UF são obrigatórios');
      }

      // Buscar endereço existente
      const enderecosExistentes = await this.findAll({
        filters: {
          endereco: enderecoData.endereco,
          cidade: enderecoData.cidade,
          uf: enderecoData.uf
        },
        limit: 1
      });

      // Se encontrou endereço existente, atualizar
      if (enderecosExistentes.data && enderecosExistentes.data.length > 0) {
        const enderecoExistente = enderecosExistentes.data[0];
        
        const dadosParaAtualizar = {
          bairro: enderecoData.bairro || enderecoExistente.bairro,
          cep: enderecoData.cep || enderecoExistente.cep,
          doca: enderecoData.doca || enderecoExistente.doca,
          rota: enderecoData.rota || enderecoExistente.rota,
          lat: enderecoData.latitude || enderecoExistente.lat,
          lon: enderecoData.longitude || enderecoExistente.lon,
          updated_at: new Date()
        };

        await this.update(enderecoExistente.id, dadosParaAtualizar);
        
        logger.debug('Endereço de entrega atualizado:', {
          id: enderecoExistente.id,
          endereco: enderecoData.endereco
        });

        return {
          id: enderecoExistente.id,
          isNew: false,
          endereco: enderecoExistente
        };
      }

      // Se não encontrou, criar novo endereço
      const novoEndereco = {
        cliente_id: clienteId,
        endereco: enderecoData.endereco,
        bairro: enderecoData.bairro || null,
        cidade: enderecoData.cidade,
        uf: enderecoData.uf,
        cep: enderecoData.cep || null,
        doca: enderecoData.doca || null,
        rota: enderecoData.rota || null,
        lat: enderecoData.latitude || null,
        lon: enderecoData.longitude || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const enderecoCreated = await this.create(novoEndereco);
      
      logger.debug('Endereço de entrega criado:', {
        id: enderecoCreated.id,
        endereco: enderecoData.endereco
      });

      return {
        id: enderecoCreated.id,
        isNew: true,
        endereco: enderecoCreated
      };

    } catch (error) {
      logger.error('Erro ao processar endereço de entrega no repositório:', {
        endereco: enderecoData.endereco,
        error: error.message
      });
      throw error;
    }
  }

  // Adicionar este método ao EnderecoEntregaRepository existente

  // Método específico para webhook - buscar endereço duplicado
  async findEnderecoEntregaDuplicado(endereco, cidade, uf) {
    try {
      const sql = `
        SELECT id FROM endereco_entrega 
        WHERE endereco = $1 
        AND cidade = $2 
        AND uf = $3 
        LIMIT 1
      `;
      
      const result = await this.executeQuery(sql, [endereco, cidade, uf]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar endereço duplicado:', {
        endereco,
        cidade, 
        uf,
        error: error.message
      });
      throw error;
    }
  }

  // Método melhorado para validar endereço único
  async validateUniqueEnderecoWebhook(endereco, cidade, uf, clienteId = null) {
    try {
      let sql = `
        SELECT id FROM endereco_entrega 
        WHERE endereco = $1 
        AND cidade = $2 
        AND uf = $3
      `;
      
      const params = [endereco, cidade, uf];
      
      if (clienteId) {
        sql += ` AND cliente_id = $4`;
        params.push(clienteId);
      }
      
      sql += ` LIMIT 1`;
      
      const result = await this.executeQuery(sql, params);
      return result.rows.length === 0; // true se não encontrou (é único)
    } catch (error) {
      logger.error('Erro ao validar endereço único:', error);
      return false; // Em caso de erro, assume que não é único para evitar duplicação
    }
  }

  // Buscar por CEP
  async findByCep(cep) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE cep = ? AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const [rows] = await this.db.execute(query, [cep]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar por coordenadas (proximidade)
  async findByCoordinates(latitude, longitude, radius = 1) {
    try {
      const query = `
        SELECT *, 
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
        sin(radians(latitude)))) AS distance
        FROM ${this.tableName}
        WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND deleted_at IS NULL
        HAVING distance < ?
        ORDER BY distance
        LIMIT 10
      `;
      
      const [rows] = await this.db.execute(query, [latitude, longitude, latitude, radius]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Buscar por município e UF
  async findByLocation(municipio, uf) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE municipio = ? AND uf = ? AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [municipio, uf]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Estatísticas de endereços
  async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as com_coordenadas,
          COUNT(DISTINCT uf) as total_ufs,
          COUNT(DISTINCT municipio) as total_municipios
        FROM ${this.tableName} 
        WHERE deleted_at IS NULL
      `;
      
      const [rows] = await this.db.execute(query);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }




  // Buscar endereços por cidade e UF
  async findByCidadeUf(cidade, uf) {
    try {
      const result = await this.findAll({
        filters: {
          cidade: `%${cidade}%`,
          uf: uf.toUpperCase()
        },
        orderBy: 'endereco',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      logger.error('Erro ao buscar endereços por cidade e UF:', error);
      throw error;
    }
  }

  // Buscar endereços com restrição
  async findComRestricao() {
    try {
      const result = await this.findAll({
        filters: { restrito: true },
        orderBy: 'cidade',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      logger.error('Erro ao buscar endereços com restrição:', error);
      throw error;
    }
  }

  // Buscar endereço com relacionamentos
async findWithRelations(id) {
  try {
    const query = `
      SELECT 
        ee.*,
        c.nome as cliente_nome,
        rl.nome as restricao_nome
      FROM endereco_entrega ee
      LEFT JOIN clientes c ON ee.cliente_id = c.id
      LEFT JOIN restricao_logistica rl ON ee.restricao_logistica_id = rl.id
      WHERE ee.id = $1  -- Removida a verificação de deleted_at
    `;
    
    const result = await this.executeQuery(query, [id]);
    return result.rows[0];
  } catch (error) {
    logger.error('Erro ao buscar endereço com relacionamentos:', error);
    throw error;
  }
}

  // Validar endereço único para cliente
  async validateUniqueEndereco(clienteId, endereco, cidade, uf, excludeId = null) {
    try {
      let filters = {
        cliente_id: clienteId,
        endereco: endereco,
        cidade: cidade,
        uf: uf.toUpperCase()
      };

      if (excludeId) {
        const result = await this.findBy(filters);
        return result.length === 0 || (result.length === 1 && result[0].id === parseInt(excludeId));
      } else {
        const result = await this.findBy(filters);
        return result.length === 0;
      }
    } catch (error) {
      logger.error('Erro ao validar endereço único:', error);
      throw error;
    }
  }

  // Atualizar coordenadas
  async updateCoordenadas(id, lat, lon) {
    try {
      return await this.update(id, {
        lat,
        lon,
        updated_at: new Date()
      });
    } catch (error) {
      logger.error('Erro ao atualizar coordenadas:', error);
      throw error;
    }
  }
}

// Validador personalizado para CEP brasileiro
const cepValidator = (value, helpers) => {
  if (!value) return value;
  
  const cleanValue = String(value).replace(/\D/g, '');
  if (cleanValue.length !== 8) {
    return helpers.error('any.invalid');
  }
  return cleanValue;
};

// Schema para criação de endereço de entrega
const createEnderecoEntrega = Joi.object({
  cliente_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Cliente é obrigatório',
      'number.base': 'Cliente deve ser um número',
      'number.integer': 'Cliente deve ser um número inteiro',
      'number.positive': 'Cliente deve ser um número positivo'
    }),

  endereco: Joi.string()
    .required()
    .max(255)
    .trim()
    .messages({
      'any.required': 'Endereço é obrigatório',
      'string.max': 'Endereço deve ter no máximo 255 caracteres',
      'string.empty': 'Endereço não pode estar vazio'
    }),

  bairro: Joi.string()
    .required()
    .max(255)
    .trim()
    .messages({
      'any.required': 'Bairro é obrigatório',
      'string.max': 'Bairro deve ter no máximo 255 caracteres',
      'string.empty': 'Bairro não pode estar vazio'
    }),

  cidade: Joi.string()
    .required()
    .max(255)
    .trim()
    .messages({
      'any.required': 'Cidade é obrigatória',
      'string.max': 'Cidade deve ter no máximo 255 caracteres',
      'string.empty': 'Cidade não pode estar vazia'
    }),

  uf: Joi.string()
    .required()
    .length(2)
    .uppercase()
    .messages({
      'any.required': 'UF é obrigatória',
      'string.length': 'UF deve ter 2 caracteres',
      'string.empty': 'UF não pode estar vazia'
    }),

  cep: Joi.string()
    .required()
    .custom(cepValidator)
    .messages({
      'any.required': 'CEP é obrigatório',
      'any.invalid': 'CEP deve ter 8 dígitos'
    }),

  doca: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Doca deve ter no máximo 255 caracteres'
    }),

  lat: Joi.number()
    .precision(6)
    .allow(null)
    .messages({
      'number.base': 'Latitude deve ser um número',
      'number.precision': 'Latitude deve ter no máximo 6 casas decimais'
    }),

  lon: Joi.number()
    .precision(6)
    .allow(null)
    .messages({
      'number.base': 'Longitude deve ser um número',
      'number.precision': 'Longitude deve ter no máximo 6 casas decimais'
    }),

  restricao_logistica_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Restrição logística deve ser um número',
      'number.integer': 'Restrição logística deve ser um número inteiro',
      'number.positive': 'Restrição logística deve ser um número positivo'
    }),

  restrito: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Restrito deve ser verdadeiro ou falso'
    }),

  rota: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Rota deve ter no máximo 255 caracteres'
    }),

  janela1: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 1 deve ter no máximo 50 caracteres'
    }),

  janela2: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 2 deve ter no máximo 50 caracteres'
    }),

  janela3: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 3 deve ter no máximo 50 caracteres'
    }),

  janela4: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 4 deve ter no máximo 50 caracteres'
    })
});

// Schema para atualização de endereço de entrega
const updateEnderecoEntrega = Joi.object({
  cliente_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Cliente deve ser um número',
      'number.integer': 'Cliente deve ser um número inteiro',
      'number.positive': 'Cliente deve ser um número positivo'
    }),

  endereco: Joi.string()
    .max(255)
    .trim()
    .messages({
      'string.max': 'Endereço deve ter no máximo 255 caracteres',
      'string.empty': 'Endereço não pode estar vazio'
    }),

  bairro: Joi.string()
    .max(255)
    .trim()
    .messages({
      'string.max': 'Bairro deve ter no máximo 255 caracteres',
      'string.empty': 'Bairro não pode estar vazio'
    }),

  cidade: Joi.string()
    .max(255)
    .trim()
    .messages({
      'string.max': 'Cidade deve ter no máximo 255 caracteres',
      'string.empty': 'Cidade não pode estar vazia'
    }),

  uf: Joi.string()
    .length(2)
    .uppercase()
    .messages({
      'string.length': 'UF deve ter 2 caracteres',
      'string.empty': 'UF não pode estar vazia'
    }),

  cep: Joi.string()
    .custom(cepValidator)
    .messages({
      'any.invalid': 'CEP deve ter 8 dígitos'
    }),

  doca: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Doca deve ter no máximo 255 caracteres'
    }),

  lat: Joi.number()
    .precision(6)
    .allow(null)
    .messages({
      'number.base': 'Latitude deve ser um número',
      'number.precision': 'Latitude deve ter no máximo 6 casas decimais'
    }),

  lon: Joi.number()
    .precision(6)
    .allow(null)
    .messages({
      'number.base': 'Longitude deve ser um número',
      'number.precision': 'Longitude deve ter no máximo 6 casas decimais'
    }),

  restricao_logistica_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Restrição logística deve ser um número',
      'number.integer': 'Restrição logística deve ser um número inteiro',
      'number.positive': 'Restrição logística deve ser um número positivo'
    }),

  restrito: Joi.boolean()
    .messages({
      'boolean.base': 'Restrito deve ser verdadeiro ou falso'
    }),

  rota: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Rota deve ter no máximo 255 caracteres'
    }),

  janela1: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 1 deve ter no máximo 50 caracteres'
    }),

  janela2: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 2 deve ter no máximo 50 caracteres'
    }),

  janela3: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 3 deve ter no máximo 50 caracteres'
    }),

  janela4: Joi.string()
    .allow(null, '')
    .max(50)
    .trim()
    .messages({
      'string.max': 'Janela 4 deve ter no máximo 50 caracteres'
    })
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para listagem com filtros
const listEnderecosEntrega = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Página deve ser um número',
      'number.integer': 'Página deve ser um número inteiro',
      'number.min': 'Página deve ser maior que 0'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limite deve ser um número',
      'number.integer': 'Limite deve ser um número inteiro',
      'number.min': 'Limite deve ser maior que 0',
      'number.max': 'Limite deve ser menor ou igual a 100'
    }),

  cliente_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Cliente deve ser um número',
      'number.integer': 'Cliente deve ser um número inteiro',
      'number.positive': 'Cliente deve ser um número positivo'
    }),

  cidade: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Cidade deve ter pelo menos 2 caracteres',
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    }),

  uf: Joi.string()
    .length(2)
    .uppercase()
    .messages({
      'string.length': 'UF deve ter 2 caracteres',
      'string.base': 'UF deve ser uma string'
    }),

  restrito: Joi.boolean()
    .messages({
      'boolean.base': 'Restrito deve ser verdadeiro ou falso'
    })
});

// Schema para parâmetros de rota
const enderecoEntregaParams = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'ID é obrigatório',
      'number.base': 'ID deve ser um número',
      'number.integer': 'ID deve ser um número inteiro',
      'number.positive': 'ID deve ser um número positivo'
    })
});

// Schema para atualização de coordenadas
const updateCoordenadasSchema = Joi.object({
  lat: Joi.number()
    .required()
    .precision(6)
    .messages({
      'any.required': 'Latitude é obrigatória',
      'number.base': 'Latitude deve ser um número',
      'number.precision': 'Latitude deve ter no máximo 6 casas decimais'
    }),

  lon: Joi.number()
    .required()
    .precision(6)
    .messages({
      'any.required': 'Longitude é obrigatória',
      'number.base': 'Longitude deve ser um número',
      'number.precision': 'Longitude deve ter no máximo 6 casas decimais'
    })
});

module.exports = {
  EnderecoEntregaRepository,
  createEnderecoEntrega,
  updateEnderecoEntrega,
  listEnderecosEntrega,
  enderecoEntregaParams,
  updateCoordenadasSchema
};