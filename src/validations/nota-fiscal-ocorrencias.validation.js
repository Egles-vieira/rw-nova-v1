// validations/nota-fiscal-ocorrencias.validation.js
const Joi = require('joi');

// Schema para listagem de ocorrências de nota fiscal
const listOcorrenciasNotaFiscal = Joi.object({
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
      'number.max': 'Limite deve ser menor ou igual a 100'
    }),

  orderBy: Joi.string()
    .valid('id', 'dataHoraEvento', 'dataHoraEnvio', 'codigo', 'created_at')
    .default('dataHoraEvento')
    .messages({
      'any.only': 'OrderBy deve ser: id, dataHoraEvento, dataHoraEnvio, codigo ou created_at'
    }),

  orderDirection: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .default('DESC')
    .messages({
      'any.only': 'OrderDirection deve ser ASC ou DESC'
    })
});

// Schema para criação de ocorrência para nota fiscal
const createOcorrenciaNotaFiscal = Joi.object({
  // Campos obrigatórios
  codigo: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código da ocorrência é obrigatório',
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser positivo'
    }),

  descricao: Joi.string()
    .required()
    .min(1)
    .max(65535)
    .trim()
    .messages({
      'any.required': 'Descrição é obrigatória',
      'string.empty': 'Descrição não pode estar vazia',
      'string.min': 'Descrição deve ter pelo menos 1 caractere',
      'string.max': 'Descrição é muito longa'
    }),

  dataHoraEnvio: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Data/hora de envio é obrigatória',
      'date.base': 'Data/hora de envio deve ser uma data válida',
      'date.format': 'Data/hora de envio deve estar no formato ISO'
    }),

  // Campos opcionais
  dataHoraEvento: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Data/hora do evento deve ser uma data válida',
      'date.format': 'Data/hora do evento deve estar no formato ISO'
    }),

  complemento: Joi.string()
    .optional()
    .max(255)
    .trim()
    .allow(null, '')
    .messages({
      'string.max': 'Complemento deve ter no máximo 255 caracteres'
    }),

  nomeRecebedor: Joi.string()
    .optional()
    .max(255)
    .trim()
    .allow(null, '')
    .messages({
      'string.max': 'Nome do recebedor deve ter no máximo 255 caracteres'
    }),

  docRecebedor: Joi.string()
    .optional()
    .max(20)
    .trim()
    .allow(null, '')
    .messages({
      'string.max': 'Documento do recebedor deve ter no máximo 20 caracteres'
    }),

  latitude: Joi.number()
    .precision(2)
    .min(-90)
    .max(90)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Latitude deve ser um número',
      'number.precision': 'Latitude deve ter no máximo 2 casas decimais',
      'number.min': 'Latitude deve estar entre -90 e 90',
      'number.max': 'Latitude deve estar entre -90 e 90'
    }),

  longitude: Joi.number()
    .precision(2)
    .min(-180)
    .max(180)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Longitude deve ser um número',
      'number.precision': 'Longitude deve ter no máximo 2 casas decimais',
      'number.min': 'Longitude deve estar entre -180 e 180',
      'number.max': 'Longitude deve estar entre -180 e 180'
    }),

  linkComprovante: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'Link do comprovante deve ser uma URL válida'
    }),

  zaapId: Joi.string()
    .optional()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'ZaapId deve ter no máximo 255 caracteres'
    }),

  messageId: Joi.string()
    .optional()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'MessageId deve ter no máximo 255 caracteres'
    }),

  id_z_api: Joi.string()
    .optional()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'ID Z-API deve ter no máximo 255 caracteres'
    }),

  enviado_zap: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'Enviado ZAP deve ser verdadeiro ou falso'
    }),

  enviado_date: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Data de envio deve ser uma data válida',
      'date.format': 'Data de envio deve estar no formato ISO'
    }),

  status: Joi.string()
    .valid('waiting', 'running', 'finished')
    .optional()
    .default('waiting')
    .messages({
      'any.only': 'Status deve ser: waiting, running ou finished'
    }),

  link_comprovante_sistema: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'Link do comprovante do sistema deve ser uma URL válida'
    }),

  status_download_comprovante: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Status download comprovante deve ser um número',
      'number.integer': 'Status download comprovante deve ser um número inteiro'
    }),

  tipo_comprovante_download: Joi.string()
    .optional()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'Tipo comprovante download deve ter no máximo 255 caracteres'
    })
});

