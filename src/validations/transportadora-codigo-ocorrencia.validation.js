// validations/transportadora-codigo-ocorrencia.validation.js
const Joi = require('joi');

// Schema para criação de vínculo
const createVinculo = Joi.object({
  transportadora_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Transportadora é obrigatória',
      'number.base': 'Transportadora deve ser um número',
      'number.integer': 'Transportadora deve ser um número inteiro',
      'number.positive': 'Transportadora deve ser um número positivo'
    }),

  codigo_ocorrencia_codigo: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código de ocorrência é obrigatório',
      'number.base': 'Código de ocorrência deve ser um número',
      'number.integer': 'Código de ocorrência deve ser um número inteiro',
      'number.positive': 'Código de ocorrência deve ser um número positivo'
    }),

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
    .allow(null, '')
    .max(1000)
    .trim()
    .messages({
      'string.max': 'Descrição deve ter no máximo 1000 caracteres'
    })
});

// Schema para criação múltipla
const createMultipleVinculos = Joi.object({
  vinculos: Joi.array()
    .items(createVinculo)
    .min(1)
    .required()
    .messages({
      'any.required': 'Lista de vínculos é obrigatória',
      'array.base': 'Vínculos deve ser um array',
      'array.min': 'Pelo menos um vínculo deve ser informado'
    })
});

// Schema para listagem
const listVinculos = Joi.object({
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

  transportadora_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Transportadora deve ser um número',
      'number.integer': 'Transportadora deve ser um número inteiro',
      'number.positive': 'Transportadora deve ser um número positivo'
    }),

  codigo_ocorrencia_codigo: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código de ocorrência deve ser um número',
      'number.integer': 'Código de ocorrência deve ser um número inteiro',
      'number.positive': 'Código de ocorrência deve ser um número positivo'
    })
});

// Schema para parâmetros de rota
const vinculoParams = Joi.object({
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

const transportadoraParams = Joi.object({
  transportadoraId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'ID da transportadora é obrigatório',
      'number.base': 'Transportadora deve ser um número',
      'number.integer': 'Transportadora deve ser um número inteiro',
      'number.positive': 'Transportadora deve ser um número positivo'
    })
});

const codigoOcorrenciaParams = Joi.object({
  codigoOcorrencia: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código de ocorrência é obrigatório',
      'number.base': 'Código de ocorrência deve ser um número',
      'number.integer': 'Código de ocorrência deve ser um número inteiro',
      'number.positive': 'Código de ocorrência deve ser um número positivo'
    })
});

module.exports = {
  createVinculo,
  createMultipleVinculos,
  listVinculos,
  vinculoParams,
  transportadoraParams,
  codigoOcorrenciaParams
};