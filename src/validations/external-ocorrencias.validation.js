// ==========================================
// 5. EXTERNAL OCORRENCIAS VALIDATIONS
// ==========================================
// backend/src/validations/external-ocorrencias.validation.js

const Joi = require('joi');

// Schema para ocorrência individual
const ocorrenciaSchema = Joi.object({
  nro_nf: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'any.required': 'Número da NF é obrigatório',
      'number.integer': 'Número da NF deve ser um inteiro',
      'number.min': 'Número da NF deve ser maior que 0'
    }),
  
  codigo: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': 'Código da ocorrência é obrigatório',
      'string.max': 'Código da ocorrência deve ter no máximo 50 caracteres'
    }),
  
  descricao: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Descrição deve ter no máximo 500 caracteres'
    }),
  
  data_evento: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Data do evento não pode ser futura'
    }),
  
  dataHoraEvento: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Data/hora do evento não pode ser futura'
    }),
  
  recebedor: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Nome do recebedor deve ter no máximo 255 caracteres'
    }),
  
  documento_recebedor: Joi.string()
    .pattern(/^\d{11}$|^\d{14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Documento do recebedor deve conter 11 (CPF) ou 14 (CNPJ) dígitos'
    }),
  
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .messages({
      'number.min': 'Latitude deve estar entre -90 e 90',
      'number.max': 'Latitude deve estar entre -90 e 90'
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.min': 'Longitude deve estar entre -180 e 180',
      'number.max': 'Longitude deve estar entre -180 e 180'
    }),
  
  comprovante_url: Joi.string()
    .uri()
    .max(500)
    .optional()
    .messages({
      'string.uri': 'URL do comprovante deve ser válida',
      'string.max': 'URL do comprovante deve ter no máximo 500 caracteres'
    })
})
.custom((value, helpers) => {
  // Validar que pelo menos uma data foi fornecida
  if (!value.data_evento && !value.dataHoraEvento) {
    return helpers.error('custom.missingDate');
  }
  return value;
}, 'Data validation')
.messages({
  'custom.missingDate': 'Data do evento ou dataHoraEvento é obrigatória'
});

// Schema para o body da requisição
const receiveOcorrenciasSchema = Joi.object({
  ocorrencias: Joi.array()
    .items(ocorrenciaSchema)
    .min(1)
    .max(200)
    .required()
    .messages({
      'array.min': 'Pelo menos uma ocorrência é obrigatória',
      'array.max': 'Máximo de 200 ocorrências por requisição',
      'any.required': 'Array de ocorrências é obrigatório'
    })
});

// Schema para consulta de ocorrências
const consultarOcorrenciasSchema = Joi.object({
  nro_nf: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'any.required': 'Número da NF é obrigatório',
      'number.integer': 'Número da NF deve ser um inteiro'
    })
});

// Schema para query parameters
const consultarOcorrenciasQuerySchema = Joi.object({
  limite: Joi.number()
    .integer()
    .min(1)
    .max(200)
    .default(50)
    .messages({
      'number.max': 'Limite máximo de 200 ocorrências'
    })
});

// Schema para webhook
const webhookSchema = Joi.object({
  evento: Joi.string()
    .valid('ocorrencia', 'status_alterado', 'nf_criada', 'nf_atualizada')
    .required()
    .messages({
      'any.only': 'Evento deve ser: ocorrencia, status_alterado, nf_criada ou nf_atualizada',
      'any.required': 'Evento é obrigatório'
    }),
  
  dados: Joi.object()
    .required()
    .messages({
      'any.required': 'Dados do evento são obrigatórios'
    }),
  
  timestamp: Joi.date()
    .iso()
    .optional(),
  
  origem: Joi.string()
    .max(100)
    .optional()
});

module.exports = {
  receiveOcorrenciasSchema,
  consultarOcorrenciasSchema,
  consultarOcorrenciasQuerySchema,
  webhookSchema
};