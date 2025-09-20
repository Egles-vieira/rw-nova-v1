const Joi = require('joi');
const { validateCPF, validateCNPJ, validateUF } = require('../utils/validators');

// Validador personalizado para documento (CPF ou CNPJ)
const documentoValidator = (value, helpers) => {
  if (!value) return helpers.error('any.required');
  
  const documento = value.replace(/\D/g, '');
  
  if (documento.length === 11) {
    if (!validateCPF(value)) {
      return helpers.error('any.invalid');
    }
  } else if (documento.length === 14) {
    if (!validateCNPJ(value)) {
      return helpers.error('any.invalid');
    }
  } else {
    return helpers.error('any.invalid');
  }
  
  return documento;
};

// Validador personalizado para UF
const ufValidator = (value, helpers) => {
  if (!validateUF(value)) {
    return helpers.error('any.invalid');
  }
  return value.toUpperCase();
};

// Schema para criação de cliente
const createCliente = Joi.object({
  documento: Joi.string()
    .required()
    .custom(documentoValidator)
    .messages({
      'any.required': 'Documento é obrigatório',
      'any.invalid': 'CPF ou CNPJ inválido',
      'string.base': 'Documento deve ser uma string'
    }),

  cod_cliente: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código do cliente é obrigatório',
      'number.base': 'Código do cliente deve ser um número',
      'number.integer': 'Código do cliente deve ser um número inteiro',
      'number.positive': 'Código do cliente deve ser positivo'
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
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Endereço deve ter no máximo 255 caracteres'
    }),

  bairro: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Bairro deve ter no máximo 255 caracteres'
    }),

  cep: Joi.string()
    .allow(null, '')
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.pattern.base': 'CEP deve ter o formato 00000-000'
    }),

  cidade: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    }),

  uf: Joi.string()
    .allow(null, '')
    .custom(ufValidator)
    .messages({
      'any.invalid': 'UF inválida',
      'string.base': 'UF deve ser uma string'
    }),

  contato: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Contato deve ter no máximo 255 caracteres'
    }),

  inscricao_estadual: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Inscrição estadual deve ter no máximo 255 caracteres'
    }),

  cnpj: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'CNPJ deve ter no máximo 255 caracteres'
    })
});

// Schema para atualização de cliente
const updateCliente = Joi.object({
  documento: Joi.string()
    .custom(documentoValidator)
    .messages({
      'any.invalid': 'CPF ou CNPJ inválido',
      'string.base': 'Documento deve ser uma string'
    }),

  cod_cliente: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código do cliente deve ser um número',
      'number.integer': 'Código do cliente deve ser um número inteiro',
      'number.positive': 'Código do cliente deve ser positivo'
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
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Endereço deve ter no máximo 255 caracteres'
    }),

  bairro: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Bairro deve ter no máximo 255 caracteres'
    }),

  cep: Joi.string()
    .allow(null, '')
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.pattern.base': 'CEP deve ter o formato 00000-000'
    }),

  cidade: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    }),

  uf: Joi.string()
    .allow(null, '')
    .custom(ufValidator)
    .messages({
      'any.invalid': 'UF inválida',
      'string.base': 'UF deve ser uma string'
    }),

  contato: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Contato deve ter no máximo 255 caracteres'
    }),

  inscricao_estadual: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Inscrição estadual deve ter no máximo 255 caracteres'
    }),

  cnpj: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'CNPJ deve ter no máximo 255 caracteres'
    })
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para listagem com filtros
const listClientes = Joi.object({
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
    .valid('id', 'nome', 'documento', 'cod_cliente', 'cidade', 'uf', 'created_at', 'updated_at')
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

  documento: Joi.string()
    .custom(documentoValidator)
    .messages({
      'any.invalid': 'CPF ou CNPJ inválido'
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
    .custom(ufValidator)
    .messages({
      'any.invalid': 'UF inválida'
    }),

  cod_cliente: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código do cliente deve ser um número',
      'number.integer': 'Código do cliente deve ser um número inteiro',
      'number.positive': 'Código do cliente deve ser positivo'
    })
});

// Schema para busca por nome
const searchClientes = Joi.object({
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
const clienteParams = Joi.object({
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

// Schema para busca por documento
const documentoParams = Joi.object({
  documento: Joi.string()
    .required()
    .custom(documentoValidator)
    .messages({
      'any.required': 'Documento é obrigatório',
      'any.invalid': 'CPF ou CNPJ inválido'
    })
});

// Schema para busca por código do cliente
const codClienteParams = Joi.object({
  codCliente: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código do cliente é obrigatório',
      'number.base': 'Código do cliente deve ser um número',
      'number.integer': 'Código do cliente deve ser um número inteiro',
      'number.positive': 'Código do cliente deve ser positivo'
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

// Schema para busca por cidade
const cidadeParams = Joi.object({
  cidade: Joi.string()
    .required()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'any.required': 'Cidade é obrigatória',
      'string.min': 'Cidade deve ter pelo menos 2 caracteres',
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    })
});

module.exports = {
  createCliente,
  updateCliente,
  listClientes,
  searchClientes,
  clienteParams,
  documentoParams,
  codClienteParams,
  ufParams,
  cidadeParams
};