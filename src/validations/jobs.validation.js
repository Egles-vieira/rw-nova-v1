// ==========================================
// 3. JOBS VALIDATIONS
// ==========================================
// backend/src/validations/jobs.validation.js

const Joi = require('joi');

const runJobValidation = Joi.object({
  // Corpo vazio para job manual
});

const apiTokenValidation = Joi.object({
  integracao: Joi.string()
    .valid('jamef', 'braspress', 'tnt', 'correios')
    .required()
    .messages({
      'string.base': 'Integração deve ser uma string',
      'any.required': 'Integração é obrigatória',
      'any.only': 'Integração deve ser uma das opções válidas'
    }),
  
  token: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.base': 'Token deve ser uma string',
      'string.min': 'Token deve ter pelo menos 10 caracteres',
      'string.max': 'Token deve ter no máximo 500 caracteres',
      'any.required': 'Token é obrigatório'
    }),
  
  expiresAt: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.base': 'Data de expiração deve ser uma data válida',
      'date.format': 'Data deve estar no formato ISO',
      'date.min': 'Data de expiração deve ser futura'
    })
});

const integrationLogsValidation = {
  params: Joi.object({
    integracaoId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'ID da integração deve ser um número',
        'number.integer': 'ID da integração deve ser um número inteiro',
        'number.positive': 'ID da integração deve ser positivo',
        'any.required': 'ID da integração é obrigatório'
      })
  }),
  
  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Página deve ser um número',
        'number.integer': 'Página deve ser um número inteiro',
        'number.min': 'Página deve ser pelo menos 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.base': 'Limite deve ser um número',
        'number.integer': 'Limite deve ser um número inteiro',
        'number.min': 'Limite deve ser pelo menos 1',
        'number.max': 'Limite deve ser no máximo 100'
      }),
    
    dias: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(7)
      .messages({
        'number.base': 'Dias deve ser um número',
        'number.integer': 'Dias deve ser um número inteiro',
        'number.min': 'Dias deve ser pelo menos 1',
        'number.max': 'Dias deve ser no máximo 365'
      })
  })
};

const processTransportadoraValidation = Joi.object({
  transportadoraId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID da transportadora deve ser um número',
      'number.integer': 'ID da transportadora deve ser um número inteiro',
      'number.positive': 'ID da transportadora deve ser positivo',
      'any.required': 'ID da transportadora é obrigatório'
    })
});

const queueValidation = Joi.object({
  transportadoraId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID da transportadora deve ser um número',
      'number.integer': 'ID da transportadora deve ser um número inteiro',
      'number.positive': 'ID da transportadora deve ser positivo',
      'any.required': 'ID da transportadora é obrigatório'
    })
});

module.exports = {
  runJobValidation,
  apiTokenValidation,
  integrationLogsValidation,
  processTransportadoraValidation,
  queueValidation
};