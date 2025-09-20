const Joi = require('joi');
const { validateCNPJ, validateUF } = require('../utils/validators');

// Validador personalizado para CNPJ
const cnpjValidator = (value, helpers) => {
  if (!validateCNPJ(value)) {
    return helpers.error('any.invalid');
  }
  return value.replace(/\D/g, ''); // Retorna apenas números
};

// Validador personalizado para UF
const ufValidator = (value, helpers) => {
  if (!validateUF(value)) {
    return helpers.error('any.invalid');
  }
  return value.toUpperCase();
};

// Schema para criação de transportadora
const createTransportadora = Joi.object({
  cnpj: Joi.string()
    .required()
    .custom(cnpjValidator)
    .messages({
      'any.required': 'CNPJ é obrigatório',
      'any.invalid': 'CNPJ inválido',
      'string.base': 'CNPJ deve ser uma string'
    }),

  nome: Joi.string()
    .required()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'any.required': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres',
      'string.empty': 'Nome não pode estar vazio'
    }),

  endereco: Joi.string()
    .required()
    .min(5)
    .max(500)
    .trim()
    .messages({
      'any.required': 'Endereço é obrigatório',
      'string.min': 'Endereço deve ter pelo menos 5 caracteres',
      'string.max': 'Endereço deve ter no máximo 500 caracteres'
    }),

  municipio: Joi.string()
    .required()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'any.required': 'Município é obrigatório',
      'string.min': 'Município deve ter pelo menos 2 caracteres',
      'string.max': 'Município deve ter no máximo 255 caracteres'
    }),

  uf: Joi.string()
    .required()
    .custom(ufValidator)
    .messages({
      'any.required': 'UF é obrigatória',
      'any.invalid': 'UF inválida',
      'string.base': 'UF deve ser uma string'
    }),

  integracao_ocorrencia: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Integração de ocorrência deve ter no máximo 255 caracteres'
    }),

  romaneio_auto: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Romaneio automático deve ser verdadeiro ou falso'
    }),

  roterizacao_automatica: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Roteirização automática deve ser verdadeiro ou falso'
    })
});

// Schema para atualização de transportadora
const updateTransportadora = Joi.object({
  cnpj: Joi.string()
    .custom(cnpjValidator)
    .messages({
      'any.invalid': 'CNPJ inválido',
      'string.base': 'CNPJ deve ser uma string'
    }),

  nome: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres',
      'string.empty': 'Nome não pode estar vazio'
    }),

  endereco: Joi.string()
    .min(5)
    .max(500)
    .trim()
    .messages({
      'string.min': 'Endereço deve ter pelo menos 5 caracteres',
      'string.max': 'Endereço deve ter no máximo 500 caracteres'
    }),

  municipio: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Município deve ter pelo menos 2 caracteres',
      'string.max': 'Município deve ter no máximo 255 caracteres'
    }),

  uf: Joi.string()
    .custom(ufValidator)
    .messages({
      'any.invalid': 'UF inválida',
      'string.base': 'UF deve ser uma string'
    }),

  integracao_ocorrencia: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Integração de ocorrência deve ter no máximo 255 caracteres'
    }),

  romaneio_auto: Joi.boolean()
    .messages({
      'boolean.base': 'Romaneio automático deve ser verdadeiro ou falso'
    }),

  roterizacao_automatica: Joi.boolean()
    .messages({
      'boolean.base': 'Roteirização automática deve ser verdadeiro ou falso'
    })
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para listagem com filtros
const listTransportadoras = Joi.object({
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
    .valid('id', 'nome', 'cnpj', 'municipio', 'uf', 'created_at', 'updated_at')
    .default('created_at')
    .messages({
      'any.only': 'Campo de ordenação inválido'
    }),

  orderDirection: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .default('DESC')
    .messages({
      'any.only': 'Direção de ordenação deve ser ASC ou DESC'
    }),

  nome: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres'
    }),

  cnpj: Joi.string()
    .custom(cnpjValidator)
    .messages({
      'any.invalid': 'CNPJ inválido'
    }),

  municipio: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Município deve ter pelo menos 2 caracteres',
      'string.max': 'Município deve ter no máximo 255 caracteres'
    }),

  uf: Joi.string()
    .custom(ufValidator)
    .messages({
      'any.invalid': 'UF inválida'
    }),

  romaneio_auto: Joi.boolean()
    .messages({
      'boolean.base': 'Romaneio automático deve ser verdadeiro ou falso'
    }),

  roterizacao_automatica: Joi.boolean()
    .messages({
      'boolean.base': 'Roteirização automática deve ser verdadeiro ou falso'
    })
});

// Schema para busca por nome
const searchTransportadoras = Joi.object({
  q: Joi.string()
    .required()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'any.required': 'Termo de busca é obrigatório',
      'string.min': 'Termo de busca deve ter pelo menos 2 caracteres',
      'string.max': 'Termo de busca deve ter no máximo 255 caracteres',
      'string.empty': 'Termo de busca não pode estar vazio'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.base': 'Limite deve ser um número',
      'number.integer': 'Limite deve ser um número inteiro',
      'number.min': 'Limite deve ser maior que 0',
      'number.max': 'Limite deve ser menor ou igual a 50'
    })
});

// Schema para parâmetros de rota
const transportadoraParams = Joi.object({
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

// Schema para busca por CNPJ
const cnpjParams = Joi.object({
  cnpj: Joi.string()
    .required()
    .custom(cnpjValidator)
    .messages({
      'any.required': 'CNPJ é obrigatório',
      'any.invalid': 'CNPJ inválido'
    })
});

// Schema para busca por UF
const ufParams = Joi.object({
  uf: Joi.string()
    .required()
    .custom(ufValidator)
    .messages({
      'any.required': 'UF é obrigatória',
      'any.invalid': 'UF inválida'
    })
});

module.exports = {
  createTransportadora,
  updateTransportadora,
  listTransportadoras,
  searchTransportadoras,
  transportadoraParams,
  cnpjParams,
  ufParams
};