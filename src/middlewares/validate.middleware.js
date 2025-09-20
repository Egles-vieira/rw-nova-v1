const Joi = require('joi');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

// Validação do corpo da requisição
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Erro de validação do body:', { errors, body: req.body });

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados inválidos no corpo da requisição',
          errors
        });
      }

      req.body = value;
      next();
    } catch (validationError) {
      logger.error('Erro no middleware de validação do body:', validationError);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Validação dos parâmetros da URL
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Erro de validação dos parâmetros:', { errors, params: req.params });

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Parâmetros inválidos na URL',
          errors
        });
      }

      req.params = value;
      next();
    } catch (validationError) {
      logger.error('Erro no middleware de validação dos parâmetros:', validationError);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Validação dos query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Erro de validação da query:', { errors, query: req.query });

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Parâmetros de consulta inválidos',
          errors
        });
      }

      req.query = value;
      next();
    } catch (validationError) {
      logger.error('Erro no middleware de validação da query:', validationError);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Validação geral (alias para validateBody para compatibilidade)
const validate = validateBody;

module.exports = {
  validate,
  validateBody,
  validateParams,
  validateQuery
};