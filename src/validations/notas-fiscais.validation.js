const Joi = require('joi');
const { NOTA_FISCAL_STATUS } = require('../utils/constants');

// Validador personalizado para chave de nota fiscal (44 dígitos)
const chaveValidator = (value, helpers) => {
  if (!value) return value;
  
  const cleanValue = String(value).replace(/\D/g, '');
  if (cleanValue.length !== 44) {
    return helpers.error('any.invalid');
  }
  return cleanValue;
};

// Validador personalizado para data não futura
const dateNotFutureValidator = (value, helpers) => {
  const date = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (date > today) {
    return helpers.error('date.max', { limit: today });
  }
  return value;
};

// Schema para criação de nota fiscal
const createNotaFiscal = Joi.object({
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

  embarcador_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Embarcador é obrigatório',
      'number.base': 'Embarcador deve ser um número',
      'number.integer': 'Embarcador deve ser um número inteiro',
      'number.positive': 'Embarcador deve ser um número positivo'
    }),

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

  endereco_entrega_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Endereço de entrega deve ser um número',
      'number.integer': 'Endereço de entrega deve ser um número inteiro',
      'number.positive': 'Endereço de entrega deve ser um número positivo'
    }),

  chave_cte: Joi.string()
    .allow(null, '')
    .custom(chaveValidator)
    .messages({
      'string.base': 'Chave CTE deve ser uma string',
      'any.invalid': 'Chave CTE deve ter 44 dígitos'
    }),

  cod_rep: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Código do representante é obrigatório',
      'number.base': 'Código do representante deve ser um número',
      'number.integer': 'Código do representante deve ser um número inteiro',
      'number.positive': 'Código do representante deve ser um número positivo'
    }),

  nome_rep: Joi.string()
    .required()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'any.required': 'Nome do representante é obrigatório',
      'string.min': 'Nome do representante deve ter pelo menos 2 caracteres',
      'string.max': 'Nome do representante deve ter no máximo 255 caracteres',
      'string.empty': 'Nome do representante não pode estar vazio'
    }),

  contato_rep: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Contato do representante deve ter no máximo 255 caracteres'
    }),

  emi_nf: Joi.date()
    .required()
    .max('now')
    .messages({
      'any.required': 'Data de emissão é obrigatória',
      'date.base': 'Data de emissão deve ser uma data válida',
      'date.max': 'Data de emissão não pode ser futura'
    }),

  ser_ctrc: Joi.string()
    .allow(null, '')
    .max(10)
    .trim()
    .messages({
      'string.max': 'Série CTRC deve ter no máximo 10 caracteres'
    }),

  nro_ctrc: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Número CTRC deve ser um número',
      'number.integer': 'Número CTRC deve ser um número inteiro',
      'number.positive': 'Número CTRC deve ser um número positivo'
    }),

  peso_calculo: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'any.required': 'Peso de cálculo é obrigatório',
      'number.base': 'Peso de cálculo deve ser um número',
      'number.positive': 'Peso de cálculo deve ser positivo'
    }),

  peso_real: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Peso real deve ser um número',
      'number.positive': 'Peso real deve ser positivo'
    }),

  peso_liquido: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Peso líquido deve ser um número',
      'number.positive': 'Peso líquido deve ser positivo'
    }),

  ordem: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Ordem deve ser um número',
      'number.integer': 'Ordem deve ser um número inteiro',
      'number.min': 'Ordem deve ser maior ou igual a 0'
    }),

  observacoes: Joi.string()
    .allow(null, '')
    .max(1000)
    .trim()
    .messages({
      'string.max': 'Observações devem ter no máximo 1000 caracteres'
    }),

  previsao_entrega: Joi.date()
    .allow(null)
    .messages({
      'date.base': 'Previsão de entrega deve ser uma data válida'
    }),

  chave_nf: Joi.string()
    .allow(null, '')
    .custom(chaveValidator)
    .messages({
      'string.base': 'Chave NF deve ser uma string',
      'any.invalid': 'Chave NF deve ter 44 dígitos'
    }),

  ser: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Série deve ser um número',
      'number.integer': 'Série deve ser um número inteiro',
      'number.positive': 'Série deve ser um número positivo'
    }),

  nro: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Número deve ser um número',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser um número positivo'
    }),

  nro_pedido: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Número do pedido deve ser um número',
      'number.integer': 'Número do pedido deve ser um número inteiro',
      'number.positive': 'Número do pedido deve ser um número positivo'
    }),

  qtd_volumes: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Quantidade de volumes deve ser um número',
      'number.integer': 'Quantidade de volumes deve ser um número inteiro',
      'number.positive': 'Quantidade de volumes deve ser positiva'
    }),

  mensagem: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Mensagem deve ter no máximo 255 caracteres'
    }),

  valor: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Valor deve ser um número',
      'number.positive': 'Valor deve ser positivo'
    }),

  valor_frete: Joi.number()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Valor do frete deve ser um número',
      'number.positive': 'Valor do frete deve ser positivo'
    }),

  metro_cubico: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Metro cúbico deve ser um número',
      'number.positive': 'Metro cúbico deve ser positivo'
    }),

  status_nf: Joi.string()
    .valid(...Object.values(NOTA_FISCAL_STATUS))
    .default(NOTA_FISCAL_STATUS.PENDENTE)
    .messages({
      'any.only': `Status deve ser um dos valores: ${Object.values(NOTA_FISCAL_STATUS).join(', ')}`
    }),

  nf_retida: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'NF retida deve ser verdadeiro ou falso'
    }),

  roteirizada: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Roteirizada deve ser verdadeiro ou falso'
    })
});

