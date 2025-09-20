const Joi = require('joi');
const { validateCPF, validateEmail, validateUF } = require('../utils/validators');

// Validador personalizado para CPF
const cpfValidator = (value, helpers) => {
  if (!validateCPF(value)) {
    return helpers.error('any.invalid');
  }
  return value.replace(/\D/g, ''); // Retorna apenas números
};

// Validador personalizado para email
const emailValidator = (value, helpers) => {
  if (!validateEmail(value)) {
    return helpers.error('any.invalid');
  }
  return value.toLowerCase().trim();
};

// Validador personalizado para UF - aceita apenas siglas de 2 caracteres
const ufValidator = (value, helpers) => {
  if (!value) return value; // Permite vazio
  
  // Aceita apenas siglas de 2 caracteres
  if (value.length !== 2) {
    return helpers.error('string.length', { limit: 2, value });
  }
  
  if (!validateUF(value)) {
    return helpers.error('any.invalid');
  }
  return value.toUpperCase();
};

// Schema para criação de motorista
const createMotorista = Joi.object({
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

  sobrenome: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Sobrenome deve ter no máximo 255 caracteres'
    }),

  cpf: Joi.string()
    .required()
    .custom(cpfValidator)
    .messages({
      'any.required': 'CPF é obrigatório',
      'any.invalid': 'CPF inválido - deve conter 11 dígitos válidos',
      'string.base': 'CPF deve ser uma string'
    }),

  email: Joi.string()
    .allow(null, '')
    .custom(emailValidator)
    .messages({
      'any.invalid': 'Email inválido',
      'string.base': 'Email deve ser uma string'
    }),

  contato: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Contato deve ter no máximo 255 caracteres'
    }),

  send_mensagem: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Send mensagem deve ser verdadeiro ou falso'
    }),

  legislacao_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Legislação ID deve ser um número',
      'number.integer': 'Legislação ID deve ser um número inteiro',
      'number.positive': 'Legislação ID deve ser um número positivo'
    }),

  // Campos de endereço
  pais: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'País deve ter no máximo 255 caracteres'
    }),

  estado: Joi.string()
    .allow(null, '')
    .length(2)
    .custom(ufValidator)
    .messages({
      'string.length': 'Estado deve ser a sigla da UF com 2 caracteres (ex: SP, RJ, MG)',
      'any.invalid': 'Estado deve ser uma UF válida (ex: SP, RJ, MG, etc.)',
      'string.base': 'Estado deve ser uma string'
    }),

  cidade: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    }),

  bairro: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Bairro deve ter no máximo 255 caracteres'
    }),

  rua: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Rua deve ter no máximo 255 caracteres'
    }),

  numero: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Número deve ter no máximo 255 caracteres'
    }),

  cep: Joi.string()
    .allow(null, '')
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 00000-000 ou 00000000'
    }),

  unidade: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Unidade deve ter no máximo 255 caracteres'
    }),

  foto_perfil: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Foto perfil deve ter no máximo 255 caracteres'
    })
});

// Schema para atualização de motorista
const updateMotorista = Joi.object({
  nome: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres',
      'string.empty': 'Nome não pode estar vazio'
    }),

  sobrenome: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Sobrenome deve ter no máximo 255 caracteres'
    }),

  cpf: Joi.string()
    .custom(cpfValidator)
    .messages({
      'any.invalid': 'CPF inválido - deve conter 11 dígitos válidos',
      'string.base': 'CPF deve ser uma string'
    }),

  email: Joi.string()
    .allow(null, '')
    .custom(emailValidator)
    .messages({
      'any.invalid': 'Email inválido',
      'string.base': 'Email deve ser uma string'
    }),

  contato: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Contato deve ter no máximo 255 caracteres'
    }),

  send_mensagem: Joi.boolean()
    .messages({
      'boolean.base': 'Send mensagem deve ser verdadeiro ou falso'
    }),

  legislacao_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Legislação ID deve ser um número',
      'number.integer': 'Legislação ID deve ser um número inteiro',
      'number.positive': 'Legislação ID deve ser um número positivo'
    }),

  // Campos de endereço
  pais: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'País deve ter no máximo 255 caracteres'
    }),

  estado: Joi.string()
    .allow(null, '')
    .length(2)
    .custom(ufValidator)
    .messages({
      'string.length': 'Estado deve ser a sigla da UF com 2 caracteres (ex: SP, RJ, MG)',
      'any.invalid': 'Estado deve ser uma UF válida (ex: SP, RJ, MG, etc.)',
      'string.base': 'Estado deve ser uma string'
    }),

  cidade: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    }),

  bairro: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Bairro deve ter no máximo 255 caracteres'
    }),

  rua: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Rua deve ter no máximo 255 caracteres'
    }),

  numero: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Número deve ter no máximo 255 caracteres'
    }),

  cep: Joi.string()
    .allow(null, '')
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 00000-000 ou 00000000'
    }),

  unidade: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Unidade deve ter no máximo 255 caracteres'
    }),

  foto_perfil: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Foto perfil deve ter no máximo 255 caracteres'
    })
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para listagem com filtros
const listMotoristas = Joi.object({
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
    .valid('id', 'nome', 'sobrenome', 'cpf', 'email', 'cidade', 'estado', 'created_at', 'updated_at')
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

  cpf: Joi.string()
    .custom(cpfValidator)
    .messages({
      'any.invalid': 'CPF inválido'
    }),

  cidade: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Cidade deve ter pelo menos 2 caracteres',
      'string.max': 'Cidade deve ter no máximo 255 caracteres'
    }),

  estado: Joi.string()
    .length(2)
    .custom(ufValidator)
    .messages({
      'string.length': 'Estado deve ser a sigla da UF com 2 caracteres',
      'any.invalid': 'Estado deve ser uma UF válida'
    }),

  legislacao_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Legislação ID deve ser um número',
      'number.integer': 'Legislação ID deve ser um número inteiro',
      'number.positive': 'Legislação ID deve ser um número positivo'
    }),

  send_mensagem: Joi.boolean()
    .messages({
      'boolean.base': 'Send mensagem deve ser verdadeiro ou falso'
    })
});

// Schema para busca por nome
const searchMotoristas = Joi.object({
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
const motoristaParams = Joi.object({
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

// Schema para busca por CPF
const cpfParams = Joi.object({
  cpf: Joi.string()
    .required()
    .custom(cpfValidator)
    .messages({
      'any.required': 'CPF é obrigatório',
      'any.invalid': 'CPF inválido'
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
  createMotorista,
  updateMotorista,
  listMotoristas,
  searchMotoristas,
  motoristaParams,
  cpfParams,
  cidadeParams
};