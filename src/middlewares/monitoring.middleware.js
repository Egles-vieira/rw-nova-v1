// ==========================================
// MIDDLEWARE ESPECÍFICO PARA MONITORING
// ==========================================
// backend/src/middlewares/monitoring.middleware.js

const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

// Middleware para injetar monitoring controller nos requests
const injectMonitoringControllers = (jobManager) => {
  return (req, res, next) => {
    try {
      if (!jobManager || !jobManager.isInitialized) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: 'Sistema de monitoramento não está disponível'
        });
      }

      const repositories = jobManager.getRepositories();

      // Injetar controller específico de monitoring
      const MonitoringController = require('../controllers/monitoring.controller');
      req.monitoringController = new MonitoringController(repositories.monitoring);

      next();
    } catch (error) {
      logger.error('Erro no middleware de monitoring:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// ✅ Exporte a função diretamente, não como objeto
module.exports = injectMonitoringControllers;