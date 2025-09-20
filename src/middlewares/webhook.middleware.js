// ==========================================
// 6. MIDDLEWARES ADICIONAIS PARA WEBHOOK
// ==========================================
// backend/src/middlewares/webhook.middleware.js

const logger = require('../config/logger');

// Middleware para log de webhooks
const logWebhook = (req, res, next) => {
  const start = Date.now();
  
  logger.info('Webhook iniciado:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    bodySize: req.get('Content-Length')
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Webhook finalizado:', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
};

// Middleware para validar formato JSON
const validateJsonFormat = (req, res, next) => {
  if (req.method === 'POST' && req.get('Content-Type') !== 'application/json') {
    return res.status(400).json({
      success: false,
      message: 'Content-Type deve ser application/json'
    });
  }
  next();
};

module.exports = {
  logWebhook,
  validateJsonFormat
};