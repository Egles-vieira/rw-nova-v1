const Joi = require('joi');

// Valores enum baseados na estrutura da tabela
const TIPOS_OCORRENCIA = ['entrega', 'coleta', 'incidente', 'informativo'];
const PROCESSOS_OCORRENCIA = ['pre-entrega', 'em-entrega', 'pos-entrega', 'administrativo'];

// Schema para criação de código de ocorrência
const createCodigoOcorrencia = Joi.object({
  codigo: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código é obrigatório',
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser um número positivo'
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
    .valid(...TIPOS_OCORRENCIA)
    .required()
    .messages({
      'any.required': 'Tipo é obrigatório',
      'any.only': `Tipo deve ser um dos valores: ${TIPOS_OCORRENCIA.join(', ')}`
    }),

  processo: Joi.string()
    .valid(...PROCESSOS_OCORRENCIA)
    .required()
    .messages({
      'any.required': 'Processo é obrigatório',
      'any.only': `Processo deve ser um dos valores: ${PROCESSOS_OCORRENCIA.join(', ')}`
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

// Schema para atualização de código de ocorrência
const updateCodigoOcorrencia = Joi.object({
  codigo: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser um número positivo'
    }),

  descricao: Joi.string()
    .min(5)
    .max(1000)
    .trim()
    .messages({
      'string.min': 'Descrição deve ter pelo menos 5 caracteres',
      'string.max': 'Descrição deve ter no máximo 1000 caracteres',
      'string.empty': 'Descrição não pode estar vazia'
    }),

  tipo: Joi.string()
    .valid(...TIPOS_OCORRENCIA)
    .messages({
      'any.only': `Tipo deve ser um dos valores: ${TIPOS_OCORRENCIA.join(', ')}`
    }),

  processo: Joi.string()
    .valid(...PROCESSOS_OCORRENCIA)
    .messages({
      'any.only': `Processo deve ser um dos valores: ${PROCESSOS_OCORRENCIA.join(', ')}`
    }),

  finalizadora: Joi.boolean()
    .messages({
      'boolean.base': 'Finalizadora deve ser verdadeiro ou falso'
    }),

  api: Joi.boolean()
    .messages({
      'boolean.base': 'API deve ser verdadeiro ou falso'
    })
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para listagem com filtros
const listCodigoOcorrencias = Joi.object({
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

  orderBy: Joi.string()
    .valid('id', 'codigo', 'tipo', 'processo', 'created_at', 'updated_at')
    .default('codigo')
    .messages({
      'any.only': 'Campo de ordenação inválido'
    }),

  orderDirection: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .default('ASC')
    .messages({
      'any.only': 'Direção de ordenação deve ser ASC ou DESC'
    }),

  tipo: Joi.string()
    .valid(...TIPOS_OCORRENCIA)
    .messages({
      'any.only': `Tipo deve ser um dos valores: ${TIPOS_OCORRENCIA.join(', ')}`
    }),

  processo: Joi.string()
    .valid(...PROCESSOS_OCORRENCIA)
    .messages({
      'any.only': `Processo deve ser um dos valores: ${PROCESSOS_OCORRENCIA.join(', ')}`
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
    }),

  search: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Busca deve ter pelo menos 2 caracteres',
      'string.max': 'Busca deve ter no máximo 100 caracteres'
    })
});

// Schema para parâmetros de rota
const codigoOcorrenciaParams = Joi.object({
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

module.exports = {
  createCodigoOcorrencia,
  updateCodigoOcorrencia,
  listCodigoOcorrencias,
  codigoOcorrenciaParams,
  TIPOS_OCORRENCIA,
  PROCESSOS_OCORRENCIA
};