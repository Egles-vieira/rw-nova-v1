// ==========================================
// 2. MIDDLEWARE ESPECÍFICO PARA JOBS
// ==========================================
// backend/src/middlewares/jobs.middleware.js

const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

// Middleware para injetar controllers nos requests
const injectJobControllers = (jobManager) => {
  return (req, res, next) => {
    try {
      if (!jobManager.isInitialized) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: 'Sistema de jobs não está disponível'
        });
      }

      const repositories = jobManager.getRepositories();
      const scheduler = jobManager.getScheduler();

      // Injetar controllers específicos
      const JobsController = require('../controllers/jobs.controller');
      const MonitoringController = require('../controllers/monitoring.controller');

      req.jobsController = new JobsController(repositories.jobs, scheduler);
      req.monitoringController = new MonitoringController(repositories.monitoring);

      next();
    } catch (error) {
      logger.error('Erro no middleware de jobs:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Middleware para validar permissões de administração
const requireAdmin = (req, res, next) => {
  try {
    // Verificar se usuário é admin (baseado no padrão existente)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Acesso negado. Permissões de administrador necessárias.'
      });
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de admin:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para rate limiting de operações sensíveis
const jobsRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 operações por IP
  message: {
    success: false,
    message: 'Muitas operações de jobs. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limit para operações de leitura
    return req.method === 'GET';
  }
});

module.exports = {
  injectJobControllers,
  requireAdmin,
  jobsRateLimit
};