// Schema para atualização de nota fiscal
const updateNotaFiscal = Joi.object({
  cliente_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Cliente deve ser um número',
      'number.integer': 'Cliente deve ser um número inteiro',
      'number.positive': 'Cliente deve ser um número positivo'
    }),

  embarcador_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Embarcador deve ser um número',
      'number.integer': 'Embarcador deve ser um número inteiro',
      'number.positive': 'Embarcador deve ser um número positivo'
    }),

  transportadora_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Transportadora deve ser um número',
      'number.integer': 'Transportadora deve ser um número inteiro',
      'number.positive': 'Transportadora deve ser um número positivo'
    }),

  endereco_entrega_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Endereço de entrega deve ser um número',
      'number.integer': 'Endereço de entrega deve ser um número inteiro',
      'number.positive': 'Endereço de entrega deve ser um número positivo'
    }),

  cod_rep: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Código do representante deve ser um número',
      'number.integer': 'Código do representante deve ser um número inteiro',
      'number.positive': 'Código do representante deve ser um número positivo'
    }),

  nome_rep: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'Nome do representante deve ter pelo menos 2 caracteres',
      'string.max': 'Nome do representante deve ter no máximo 255 caracteres',
      'string.empty': 'Nome do representante não pode estar vazio'
    }),

  contato_rep: Joi.string()
    .allow(null, '')
    .max(255)
    .trim()
    .messages({
      'string.max': 'Contato do representante deve ter no máximo 255 caracteres'
    }),

  peso_calculo: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.base': 'Peso de cálculo deve ser um número',
      'number.positive': 'Peso de cálculo deve ser positivo'
    }),

  peso_real: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Peso real deve ser um número',
      'number.positive': 'Peso real deve ser positivo'
    }),

  peso_liquido: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Peso líquido deve ser um número',
      'number.positive': 'Peso líquido deve ser positivo'
    }),

  qtd_volumes: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Quantidade de volumes deve ser um número',
      'number.integer': 'Quantidade de volumes deve ser um número inteiro',
      'number.positive': 'Quantidade de volumes deve ser positiva'
    }),

  valor: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Valor deve ser um número',
      'number.positive': 'Valor deve ser positivo'
    }),

  valor_frete: Joi.number()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'Valor do frete deve ser um número',
      'number.positive': 'Valor do frete deve ser positivo'
    }),

  metro_cubico: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.base': 'Metro cúbico deve ser um número',
      'number.positive': 'Metro cúbico deve ser positivo'
    }),

  previsao_entrega: Joi.date()
    .allow(null)
    .messages({
      'date.base': 'Previsão de entrega deve ser uma data válida'
    }),

  observacoes: Joi.string()
    .allow(null, '')
    .max(1000)
    .trim()
    .messages({
      'string.max': 'Observações devem ter no máximo 1000 caracteres'
    }),

  status_nf: Joi.string()
    .valid(...Object.values(NOTA_FISCAL_STATUS))
    .messages({
      'any.only': `Status deve ser um dos valores: ${Object.values(NOTA_FISCAL_STATUS).join(', ')}`
    }),

  nf_retida: Joi.boolean()
    .messages({
      'boolean.base': 'NF retida deve ser verdadeiro ou falso'
    }),

  roteirizada: Joi.boolean()
    .messages({
      'boolean.base': 'Roteirizada deve ser verdadeiro ou falso'
    })
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para listagem com filtros
const listNotasFiscais = Joi.object({
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
    .valid(
      'id', 'nro', 'emi_nf', 'previsao_entrega', 'valor', 
      'peso_calculo', 'created_at', 'updated_at'
    )
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

  chave_nf: Joi.string()
    .custom(chaveValidator)
    .messages({
      'any.invalid': 'Chave NF deve ter 44 dígitos'
    }),

  nro: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Número deve ser um número',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser um número positivo'
    }),

  cliente_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Cliente deve ser um número',
      'number.integer': 'Cliente deve ser um número inteiro',
      'number.positive': 'Cliente deve ser um número positivo'
    }),

  embarcador_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Embarcador deve ser um número',
      'number.integer': 'Embarcador deve ser um número inteiro',
      'number.positive': 'Embarcador deve ser um número positivo'
    }),

  transportadora_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Transportadora deve ser um número',
      'number.integer': 'Transportadora deve ser um número inteiro',
      'number.positive': 'Transportadora deve ser um número positivo'
    }),

  romaneio_id: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': 'Romaneio deve ser um número',
      'number.integer': 'Romaneio deve ser um número inteiro',
      'number.positive': 'Romaneio deve ser um número positivo'
    }),

  status_nf: Joi.string()
    .valid(...Object.values(NOTA_FISCAL_STATUS))
    .messages({
      'any.only': `Status deve ser um dos valores: ${Object.values(NOTA_FISCAL_STATUS).join(', ')}`
    }),

  finalizada: Joi.string()
    .valid('true', 'false')
    .messages({
      'any.only': 'Finalizada deve ser true ou false'
    }),

  data_inicio: Joi.date()
    .messages({
      'date.base': 'Data de início deve ser uma data válida'
    }),

  data_fim: Joi.date()
    .min(Joi.ref('data_inicio'))
    .messages({
      'date.base': 'Data de fim deve ser uma data válida',
      'date.min': 'Data de fim deve ser maior ou igual à data de início'
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
    })
});