// Schema para atualização de ocorrência
const updateOcorrenciaNotaFiscal = Joi.object({
  codigo: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser positivo'
    }),

  descricao: Joi.string()
    .min(1)
    .max(65535)
    .trim()
    .messages({
      'string.empty': 'Descrição não pode estar vazia',
      'string.min': 'Descrição deve ter pelo menos 1 caractere',
      'string.max': 'Descrição é muito longa'
    }),

  dataHoraEnvio: Joi.date()
    .iso()
    .messages({
      'date.base': 'Data/hora de envio deve ser uma data válida',
      'date.format': 'Data/hora de envio deve estar no formato ISO'
    }),

  dataHoraEvento: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.base': 'Data/hora do evento deve ser uma data válida',
      'date.format': 'Data/hora do evento deve estar no formato ISO'
    }),

  complemento: Joi.string()
    .max(255)
    .trim()
    .allow(null, '')
    .messages({
      'string.max': 'Complemento deve ter no máximo 255 caracteres'
    }),

  nomeRecebedor: Joi.string()
    .max(255)
    .trim()
    .allow(null, '')
    .messages({
      'string.max': 'Nome do recebedor deve ter no máximo 255 caracteres'
    }),

  docRecebedor: Joi.string()
    .max(20)
    .trim()
    .allow(null, '')
    .messages({
      'string.max': 'Documento do recebedor deve ter no máximo 20 caracteres'
    }),

  latitude: Joi.number()
    .precision(2)
    .min(-90)
    .max(90)
    .allow(null)
    .messages({
      'number.base': 'Latitude deve ser um número',
      'number.precision': 'Latitude deve ter no máximo 2 casas decimais',
      'number.min': 'Latitude deve estar entre -90 e 90',
      'number.max': 'Latitude deve estar entre -90 e 90'
    }),

  longitude: Joi.number()
    .precision(2)
    .min(-180)
    .max(180)
    .allow(null)
    .messages({
      'number.base': 'Longitude deve ser um número',
      'number.precision': 'Longitude deve ter no máximo 2 casas decimais',
      'number.min': 'Longitude deve estar entre -180 e 180',
      'number.max': 'Longitude deve estar entre -180 e 180'
    }),

  linkComprovante: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Link do comprovante deve ser uma URL válida'
    }),

  zaapId: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'ZaapId deve ter no máximo 255 caracteres'
    }),

  messageId: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'MessageId deve ter no máximo 255 caracteres'
    }),

  id_z_api: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'ID Z-API deve ter no máximo 255 caracteres'
    }),

  enviado_zap: Joi.boolean()
    .messages({
      'boolean.base': 'Enviado ZAP deve ser verdadeiro ou falso'
    }),

  enviado_date: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.base': 'Data de envio deve ser uma data válida',
      'date.format': 'Data de envio deve estar no formato ISO'
    }),

  status: Joi.string()
    .valid('waiting', 'running', 'finished')
    .messages({
      'any.only': 'Status deve ser: waiting, running ou finished'
    }),

  link_comprovante_sistema: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Link do comprovante do sistema deve ser uma URL válida'
    }),

  status_download_comprovante: Joi.number()
    .integer()
    .allow(null)
    .messages({
      'number.base': 'Status download comprovante deve ser um número',
      'number.integer': 'Status download comprovante deve ser um número inteiro'
    }),

  tipo_comprovante_download: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.max': 'Tipo comprovante download deve ter no máximo 255 caracteres'
    })
});

// Schema para parâmetros de rota - Nota Fiscal
const notaFiscalParams = Joi.object({
  nroNf: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Número da nota fiscal é obrigatório',
      'number.base': 'Número da nota fiscal deve ser um número',
      'number.integer': 'Número da nota fiscal deve ser um número inteiro',
      'number.positive': 'Número da nota fiscal deve ser positivo'
    })
});

// Schema para parâmetros de rota - Nota Fiscal e Código
const notaFiscalCodigoParams = Joi.object({
  nroNf: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Número da nota fiscal é obrigatório',
      'number.base': 'Número da nota fiscal deve ser um número',
      'number.integer': 'Número da nota fiscal deve ser um número inteiro',
      'number.positive': 'Número da nota fiscal deve ser positivo'
    }),

  codigo: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código da ocorrência é obrigatório',
      'number.base': 'Código deve ser um número',
      'number.integer': 'Código deve ser um número inteiro',
      'number.positive': 'Código deve ser positivo'
    })
});

// Schema para parâmetros de rota - Nota Fiscal e Ocorrência
const notaFiscalOcorrenciaParams = Joi.object({
  nroNf: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Número da nota fiscal é obrigatório',
      'number.base': 'Número da nota fiscal deve ser um número',
      'number.integer': 'Número da nota fiscal deve ser um número inteiro',
      'number.positive': 'Número da nota fiscal deve ser positivo'
    }),

  ocorrenciaId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'ID da ocorrência é obrigatório',
      'number.base': 'ID da ocorrência deve ser um número',
      'number.integer': 'ID da ocorrência deve ser um número inteiro',
      'number.positive': 'ID da ocorrência deve ser positivo'
    })
});

module.exports = {
  listOcorrenciasNotaFiscal,
  createOcorrenciaNotaFiscal,
  updateOcorrenciaNotaFiscal,
  notaFiscalParams,
  notaFiscalCodigoParams,
  notaFiscalOcorrenciaParams
};