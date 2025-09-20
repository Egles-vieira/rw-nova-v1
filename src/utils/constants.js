// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  GESTOR: 'gestor',
  OPERADOR: 'operador',
  VIEWER: 'viewer'
};

// Estados brasileiros
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Status de notas fiscais
const NOTA_FISCAL_STATUS = {
  PENDENTE: 'pendente',
  EM_TRANSITO: 'em_transito',
  ENTREGUE: 'entregue',
  DEVOLVIDA: 'devolvida',
  CANCELADA: 'cancelada'
};

// Tipos de ocorrência
const OCORRENCIA_TIPOS = {
  ENTREGA: 'entrega',
  COLETA: 'coleta',
  TENTATIVA: 'tentativa',
  AVARIA: 'avaria',
  EXTRAVIO: 'extravio'
};

// Status de romaneio
const ROMANEIO_STATUS = {
  CRIADO: 'criado',
  EM_ROTA: 'em_rota',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado'
};

// Tipos de veículo
const VEICULO_TIPOS = {
  TRUCK: 'truck',
  CARRETA: 'carreta',
  VUC: 'vuc',
  MOTO: 'moto'
};

// Prioridades de descarregamento
const PRIORIDADE_DESCARREGAMENTO = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAIXA: 'baixa'
};

// Tipos de integração
const INTEGRACAO_TIPOS = {
  API: 'api',
  WEBHOOK: 'webhook',
  FTP: 'ftp',
  EMAIL: 'email'
};

// Formatos de data
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  BRAZILIAN: 'DD/MM/YYYY',
  BRAZILIAN_WITH_TIME: 'DD/MM/YYYY HH:mm:ss'
};

// Regex patterns
const REGEX_PATTERNS = {
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CEP: /^\d{5}-\d{3}$/,
  PHONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PLATE_OLD: /^[A-Z]{3}-\d{4}$/,
  PLATE_MERCOSUL: /^[A-Z]{3}\d[A-Z]\d{2}$/
};

// Mensagens de erro padrão
const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Campo obrigatório',
  INVALID_FORMAT: 'Formato inválido',
  NOT_FOUND: 'Registro não encontrado',
  UNAUTHORIZED: 'Não autorizado',
  FORBIDDEN: 'Acesso negado',
  CONFLICT: 'Conflito de dados',
  INTERNAL_ERROR: 'Erro interno do servidor',
  VALIDATION_ERROR: 'Dados inválidos',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_INVALID: 'Token inválido'
};

// Configurações de paginação
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_ORDER: 'created_at',
  DEFAULT_DIRECTION: 'DESC'
};

// Tamanhos de arquivo
const FILE_SIZES = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  MAX_UPLOAD: 5 * 1024 * 1024 // 5MB
};

// Tipos de arquivo permitidos
const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ALL: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
};

// Configurações de cache
const CACHE = {
  TTL_SHORT: 5 * 60, // 5 minutos
  TTL_MEDIUM: 30 * 60, // 30 minutos
  TTL_LONG: 60 * 60, // 1 hora
  TTL_VERY_LONG: 24 * 60 * 60 // 24 horas
};

// Eventos do sistema
const SYSTEM_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',
  TRANSPORTADORA_CREATED: 'transportadora.created',
  TRANSPORTADORA_UPDATED: 'transportadora.updated',
  NOTA_FISCAL_CREATED: 'nota_fiscal.created',
  ROMANEIO_CREATED: 'romaneio.created',
  OCORRENCIA_CREATED: 'ocorrencia.created'
};
// Adicionar em utils/constants.js
const CODIGO_OCORRENCIA_TIPOS = {
  ENTREGA: 'entrega',
  COLETA: 'coleta',
  INCIDENTE: 'incidente',
  INFORMATIVO: 'informativo'
};

const CODIGO_OCORRENCIA_PROCESSOS = {
  PRE_ENTREGA: 'pre-entrega',
  EM_ENTREGA: 'em-entrega',
  POS_ENTREGA: 'pos-entrega',
  ADMINISTRATIVO: 'administrativo'
};
module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  BRAZILIAN_STATES,
  NOTA_FISCAL_STATUS,
  OCORRENCIA_TIPOS,
  ROMANEIO_STATUS,
  VEICULO_TIPOS,
  PRIORIDADE_DESCARREGAMENTO,
  INTEGRACAO_TIPOS,
  DATE_FORMATS,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  PAGINATION,
  FILE_SIZES,
  ALLOWED_FILE_TYPES,
  CACHE,
  SYSTEM_EVENTS,
  CODIGO_OCORRENCIA_TIPOS,
  CODIGO_OCORRENCIA_PROCESSOS
};



