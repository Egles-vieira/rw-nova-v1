// ==========================================
// 1. JOBS CONTROLLER
// ==========================================
// backend/src/controllers/jobs.controller.js

const BaseController = require('./base.controller');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class JobsController extends BaseController {
  constructor(repository, jobScheduler) {
    super(repository);
    this.jobScheduler = jobScheduler;
  }

  // Obter status geral dos jobs
  async getStatus(req, res) {
    try {
      const status = this.jobScheduler.getStatus();
      
      // Buscar estatísticas do banco
      const stats = await this.repository.getJobStats();
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status dos jobs recuperado com sucesso',
        data: {
          scheduler: status,
          statistics: stats
        }
      });
    } catch (error) {
      logger.error('Erro ao obter status dos jobs:', error);
      return this.handleError(res, error);
    }
  }

  // Executar job manualmente
  async runManual(req, res) {
    try {
      if (this.jobScheduler.isRunning) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Job já está em execução'
        });
      }

      // Executar em background
      setImmediate(() => {
        this.jobScheduler.runManual().catch(error => {
          logger.error('Erro na execução manual do job:', error);
        });
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Job iniciado manualmente com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao executar job manual:', error);
      return this.handleError(res, error);
    }
  }

  // Parar jobs
  async stop(req, res) {
    try {
      await this.jobScheduler.stop();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Jobs parados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao parar jobs:', error);
      return this.handleError(res, error);
    }
  }

  // Reiniciar jobs
  async restart(req, res) {
    try {
      await this.jobScheduler.stop();
      await this.jobScheduler.initialize();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Jobs reiniciados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao reiniciar jobs:', error);
      return this.handleError(res, error);
    }
  }

  // Recarregar configurações
  async reloadConfig(req, res) {
    try {
      await this.jobScheduler.reloadConfig();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Configurações recarregadas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao recarregar configurações:', error);
      return this.handleError(res, error);
    }
  }

  // Listar integrações recentes
  async getIntegrations(req, res) {
    try {
      const { page = 1, limit = 20, dias = 7 } = req.query;
      
      const integrations = await this.repository.getRecentIntegrations({
        page: parseInt(page),
        limit: parseInt(limit),
        dias: parseInt(dias)
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Integrações recuperadas com sucesso',
        data: integrations
      });
    } catch (error) {
      logger.error('Erro ao buscar integrações:', error);
      return this.handleError(res, error);
    }
  }

  // Obter logs de uma integração
  async getIntegrationLogs(req, res) {
    try {
      const { integracaoId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const logs = await this.repository.getIntegrationLogs({
        integracaoId: parseInt(integracaoId),
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logs recuperados com sucesso',
        data: logs
      });
    } catch (error) {
      logger.error('Erro ao buscar logs da integração:', error);
      return this.handleError(res, error);
    }
  }

  // Processar transportadora específica
  async processTransportadora(req, res) {
    try {
      const { transportadoraId } = req.params;

      if (!transportadoraId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID da transportadora é obrigatório'
        });
      }

      // Buscar transportadora
      const transportadora = await this.repository.getTransportadoraById(transportadoraId);
      
      if (!transportadora) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Transportadora não encontrada'
        });
      }

      if (!transportadora.ativo || !transportadora.integracao_ocorrencia || transportadora.integracao_ocorrencia === 'manual') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Transportadora não possui integração ativa'
        });
      }

      // Processar em background
      setImmediate(async () => {
        try {
          await this.jobScheduler.processTransportadora(transportadora);
          logger.info(`Processamento manual da transportadora ${transportadoraId} concluído`);
        } catch (error) {
          logger.error(`Erro no processamento manual da transportadora ${transportadoraId}:`, error);
        }
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Processamento da transportadora ${transportadora.nome} iniciado`
      });
    } catch (error) {
      logger.error('Erro ao processar transportadora:', error);
      return this.handleError(res, error);
    }
  }

  // Limpar fila de uma transportadora
  async clearQueue(req, res) {
    try {
      const { transportadoraId } = req.params;

      if (!transportadoraId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID da transportadora é obrigatório'
        });
      }

      const cleared = this.jobScheduler.queueService.clearQueue(transportadoraId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Fila limpa: ${cleared} jobs removidos`
      });
    } catch (error) {
      logger.error('Erro ao limpar fila:', error);
      return this.handleError(res, error);
    }
  }

  // Configurar tokens de API
  async setApiToken(req, res) {
    try {
      const { integracao, token, expiresAt } = req.body;

      if (!integracao || !token) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Integração e token são obrigatórios'
        });
      }

      // Desativar tokens existentes
      await this.repository.deactivateApiTokens(integracao);

      // Criar novo token
      const apiToken = await this.repository.createApiToken({
        integracao,
        token,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        active: true
      });

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Token de API configurado com sucesso',
        data: {
          id: apiToken.id,
          integracao: apiToken.integracao,
          expires_at: apiToken.expires_at,
          active: apiToken.active
        }
      });
    } catch (error) {
      logger.error('Erro ao configurar token de API:', error);
      return this.handleError(res, error);
    }
  }

  // Listar tokens de API
  async getApiTokens(req, res) {
    try {
      const tokens = await this.repository.getApiTokens();

      // Remover valores dos tokens por segurança
      const safeTokens = tokens.map(token => ({
        id: token.id,
        integracao: token.integracao,
        expires_at: token.expires_at,
        active: token.active,
        created_at: token.created_at,
        hasToken: !!token.token
      }));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Tokens recuperados com sucesso',
        data: safeTokens
      });
    } catch (error) {
      logger.error('Erro ao buscar tokens de API:', error);
      return this.handleError(res, error);
    }
  }
}

module.exports = JobsController;

