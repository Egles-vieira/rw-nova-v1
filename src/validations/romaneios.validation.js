const Joi = require('joi');

// Schema para criação de romaneio
const createRomaneioSchema = Joi.object({
  numero: Joi.number()
    .integer()
    .positive()
    .max(999999999)
    .messages({
      'number.base': 'Número deve ser um valor numérico',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser positivo',
      'number.max': 'Número deve ter no máximo 9 dígitos'
    }),

  unidade: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.base': 'Unidade deve ser um texto',
      'string.max': 'Unidade deve ter no máximo 255 caracteres'
    }),

  placa_cavalo: Joi.string()
    .trim()
    .required()
    .pattern(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/)
    .messages({
      'string.base': 'Placa do cavalo deve ser um texto',
      'string.empty': 'Placa do cavalo é obrigatória',
      'any.required': 'Placa do cavalo é obrigatória',
      'string.pattern.base': 'Formato de placa inválido (ex: ABC1234 ou ABC1D23)'
    }),

  placa_carreta: Joi.string()
    .trim()
    .pattern(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/)
    .allow('')
    .messages({
      'string.base': 'Placa da carreta deve ser um texto',
      'string.pattern.base': 'Formato de placa inválido (ex: ABC1234 ou ABC1D23)'
    }),

  emissao: Joi.date()
    .required()
    .messages({
      'date.base': 'Data de emissão deve ser uma data válida',
      'any.required': 'Data de emissão é obrigatória'
    }),

  motorista_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID do motorista deve ser um número',
      'number.integer': 'ID do motorista deve ser um número inteiro',
      'number.positive': 'ID do motorista deve ser positivo',
      'any.required': 'ID do motorista é obrigatório'
    }),

  capacidade_veiculo: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Capacidade do veículo deve ser um número',
      'number.positive': 'Capacidade do veículo deve ser positiva'
    }),

  roteirizacao: Joi.string()
    .valid('manual', 'automatica', 'otimizada')
    .default('manual')
    .messages({
      'string.base': 'Roteirização deve ser um texto',
      'any.only': 'Roteirização deve ser: manual, automatica ou otimizada'
    }),

  roteirizacao_id: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.base': 'ID da roteirização deve ser um texto',
      'string.max': 'ID da roteirização deve ter no máximo 255 caracteres'
    }),

  rotas: Joi.object()
    .messages({
      'object.base': 'Rotas deve ser um objeto JSON válido'
    }),

  markers: Joi.object()
    .messages({
      'object.base': 'Markers deve ser um objeto JSON válido'
    }),

  maplink_info: Joi.object()
    .messages({
      'object.base': 'Informações do Maplink deve ser um objeto JSON válido'
    }),

  peso: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Peso deve ser um número',
      'number.positive': 'Peso deve ser positivo'
    }),

  cubagem: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Cubagem deve ser um número',
      'number.positive': 'Cubagem deve ser positiva'
    }),

  doca: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.base': 'Doca deve ser um texto',
      'string.max': 'Doca deve ter no máximo 255 caracteres'
    }),

  roteirizar: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Roteirizar deve ser verdadeiro ou falso'
    })
});

// Schema para atualização de romaneio
const updateRomaneioSchema = Joi.object({
  numero: Joi.number()
    .integer()
    .positive()
    .max(999999999)
    .messages({
      'number.base': 'Número deve ser um valor numérico',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser positivo',
      'number.max': 'Número deve ter no máximo 9 dígitos'
    }),

  unidade: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.base': 'Unidade deve ser um texto',
      'string.max': 'Unidade deve ter no máximo 255 caracteres'
    }),

  placa_cavalo: Joi.string()
    .trim()
    .pattern(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/)
    .messages({
      'string.base': 'Placa do cavalo deve ser um texto',
      'string.pattern.base': 'Formato de placa inválido (ex: ABC1234 ou ABC1D23)'
    }),

  placa_carreta: Joi.string()
    .trim()
    .pattern(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/)
    .allow('')
    .messages({
      'string.base': 'Placa da carreta deve ser um texto',
      'string.pattern.base': 'Formato de placa inválido (ex: ABC1234 ou ABC1D23)'
    }),

  emissao: Joi.date()
    .messages({
      'date.base': 'Data de emissão deve ser uma data válida'
    }),

  motorista_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'ID do motorista deve ser um número',
      'number.integer': 'ID do motorista deve ser um número inteiro',
      'number.positive': 'ID do motorista deve ser positivo'
    }),

  capacidade_veiculo: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Capacidade do veículo deve ser um número',
      'number.positive': 'Capacidade do veículo deve ser positiva'
    }),

  roteirizacao: Joi.string()
    .valid('manual', 'automatica', 'otimizada')
    .messages({
      'string.base': 'Roteirização deve ser um texto',
      'any.only': 'Roteirização deve ser: manual, automatica ou otimizada'
    }),

  roteirizacao_id: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.base': 'ID da roteirização deve ser um texto',
      'string.max': 'ID da roteirização deve ter no máximo 255 caracteres'
    }),

  rotas: Joi.object()
    .messages({
      'object.base': 'Rotas deve ser um objeto JSON válido'
    }),

  markers: Joi.object()
    .messages({
      'object.base': 'Markers deve ser um objeto JSON válido'
    }),

  maplink_info: Joi.object()
    .messages({
      'object.base': 'Informações do Maplink deve ser um objeto JSON válido'
    }),

  peso: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Peso deve ser um número',
      'number.positive': 'Peso deve ser positivo'
    }),

  cubagem: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Cubagem deve ser um número',
      'number.positive': 'Cubagem deve ser positiva'
    }),

  doca: Joi.string()
    .trim()
    .max(255)
    .messages({
      'string.base': 'Doca deve ser um texto',
      'string.max': 'Doca deve ter no máximo 255 caracteres'
    }),

  roteirizar: Joi.boolean()
    .messages({
      'boolean.base': 'Roteirizar deve ser verdadeiro ou falso'
    })
}).min(1).messages({
  'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
});

