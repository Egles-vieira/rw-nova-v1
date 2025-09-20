// validations/webhook.validation.js - Schema de ocorrências baseado no schema real
const Joi = require('joi');

// Schema para uma ocorrência individual baseado no schema real da tabela
const ocorrenciaSchema = Joi.object({
  // Campos obrigatórios (NOT NULL no banco)
  nro_nf: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Número da NF é obrigatório',
      'number.base': 'Número da NF deve ser um número',
      'number.integer': 'Número da NF deve ser um número inteiro',
      'number.positive': 'Número da NF deve ser positivo'
    }),

  dataHoraEnvio: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Data/hora de envio é obrigatória',
      'date.base': 'Data/hora de envio deve ser uma data válida',
      'date.format': 'Data/hora de envio deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)'
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
    }),

  descricao: Joi.string()
    .required()
    .min(1)
    .max(65535) // text no PostgreSQL
    .trim()
    .messages({
      'any.required': 'Descrição é obrigatória',
      'string.empty': 'Descrição não pode estar vazia',
      'string.min': 'Descrição deve ter pelo menos 1 caractere',
      'string.max': 'Descrição é muito longa'
    }),

  // Campos opcionais (nullable no banco)
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

// Schema principal para webhook de ocorrências
const webhookOcorrenciasSchema = Joi.object({
  ocorrencias: Joi.array()
    .items(ocorrenciaSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'any.required': 'Campo "ocorrencias" é obrigatório',
      'array.base': 'Campo "ocorrencias" deve ser um array',
      'array.min': 'Deve conter pelo menos uma ocorrência',
      'array.max': 'Máximo de 100 ocorrências por requisição'
    })
});

// Schemas de notas fiscais (mantidos do código original)
const recebedorSchema = Joi.object({
  cod_cliente: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'Código do cliente deve ser uma string'
    }),

  documento: Joi.string()
    .required()
    .messages({
      'any.required': 'Documento do recebedor é obrigatório',
      'string.base': 'Documento deve ser uma string'
    }),

  nome: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(255)
    .messages({
      'any.required': 'Nome do recebedor é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres'
    }),

  endereco: Joi.string()
    .allow('', null)
    .max(255)
    .messages({
      'string.max': 'Endereço deve ter no máximo 255 caracteres'
    }),

  bairro: Joi.string()
    .allow('', null)
    .max(100)
    .messages({
      'string.max': 'Bairro deve ter no máximo 100 caracteres'
    }),

  cep: Joi.string()
    .allow('', null)
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 00000-000 ou 00000000'
    }),

  cidade: Joi.string()
    .allow('', null)
    .max(100)
    .messages({
      'string.max': 'Cidade deve ter no máximo 100 caracteres'
    }),

  uf: Joi.string()
    .allow('', null)
    .length(2)
    .uppercase()
    .messages({
      'string.length': 'UF deve ter 2 caracteres'
    }),

  contato: Joi.string()
    .allow('', null)
    .max(50)
    .messages({
      'string.max': 'Contato deve ter no máximo 50 caracteres'
    })
});

const enderecoEntregaSchema = Joi.object({
  endereco: Joi.string()
    .allow('', null)
    .max(255)
    .messages({
      'string.max': 'Endereço deve ter no máximo 255 caracteres'
    }),

  bairro: Joi.string()
    .allow('', null)
    .max(100)
    .messages({
      'string.max': 'Bairro deve ter no máximo 100 caracteres'
    }),

  cep: Joi.string()
    .allow('', null)
    .pattern(/^\d{5}-?\d{3}$/)
    .messages({
      'string.pattern.base': 'CEP deve estar no formato 00000-000 ou 00000000'
    }),

  cidade: Joi.string()
    .allow('', null)
    .max(100)
    .messages({
      'string.max': 'Cidade deve ter no máximo 100 caracteres'
    }),

  uf: Joi.string()
    .allow('', null)
    .length(2)
    .uppercase()
    .messages({
      'string.length': 'UF deve ter 2 caracteres'
    }),

  doca: Joi.string()
    .allow('', null)
    .max(20)
    .messages({
      'string.max': 'Doca deve ter no máximo 20 caracteres'
    }),

  rota: Joi.string()
    .allow('', null)
    .max(50)
    .messages({
      'string.max': 'Rota deve ter no máximo 50 caracteres'
    })
});

const remetenteSchema = Joi.object({
  documento: Joi.string()
    .required()
    .messages({
      'any.required': 'Documento do remetente é obrigatório',
      'string.base': 'Documento deve ser uma string'
    }),

  nome: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(255)
    .messages({
      'any.required': 'Nome do remetente é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres'
    })
});

const transportadoraSchema = Joi.object({
  cnpj: Joi.string()
    .required()
    .messages({
      'any.required': 'CNPJ da transportadora é obrigatório',
      'string.base': 'CNPJ deve ser uma string'
    }),

  nome: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(255)
    .messages({
      'any.required': 'Nome da transportadora é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres'
    }),

  endereco: Joi.string()
    .allow('', null)
    .max(255)
    .messages({
      'string.max': 'Endereço deve ter no máximo 255 caracteres'
    }),

  municipio: Joi.string()
    .allow('', null)
    .max(100)
    .messages({
      'string.max': 'Município deve ter no máximo 100 caracteres'
    }),

  uf: Joi.string()
    .allow('', null)
    .length(2)
    .uppercase()
    .messages({
      'string.length': 'UF deve ter 2 caracteres'
    })
});

