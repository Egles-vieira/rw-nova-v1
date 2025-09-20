// ==========================================
// 4. MONITORING VALIDATIONS
// ==========================================
// backend/src/validations/monitoring.validation.js

const Joi = require('joi');

const dashboardValidation = Joi.object({
  periodo: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(7)
    .messages({
      'number.base': 'Período deve ser um número',
      'number.integer': 'Período deve ser um número inteiro',
      'number.min': 'Período deve ser pelo menos 1 dia',
      'number.max': 'Período deve ser no máximo 365 dias'
    })
});

const transportadoraMetricsValidation = {
  params: Joi.object({
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
  }),
  
  query: Joi.object({
    periodo: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(30)
      .messages({
        'number.base': 'Período deve ser um número',
        'number.integer': 'Período deve ser um número inteiro',
        'number.min': 'Período deve ser pelo menos 1 dia',
        'number.max': 'Período deve ser no máximo 365 dias'
      })
  })
};

const performanceStatsValidation = Joi.object({
  periodo: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(7)
    .messages({
      'number.base': 'Período deve ser um número',
      'number.integer': 'Período deve ser um número inteiro',
      'number.min': 'Período deve ser pelo menos 1 dia',
      'number.max': 'Período deve ser no máximo 365 dias'
    }),
  
  agrupamento: Joi.string()
    .valid('hora', 'dia', 'mes')
    .default('dia')
    .messages({
      'string.base': 'Agrupamento deve ser uma string',
      'any.only': 'Agrupamento deve ser: hora, dia ou mes'
    })
});

const logsFilterValidation = Joi.object({
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
  
  integracao: Joi.string()
    .valid('jamef', 'braspress', 'tnt', 'correios', 'transportadoras_api')
    .optional()
    .messages({
      'string.base': 'Integração deve ser uma string',
      'any.only': 'Integração deve ser uma das opções válidas'
    }),
  
  nivel: Joi.string()
    .valid('erro', 'sucesso', 'info')
    .optional()
    .messages({
      'string.base': 'Nível deve ser uma string',
      'any.only': 'Nível deve ser: erro, sucesso ou info'
    }),
  
  dataInicio: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Data de início deve ser uma data válida',
      'date.format': 'Data deve estar no formato ISO'
    }),
  
  dataFim: Joi.date()
    .iso()
    .min(Joi.ref('dataInicio'))
    .optional()
    .messages({
      'date.base': 'Data de fim deve ser uma data válida',
      'date.format': 'Data deve estar no formato ISO',
      'date.min': 'Data de fim deve ser posterior à data de início'
    }),
  
  nro: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Número deve ser um número',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser positivo'
    }),
  
  busca: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.base': 'Busca deve ser uma string',
      'string.min': 'Busca deve ter pelo menos 3 caracteres',
      'string.max': 'Busca deve ter no máximo 100 caracteres'
    })
});

const exportReportValidation = Joi.object({
  tipo: Joi.string()
    .valid('performance', 'transportadoras', 'ocorrencias')
    .default('performance')
    .messages({
      'string.base': 'Tipo deve ser uma string',
      'any.only': 'Tipo deve ser: performance, transportadoras ou ocorrencias'
    }),
  
  formato: Joi.string()
    .valid('json', 'csv')
    .default('json')
    .messages({
      'string.base': 'Formato deve ser uma string',
      'any.only': 'Formato deve ser: json ou csv'
    }),
  
  periodo: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.base': 'Período deve ser um número',
      'number.integer': 'Período deve ser um número inteiro',
      'number.min': 'Período deve ser pelo menos 1 dia',
      'number.max': 'Período deve ser no máximo 365 dias'
    }),
  
  transportadoraId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'ID da transportadora deve ser um número',
      'number.integer': 'ID da transportadora deve ser um número inteiro',
      'number.positive': 'ID da transportadora deve ser positivo'
    })
});

const monitoringConfigValidation = Joi.object({
  alertas: Joi.object({
    erro_threshold: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(5)
      .messages({
        'number.base': 'Limite de erros deve ser um número',
        'number.integer': 'Limite de erros deve ser um número inteiro',
        'number.min': 'Limite de erros deve ser pelo menos 1',
        'number.max': 'Limite de erros deve ser no máximo 100'
      }),
    
    inatividade_hours: Joi.number()
      .integer()
      .min(1)
      .max(48)
      .default(4)
      .messages({
        'number.base': 'Horas de inatividade deve ser um número',
        'number.integer': 'Horas de inatividade deve ser um número inteiro',
        'number.min': 'Horas de inatividade deve ser pelo menos 1',
        'number.max': 'Horas de inatividade deve ser no máximo 48'
      })
  }).optional(),
  
  dashboard: Joi.object({
    periodo_padrao: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(7)
      .messages({
        'number.base': 'Período padrão deve ser um número',
        'number.integer': 'Período padrão deve ser um número inteiro',
        'number.min': 'Período padrão deve ser pelo menos 1',
        'number.max': 'Período padrão deve ser no máximo 365'
      }),
    
    refresh_interval: Joi.number()
      .integer()
      .min(10)
      .max(300)
      .default(30)
      .messages({
        'number.base': 'Intervalo de refresh deve ser um número',
        'number.integer': 'Intervalo de refresh deve ser um número inteiro',
        'number.min': 'Intervalo de refresh deve ser pelo menos 10 segundos',
        'number.max': 'Intervalo de refresh deve ser no máximo 300 segundos'
      })
  }).optional()
});

module.exports = {
  dashboardValidation,
  transportadoraMetricsValidation,
  performanceStatsValidation,
  logsFilterValidation,
  exportReportValidation,
  monitoringConfigValidation
};