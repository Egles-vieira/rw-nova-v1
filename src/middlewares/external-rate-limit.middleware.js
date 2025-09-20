// src/middlewares/external-rate-limit.middleware.js

const rateLimit = require('express-rate-limit');

// Configurações de rate limiting por integração
const rateLimitConfig = {
  jamef: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500, // 500 requests por janela
    message: {
      error: 'Limite de requisições excedido para Jamef',
      retryAfter: 900
    }
  },
  braspress: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
      error: 'Limite de requisições excedido para Braspress',
      retryAfter: 900
    }
  },
  tnt: {
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
      error: 'Limite de requisições excedido para TNT',
      retryAfter: 900
    }
  },
  default: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: 'Limite de requisições excedido',
      retryAfter: 900
    }
  }
};

// Middleware para determinar o rate limit baseado na integração
const externalRateLimitMiddleware = (req, res, next) => {
  try {
    // Determinar a integração baseada no token ou cabeçalhos
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    let integration = 'default';
    
    // Simples lógica para detectar a integração (adaptar conforme necessário)
    if (token.includes('jamef') || req.headers['x-integration'] === 'jamef') {
      integration = 'jamef';
    } else if (token.includes('braspress') || req.headers['x-integration'] === 'braspress') {
      integration = 'braspress';
    } else if (token.includes('tnt') || req.headers['x-integration'] === 'tnt') {
      integration = 'tnt';
    }
    
    // Aplicar o rate limit específico
    const limiter = rateLimit(rateLimitConfig[integration] || rateLimitConfig.default);
    
    return limiter(req, res, next);
  } catch (error) {
    console.error('Erro no rate limiting:', error);
    // Em caso de erro, continuar sem rate limiting
    next();
  }
};

module.exports = externalRateLimitMiddleware;