const winston = require('winston');
const path = require('path');

// Verificar se estamos em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';

// Definir formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Formato para console em desenvolvimento
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Criar transports
const transports = [];

// Console transport (sempre ativo)
transports.push(
  new winston.transports.Console({
    level: isDevelopment ? 'debug' : 'info',
    format: isDevelopment ? consoleFormat : customFormat
  })
);

// File transport (apenas se logs estiver habilitado)
if (process.env.LOG_FILE) {
  const logDir = path.dirname(process.env.LOG_FILE);
  
  // Criar diretório se não existir
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Transport para logs gerais
  transports.push(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      level: process.env.LOG_LEVEL || 'info',
      format: customFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
      tailable: true
    })
  );

  // Transport separado para erros
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
      tailable: true
    })
  );
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'road-rw-api',
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  },
  transports,
  // Não sair em caso de erro
  exitOnError: false
});

// Adicionar método para logs de performance
logger.performance = (message, startTime, metadata = {}) => {
  const duration = Date.now() - startTime;
  logger.info(message, {
    ...metadata,
    duration: `${duration}ms`,
    type: 'performance'
  });
};

// Adicionar método para logs de auditoria
logger.audit = (action, userId, resource, metadata = {}) => {
  logger.info(`AUDIT: ${action}`, {
    userId,
    resource,
    ...metadata,
    type: 'audit',
    timestamp: new Date().toISOString()
  });
};

// Adicionar método para logs de segurança
logger.security = (event, details = {}) => {
  logger.warn(`SECURITY: ${event}`, {
    ...details,
    type: 'security',
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;