// ==========================================
// 4. EXTERNAL NOTAS VALIDATIONS
// ==========================================
// backend/src/validations/external-notas.validation.js

const Joi = require('joi');

// Schema para recebedor
const recebedorSchema = Joi.object({
  cod_cliente: Joi.string().optional(),
  documento: Joi.string()
    .pattern(/^\d{11}$|^\d{14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Documento deve conter 11 (CPF) ou 14 (CNPJ) dígitos',
      'any.required': 'Documento do recebedor é obrigatório'
    }),
  nome: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'any.required': 'Nome do recebedor é obrigatório'
    }),
  endereco: Joi.string().max(500).optional(),
  bairro: Joi.string().max(100).optional(),
  cep: Joi.string()
    .pattern(/^\d{5}-?\d{3}$/)
    .optional()
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 00000-000 ou 00000000'
    }),
  cidade: Joi.string().max(100).optional(),
  uf: Joi.string()
    .length(2)
    .uppercase()
    .optional()
    .messages({
      'string.length': 'UF deve conter exatamente 2 caracteres'
    }),
  contato: Joi.string().max(50).optional()
});

// Schema para remetente
const remetenteSchema = Joi.object({
  documento: Joi.string()
    .pattern(/^\d{14}$/)
    .required()
    .messages({
      'string.pattern.base': 'CNPJ do remetente deve conter 14 dígitos',
      'any.required': 'CNPJ do remetente é obrigatório'
    }),
  nome: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'any.required': 'Nome do remetente é obrigatório'
    }),
  endereco: Joi.string().max(500).optional(),
  municipio: Joi.string().max(100).optional(),
  uf: Joi.string().length(2).uppercase().optional(),
  contato: Joi.string().max(50).optional()
});

// Schema para transportadora
const transportadoraSchema = Joi.object({
  cnpj: Joi.string()
    .pattern(/^\d{14}$/)
    .required()
    .messages({
      'string.pattern.base': 'CNPJ da transportadora deve conter 14 dígitos',
      'any.required': 'CNPJ da transportadora é obrigatório'
    }),
  nome: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'any.required': 'Nome da transportadora é obrigatório'
    }),
  endereco: Joi.string().max(500).optional(),
  municipio: Joi.string().max(100).optional(),
  uf: Joi.string().length(2).uppercase().optional()
});

// Schema para endereço de entrega
const enderecoEntregaSchema = Joi.object({
  endereco: Joi.string().max(500).optional(),
  bairro: Joi.string().max(100).optional(),
  cidade: Joi.string().max(100).optional(),
  uf: Joi.string().length(2).uppercase().optional(),
  cep: Joi.string()
    .pattern(/^\d{5}-?\d{3}$/)
    .optional()
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 00000-000 ou 00000000'
    }),
  doca: Joi.string().max(20).optional(),
  rota: Joi.string().max(50).optional()
});

// Schema para nota fiscal individual
const notaFiscalSchema = Joi.object({
  peso_calculo: Joi.number().min(0).optional(),
  observacoes: Joi.string().max(1000).optional(),
  previsao_entrega: Joi.date().iso().optional(),
  chave_nf: Joi.string()
    .length(44)
    .pattern(/^\d{44}$/)
    .required()
    .messages({
      'string.length': 'Chave da NF deve conter exatamente 44 dígitos',
      'string.pattern.base': 'Chave da NF deve conter apenas números',
      'any.required': 'Chave da NF é obrigatória'
    }),
  ser: Joi.number().integer().min(1).max(999).optional(),
  emi_nf: Joi.date().iso().required().messages({
    'any.required': 'Data de emissão da NF é obrigatória'
  }),
  nro: Joi.number().integer().min(1).required().messages({
    'any.required': 'Número da NF é obrigatório'
  }),
  nro_pedido: Joi.number().integer().min(1).optional(),
  peso_real: Joi.number().min(0).optional(),
  cod_rep: Joi.number().integer().min(0).optional(),
  nome_rep: Joi.string().max(255).optional(),
  qtd_volumes: Joi.number().integer().min(1).optional(),
  metro_cubico: Joi.number().min(0).optional(),
  mensagem: Joi.string().max(500).optional(),
  valor: Joi.number().min(0).optional(),
  data_entrega: Joi.date().iso().optional(),
  status_nf: Joi.string().max(50).optional(),
  nf_retida: Joi.boolean().optional(),
  valor_frete: Joi.number().min(0).optional(),
  
  // Arrays obrigatórios
  recebedor: Joi.array()
    .items(recebedorSchema)
    .min(1)
    .max(1)
    .required()
    .messages({
      'array.min': 'Dados do recebedor são obrigatórios',
      'any.required': 'Dados do recebedor são obrigatórios'
    }),
  
  remetente: Joi.array()
    .items(remetenteSchema)
    .min(1)
    .max(1)
    .required()
    .messages({
      'array.min': 'Dados do remetente são obrigatórios',
      'any.required': 'Dados do remetente são obrigatórios'
    }),
  
  transportadora: Joi.array()
    .items(transportadoraSchema)
    .min(1)
    .max(1)
    .required()
    .messages({
      'array.min': 'Dados da transportadora são obrigatórios',
      'any.required': 'Dados da transportadora são obrigatórios'
    }),
  
  endereco_entrega: Joi.array()
    .items(enderecoEntregaSchema)
    .max(1)
    .optional()
});

// Schema principal para o body da requisição
const receiveNotasFiscaisSchema = Joi.object({
  notfis: Joi.array()
    .items(notaFiscalSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'Pelo menos uma nota fiscal é obrigatória',
      'array.max': 'Máximo de 100 notas fiscais por requisição',
      'any.required': 'Array de notas fiscais é obrigatório'
    })
});

// Schema para consulta de status
const consultarStatusSchema = Joi.object({
  chave_nf: Joi.string()
    .length(44)
    .pattern(/^\d{44}$/)
    .required()
    .messages({
      'string.length': 'Chave da NF deve conter exatamente 44 dígitos',
      'string.pattern.base': 'Chave da NF deve conter apenas números',
      'any.required': 'Chave da NF é obrigatória'
    })
});

// Schema para busca de notas fiscais
const buscarNotasSchema = Joi.object({
  nro_pedido: Joi.number().integer().min(1).optional(),
  data_inicio: Joi.date().iso().optional(),
  data_fim: Joi.date().iso().min(Joi.ref('data_inicio')).optional(),
  status: Joi.string().max(50).optional(),
  transportadora: Joi.number().integer().min(1).optional(),
  limite: Joi.number().integer().min(1).max(100).default(50)
});

module.exports = {
  receiveNotasFiscaisSchema,
  consultarStatusSchema,
  buscarNotasSchema
};