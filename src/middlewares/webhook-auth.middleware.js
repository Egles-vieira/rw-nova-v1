// ==========================================
// 9. MIDDLEWARE DE AUTENTICAÇÃO PARA WEBHOOKS
// ==========================================
// backend/src/middlewares/webhook-auth.middleware.js

const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');
const IntegrationFactory = require('../services/integrations/integration-factory');

class WebhookAuthMiddleware {
    // Validação dinâmica baseada na transportadora
  static validateByTransportadora(req, res, next) {
    try {
      const { transportadora } = req.params;
      
      if (!transportadora) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Nome da transportadora é obrigatório'
        });
      }

      // Verificar se é uma transportadora com integration service
      const availableServices = IntegrationFactory.getAvailableServices();
      const isKnownService = availableServices.includes(transportadora.toLowerCase());

      // Aplicar validação específica se existe service
      if (isKnownService) {
        return this.validateKnownTransportadora(req, res, next, transportadora.toLowerCase());
      } else {
        // Validação genérica para transportadoras desconhecidas
        return this.validateGenericTransportadora(req, res, next, transportadora);
      }

    } catch (error) {
      logger.error('Erro na validação de webhook:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static validateKnownTransportadora(req, res, next, transportadora) {
    // Redirecionar para validação específica
    switch (transportadora) {
      case 'jamef':
        return this.validateJamef(req, res, next);
      case 'braspress':
        return this.validateBraspress(req, res, next);
      case 'tnt':
        return this.validateTNT(req, res, next);
      default:
        return this.validateGenericTransportadora(req, res, next, transportadora);
    }
  }

  static validateGenericTransportadora(req, res, next, transportadora) {
    const authHeader = req.get('Authorization');
    
    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token de autorização necessário'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const expectedToken = process.env[`${transportadora.toUpperCase()}_WEBHOOK_TOKEN`];
    
    if (!expectedToken || token !== expectedToken) {
      logger.warn('Token inválido para webhook:', {
        transportadora: transportadora,
        ip: req.ip
      });
      
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token de autorização inválido'
      });
    }
    
    req.transportadora = transportadora;
    next();
  }

  // Validação para Jamef
  static validateJamef(req, res, next) {
    try {
      const authHeader = req.get('Authorization');
      const jamefToken = process.env.JAMEF_WEBHOOK_TOKEN;
      
      if (!authHeader || !jamefToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token de autorização necessário'
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      if (token !== jamefToken) {
        logger.warn('Token inválido para webhook Jamef:', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token de autorização inválido'
        });
      }
      
      req.transportadora = 'jamef';
      next();
    } catch (error) {
      logger.error('Erro na validação de webhook Jamef:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // Validação para Braspress
  static validateBraspress(req, res, next) {
    try {
      const signature = req.get('X-Braspress-Signature');
      const braspressSecret = process.env.BRASPRESS_WEBHOOK_SECRET;
      
      if (!signature || !braspressSecret) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Assinatura de autorização necessária'
        });
      }
      
      // Validar assinatura HMAC (implementar conforme especificação da Braspress)
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', braspressSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== `sha256=${expectedSignature}`) {
        logger.warn('Assinatura inválida para webhook Braspress:', {
          ip: req.ip,
          signature: signature
        });
        
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Assinatura de autorização inválida'
        });
      }
      
      req.transportadora = 'braspress';
      next();
    } catch (error) {
      logger.error('Erro na validação de webhook Braspress:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // Validação para TNT
  static validateTNT(req, res, next) {
    try {
      const apiKey = req.get('X-API-Key');
      const tntApiKey = process.env.TNT_WEBHOOK_API_KEY;
      
      if (!apiKey || !tntApiKey) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'API Key necessária'
        });
      }
      
      if (apiKey !== tntApiKey) {
        logger.warn('API Key inválida para webhook TNT:', {
          ip: req.ip,
          apiKey: apiKey
        });
        
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'API Key inválida'
        });
      }
      
      req.transportadora = 'tnt';
      next();
    } catch (error) {
      logger.error('Erro na validação de webhook TNT:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // Validação genérica
  static validateGeneric(req, res, next) {
    try {
      const { transportadora } = req.params;
      const authHeader = req.get('Authorization');
      
      if (!authHeader) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token de autorização necessário'
        });
      }
      
      // Validação básica - pode ser customizada por transportadora
      const token = authHeader.replace('Bearer ', '');
      const expectedToken = process.env[`${transportadora.toUpperCase()}_WEBHOOK_TOKEN`];
      
      if (!expectedToken || token !== expectedToken) {
        logger.warn('Token inválido para webhook genérico:', {
          transportadora: transportadora,
          ip: req.ip
        });
        
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token de autorização inválido'
        });
      }
      
      req.transportadora = transportadora;
      next();
    } catch (error) {
      logger.error('Erro na validação de webhook genérico:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = WebhookAuthMiddleware;