const notaFiscalSchema = Joi.object({
  peso_calculo: Joi.number()
    .min(0)
    .allow(null)
    .default(0)
    .messages({
      'number.min': 'Peso cálculo deve ser maior ou igual a zero'
    }),

  observacoes: Joi.string()
    .allow('', null)
    .max(1000)
    .messages({
      'string.max': 'Observações deve ter no máximo 1000 caracteres'
    }),

  previsao_entrega: Joi.string()
    .isoDate()
    .allow('', null)
    .messages({
      'string.isoDate': 'Previsão de entrega deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)'
    }),

  chave_nf: Joi.string()
    .allow('', null)
    .length(44)
    .messages({
      'string.length': 'Chave da NF deve ter 44 caracteres'
    }),

  ser: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .messages({
      'number.integer': 'Série deve ser um número inteiro',
      'number.min': 'Série deve ser maior que zero'
    }),

  emi_nf: Joi.string()
    .isoDate()
    .allow('', null)
    .messages({
      'string.isoDate': 'Data de emissão deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)'
    }),

  nro: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'any.required': 'Número da NF é obrigatório',
      'number.integer': 'Número deve ser um inteiro',
      'number.min': 'Número deve ser maior que zero'
    }),

  nro_pedido: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .messages({
      'number.integer': 'Número do pedido deve ser um inteiro',
      'number.min': 'Número do pedido deve ser maior que zero'
    }),

  peso_real: Joi.number()
    .min(0)
    .allow(null)
    .messages({
      'number.min': 'Peso real deve ser maior ou igual a zero'
    }),

  cod_rep: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .messages({
      'number.integer': 'Código do representante deve ser um inteiro',
      'number.min': 'Código do representante deve ser maior que zero'
    }),

  nome_rep: Joi.string()
    .allow('', null)
    .max(255)
    .messages({
      'string.max': 'Nome do representante deve ter no máximo 255 caracteres'
    }),

  qtd_volumes: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .default(1)
    .messages({
      'number.integer': 'Quantidade de volumes deve ser um inteiro',
      'number.min': 'Quantidade de volumes deve ser maior que zero'
    }),

  metro_cubico: Joi.number()
    .min(0)
    .allow(null)
    .default(0)
    .messages({
      'number.min': 'Metro cúbico deve ser maior ou igual a zero'
    }),

  mensagem: Joi.string()
    .allow('', null)
    .max(500)
    .messages({
      'string.max': 'Mensagem deve ter no máximo 500 caracteres'
    }),

  valor: Joi.number()
    .min(0)
    .allow(null)
    .default(0)
    .messages({
      'number.min': 'Valor deve ser maior ou igual a zero'
    }),

  data_entrega: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'Data de entrega deve ser uma string'
    }),

  status_nf: Joi.string()
    .valid('pendente', 'em_transito', 'entregue', 'devolvida', 'cancelada', 'pedido reservado')
    .allow('', null)
    .default('pendente')
    .messages({
      'any.only': 'Status deve ser: pendente, em_transito, entregue, devolvida, cancelada ou pedido reservado'
    }),

  nf_retida: Joi.boolean()
    .allow(null)
    .default(false)
    .messages({
      'boolean.base': 'NF retida deve ser verdadeiro ou falso'
    }),

  valor_frete: Joi.number()
    .min(0)
    .allow(null)
    .default(0)
    .messages({
      'number.min': 'Valor do frete deve ser maior ou igual a zero'
    }),

  recebedor: Joi.array()
    .items(recebedorSchema)
    .min(1)
    .required()
    .messages({
      'any.required': 'Dados do recebedor são obrigatórios',
      'array.min': 'Deve conter pelo menos um recebedor'
    }),

  endereco_entrega: Joi.array()
    .items(enderecoEntregaSchema)
    .allow(null)
    .messages({
      'array.base': 'Endereço de entrega deve ser um array'
    }),

  remetente: Joi.array()
    .items(remetenteSchema)
    .min(1)
    .required()
    .messages({
      'any.required': 'Dados do remetente são obrigatórios',
      'array.min': 'Deve conter pelo menos um remetente'
    }),

  transportadora: Joi.array()
    .items(transportadoraSchema)
    .min(1)
    .required()
    .messages({
      'any.required': 'Dados da transportadora são obrigatórios',
      'array.min': 'Deve conter pelo menos uma transportadora'
    })
});

const webhookNotaFiscalSchema = Joi.object({
  notfis: Joi.array()
    .items(notaFiscalSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'any.required': 'Campo "notfis" é obrigatório',
      'array.min': 'Deve conter pelo menos uma nota fiscal',
      'array.max': 'Máximo de 100 notas fiscais por requisição',
      'array.base': 'Campo "notfis" deve ser um array'
    })
});

module.exports = {
  // Schemas de notas fiscais
  webhookNotaFiscalSchema,
  notaFiscalSchema,
  recebedorSchema,
  enderecoEntregaSchema,
  remetenteSchema,
  transportadoraSchema,
  
  // Schemas de ocorrências
  webhookOcorrenciasSchema,
  ocorrenciaSchema
};