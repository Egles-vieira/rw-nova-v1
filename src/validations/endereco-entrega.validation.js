const Joi = require('joi');

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
  createEnderecoEntrega,
  updateEnderecoEntrega,
  listEnderecosEntrega,
  enderecoEntregaParams,
  updateCoordenadasSchema
};