// ==========================================
// 1. EXTERNAL AUTH MIDDLEWARE
// ==========================================
// backend/src/middlewares/external-auth.middleware.js

const ExternalAuthService = require('../services/external/external-auth.service');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class ExternalAuthMiddleware {
  constructor(repositories) {
    this.authService = new ExternalAuthService(repositories);
  }

  // Middleware de autenticação para APIs externas
  authenticate() {
    return async (req, res, next) => {
      try {
        // Extrair token do header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Token de autorização necessário. Use: Authorization: Bearer TOKEN'
          });
        }

        const token = authHeader.substring(7); // Remover 'Bearer '

        // Validar token
        const authResult = await this.authService.validateExternalToken(token);
        
        if (!authResult.valid) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: authResult.error || 'Token inválido'
          });
        }

        // Adicionar informações do token e transportadora na requisição
        req.externalAuth = {
          token: authResult.token,
          transportadora: authResult.transportadora,
          integracao: authResult.token.integracao
        };

        // Log da autenticação
        logger.info('Autenticação externa bem-sucedida:', {
          integracao: authResult.token.integracao,
          transportadora: authResult.transportadora.nome,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        next();

      } catch (error) {
        logger.error('Erro na autenticação externa:', error);
        
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro interno na autenticação'
        });
      }
    };
  }
}

module.exports = ExternalAuthMiddleware;
