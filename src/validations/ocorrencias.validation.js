// validations/ocorrencias.validation.js
const Joi = require('joi');

// Tipos válidos
const TIPOS_VALIDOS = ['entrega', 'coleta', 'ocorrencia', 'status', 'informativo'];
const PROCESSOS_VALIDOS = ['transporte', 'entrega', 'coleta', 'finalizacao', 'cancelamento', 'informativo'];

// Schema para criação
const createOcorrencia = Joi.object({
  codigo: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código é obrigatório',
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser positivo'
    }),

  descricao: Joi.string()
    .required()
    .min(5)
    .max(1000)
    .trim()
    .messages({
      'any.required': 'Descrição é obrigatória',
      'string.min': 'Descrição deve ter pelo menos 5 caracteres',
      'string.max': 'Descrição deve ter no máximo 1000 caracteres',
      'string.empty': 'Descrição não pode estar vazia'
    }),

  tipo: Joi.string()
    .required()
    .valid(...TIPOS_VALIDOS)
    .messages({
      'any.required': 'Tipo é obrigatório',
      'any.only': `Tipo deve ser um dos: ${TIPOS_VALIDOS.join(', ')}`
    }),

  processo: Joi.string()
    .required()
    .valid(...PROCESSOS_VALIDOS)
    .messages({
      'any.required': 'Processo é obrigatório',
      'any.only': `Processo deve ser um dos: ${PROCESSOS_VALIDOS.join(', ')}`
    }),

  finalizadora: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Finalizadora deve ser verdadeiro ou falso'
    }),

  api: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'API deve ser verdadeiro ou falso'
    })
});

// Schema para atualização
const updateOcorrencia = Joi.object({
  codigo: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser positivo'
    }),

  descricao: Joi.string()
    .min(5)
    .max(1000)
    .trim()
    .messages({
      'string.min': 'Descrição deve ter pelo menos 5 caracteres',
      'string.max': 'Descrição deve ter no máximo 1000 caracteres'
    }),

  tipo: Joi.string()
    .valid(...TIPOS_VALIDOS)
    .messages({
      'any.only': `Tipo deve ser um dos: ${TIPOS_VALIDOS.join(', ')}`
    }),

  processo: Joi.string()
    .valid(...PROCESSOS_VALIDOS)
    .messages({
      'any.only': `Processo deve ser um dos: ${PROCESSOS_VALIDOS.join(', ')}`
    }),

  finalizadora: Joi.boolean()
    .messages({
      'boolean.base': 'Finalizadora deve ser verdadeiro ou falso'
    }),

  api: Joi.boolean()
    .messages({
      'boolean.base': 'API deve ser verdadeiro ou falso'
    })
});

// Schema para listagem (query parameters)
const listOcorrencias = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Página deve ser um número',
      'number.integer': 'Página deve ser um número inteiro',
      'number.min': 'Página deve ser maior que zero'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limite deve ser um número',
      'number.integer': 'Limite deve ser um número inteiro',
      'number.min': 'Limite deve ser maior que zero',
      'number.max': 'Limite deve ser no máximo 100'
    }),

  orderBy: Joi.string()
    .valid('id', 'codigo', 'descricao', 'tipo', 'processo', 'created_at')
    .default('id')
    .messages({
      'any.only': 'OrderBy deve ser: id, codigo, descricao, tipo, processo ou created_at'
    }),

  orderDirection: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .default('DESC')
    .messages({
      'any.only': 'OrderDirection deve ser ASC ou DESC'
    }),

  tipo: Joi.string()
    .valid(...TIPOS_VALIDOS)
    .messages({
      'any.only': `Tipo deve ser um dos: ${TIPOS_VALIDOS.join(', ')}`
    }),

  processo: Joi.string()
    .valid(...PROCESSOS_VALIDOS)
    .messages({
      'any.only': `Processo deve ser um dos: ${PROCESSOS_VALIDOS.join(', ')}`
    }),

  finalizadora: Joi.string()
    .valid('true', 'false')
    .messages({
      'any.only': 'Finalizadora deve ser true ou false'
    }),

  api: Joi.string()
    .valid('true', 'false')
    .messages({
      'any.only': 'API deve ser true ou false'
    })
});

// Schema para parâmetros de rota
const ocorrenciaParams = Joi.object({
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

const codigoParams = Joi.object({
  codigo: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código é obrigatório',
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser um número positivo'
    })
});

const tipoParams = Joi.object({
  tipo: Joi.string()
    .valid(...TIPOS_VALIDOS)
    .required()
    .messages({
      'any.required': 'Tipo é obrigatório',
      'any.only': `Tipo deve ser um dos: ${TIPOS_VALIDOS.join(', ')}`
    })
});

const processoParams = Joi.object({
  processo: Joi.string()
    .valid(...PROCESSOS_VALIDOS)
    .required()
    .messages({
      'any.required': 'Processo é obrigatório',
      'any.only': `Processo deve ser um dos: ${PROCESSOS_VALIDOS.join(', ')}`
    })
});

module.exports = {
  createOcorrencia,
  updateOcorrencia,
  listOcorrencias,
  ocorrenciaParams,
  codigoParams,
  tipoParams,
  processoParams
};