// Schema para atualizar status
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(NOTA_FISCAL_STATUS))
    .required()
    .messages({
      'any.required': 'Status é obrigatório',
      'any.only': `Status deve ser um dos valores: ${Object.values(NOTA_FISCAL_STATUS).join(', ')}`
    }),

  observacoes: Joi.string()
    .allow(null, '')
    .max(1000)
    .trim()
    .messages({
      'string.max': 'Observações devem ter no máximo 1000 caracteres'
    })
});

// Schema para finalizar nota fiscal
const finalizarSchema = Joi.object({
  data_entrega: Joi.date()
    .required()
    .custom(dateNotFutureValidator)
    .messages({
      'any.required': 'Data de entrega é obrigatória',
      'date.base': 'Data de entrega deve ser uma data válida',
      'date.max': 'Data de entrega não pode ser futura'
    }),

  hora_entrega: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Hora de entrega deve estar no formato HH:mm:ss'
    }),

  observacoes: Joi.string()
    .allow(null, '')
    .max(1000)
    .trim()
    .messages({
      'string.max': 'Observações devem ter no máximo 1000 caracteres'
    })
});

// Schema para associação com romaneio
const romaneioAssociationSchema = Joi.object({
  notaIds: Joi.array()
    .items(
      Joi.number()
        .integer()
        .positive()
        .messages({
          'number.base': 'ID da nota deve ser um número',
          'number.integer': 'ID da nota deve ser um número inteiro',
          'number.positive': 'ID da nota deve ser um número positivo'
        })
    )
    .min(1)
    .required()
    .messages({
      'any.required': 'Lista de IDs das notas é obrigatória',
      'array.base': 'Lista de IDs deve ser um array',
      'array.min': 'Pelo menos uma nota deve ser informada'
    })
});

// Schema para parâmetros de rota
const notaFiscalParams = Joi.object({
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

// Schema para chaves (NF e CTE)
const chaveParams = Joi.object({
  chave: Joi.string()
    .required()
    .custom(chaveValidator)
    .messages({
      'any.required': 'Chave é obrigatória',
      'any.invalid': 'Chave deve ter 44 dígitos'
    })
});

// Schema para número e série
const numeroSerieParams = Joi.object({
  numero: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Número é obrigatório',
      'number.base': 'Número deve ser um número',
      'number.integer': 'Número deve ser um número inteiro',
      'number.positive': 'Número deve ser um número positivo'
    }),

  serie: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Série é obrigatória',
      'number.base': 'Série deve ser um número',
      'number.integer': 'Série deve ser um número inteiro',
      'number.positive': 'Série deve ser um número positivo'
    })
});

// Schema para estatísticas por período
const statsByPeriodQuery = Joi.object({
  data_inicio: Joi.date()
    .required()
    .messages({
      'any.required': 'Data de início é obrigatória',
      'date.base': 'Data de início deve ser uma data válida'
    }),

  data_fim: Joi.date()
    .required()
    .min(Joi.ref('data_inicio'))
    .messages({
      'any.required': 'Data de fim é obrigatória',
      'date.base': 'Data de fim deve ser uma data válida',
      'date.min': 'Data de fim deve ser maior ou igual à data de início'
    })
});

module.exports = {
  createNotaFiscal,
  updateNotaFiscal,
  listNotasFiscais,
  updateStatusSchema,
  finalizarSchema,
  romaneioAssociationSchema, // ← CERTIFIQUE-SE DE QUE ESTÁ AQUI
  notaFiscalParams,
  chaveParams,
  numeroSerieParams,
  statsByPeriodQuery
};