// Schema para atualização de rotas
const updateRotasSchema = Joi.object({
  rotas: Joi.object()
    .messages({
      'object.base': 'Rotas deve ser um objeto JSON válido'
    }),

  markers: Joi.object()
    .messages({
      'object.base': 'Markers deve ser um objeto JSON válido'
    }),

  maplink_info: Joi.object()
    .messages({
      'object.base': 'Informações do Maplink deve ser um objeto JSON válido'
    })
}).min(1).messages({
  'object.min': 'Pelo menos um campo deve ser fornecido'
});

// Schema para query parameters
const queryRomaneiosSchema = Joi.object({
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
      'number.base': 'Limit deve ser um número',
      'number.integer': 'Limit deve ser um número inteiro',
      'number.min': 'Limit deve ser maior que 0',
      'number.max': 'Limit deve ser no máximo 100'
    }),

  orderBy: Joi.string()
    .valid('id', 'numero', 'emissao', 'created_at', 'updated_at')
    .default('created_at')
    .messages({
      'string.base': 'OrderBy deve ser um texto',
      'any.only': 'OrderBy deve ser: id, numero, emissao, created_at ou updated_at'
    }),

  orderDirection: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'string.base': 'OrderDirection deve ser um texto',
      'any.only': 'OrderDirection deve ser: asc ou desc'
    }),

  numero: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Número deve ser um valor numérico',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser positivo'
    }),

  motorista_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'ID do motorista deve ser um número',
      'number.integer': 'ID do motorista deve ser um número inteiro',
      'number.positive': 'ID do motorista deve ser positivo'
    }),

  placa_cavalo: Joi.string()
    .trim()
    .messages({
      'string.base': 'Placa do cavalo deve ser um texto'
    }),

  roteirizacao: Joi.string()
    .valid('manual', 'automatica', 'otimizada')
    .messages({
      'string.base': 'Roteirização deve ser um texto',
      'any.only': 'Roteirização deve ser: manual, automatica ou otimizada'
    }),

  roteirizar: Joi.boolean()
    .messages({
      'boolean.base': 'Roteirizar deve ser verdadeiro ou falso'
    }),

  unidade: Joi.string()
    .trim()
    .messages({
      'string.base': 'Unidade deve ser um texto'
    }),

  doca: Joi.string()
    .trim()
    .messages({
      'string.base': 'Doca deve ser um texto'
    }),

  data_inicio: Joi.date()
    .messages({
      'date.base': 'Data início deve ser uma data válida'
    }),

  data_fim: Joi.date()
    .messages({
      'date.base': 'Data fim deve ser uma data válida'
    })
});

// Schema para parâmetros de rota
const paramsRomaneioSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID deve ser um número',
      'number.integer': 'ID deve ser um número inteiro',
      'number.positive': 'ID deve ser positivo',
      'any.required': 'ID é obrigatório'
    })
});

const numeroParamSchema = Joi.object({
  numero: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Número deve ser um valor numérico',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser positivo',
      'any.required': 'Número é obrigatório'
    })
});

const placaParamSchema = Joi.object({
  placa: Joi.string()
    .trim()
    .required()
    .messages({
      'string.base': 'Placa deve ser um texto',
      'string.empty': 'Placa é obrigatória',
      'any.required': 'Placa é obrigatória'
    })
});

const motoristaParamSchema = Joi.object({
  motorista_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID do motorista deve ser um número',
      'number.integer': 'ID do motorista deve ser um número inteiro',
      'number.positive': 'ID do motorista deve ser positivo',
      'any.required': 'ID do motorista é obrigatório'
    })
});

const roteirizacaoParamSchema = Joi.object({
  status: Joi.string()
    .valid('manual', 'automatica', 'otimizada')
    .required()
    .messages({
      'string.base': 'Status deve ser um texto',
      'any.only': 'Status deve ser: manual, automatica ou otimizada',
      'any.required': 'Status é obrigatório'
    })
});

module.exports = {
  createRomaneioSchema,
  updateRomaneioSchema,
  updateRotasSchema,
  queryRomaneiosSchema,
  paramsRomaneioSchema,
  numeroParamSchema,
  placaParamSchema,
  motoristaParamSchema,
  roteirizacaoParamSchema
};