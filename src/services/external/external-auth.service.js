// ==========================================
// 4. EXTERNAL AUTH SERVICE
// ==========================================
// backend/src/services/external/external-auth.service.js

const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');

class ExternalAuthService {
  constructor(repositories) {
    this.apiTokensRepo = repositories.apiTokens;
    this.transportadorasRepo = repositories.transportadoras;
  }

  // Validar token de API externa
  async validateExternalToken(token) {
    try {
      if (!token) {
        throw new Error('Token não fornecido');
      }

      // Buscar token ativo no banco
      const apiToken = await this.apiTokensRepo.findActiveToken(token);
      
      if (!apiToken) {
        throw new Error('Token inválido ou expirado');
      }

      // Verificar expiração
      if (apiToken.expires_at && new Date() > new Date(apiToken.expires_at)) {
        throw new Error('Token expirado');
      }

      // Buscar transportadora associada
      const transportadora = await this.transportadorasRepo.findByIntegracao(apiToken.integracao);
      
      if (!transportadora || !transportadora.ativo) {
        throw new Error('Transportadora não encontrada ou inativa');
      }

      // Atualizar último uso do token
      await this.updateTokenLastUsed(apiToken.id);

      return {
        valid: true,
        token: apiToken,
        transportadora: transportadora
      };

    } catch (error) {
      logger.error('Erro na validação do token externo:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Gerar novo token de API
  async generateApiToken(integracao, expiresInDays = 365) {
    try {
      const payload = {
        integracao: integracao,
        type: 'external_api',
        timestamp: Date.now()
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: `${expiresInDays}d`
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Desativar tokens existentes
      await this.apiTokensRepo.deactivateByIntegracao(integracao);

      // Criar novo token
      const newApiToken = await this.apiTokensRepo.create({
        integracao: integracao,
        token: token,
        expires_at: expiresAt,
        active: true
      });

      logger.info('Token de API criado:', {
        integracao: integracao,
        expires_at: expiresAt
      });

      return newApiToken;

    } catch (error) {
      logger.error('Erro ao gerar token de API:', error);
      throw error;
    }
  }

  // Atualizar último uso do token
  async updateTokenLastUsed(tokenId) {
    try {
      await this.apiTokensRepo.update(tokenId, {
        last_used_at: new Date()
      });
    } catch (error) {
      logger.warn('Erro ao atualizar último uso do token:', error);
    }
  }

  // Revogar token
  async revokeToken(token) {
    try {
      const apiToken = await this.apiTokensRepo.findByToken(token);
      
      if (apiToken) {
        await this.apiTokensRepo.update(apiToken.id, { active: false });
        logger.info('Token revogado:', { integracao: apiToken.integracao });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Erro ao revogar token:', error);
      throw error;
    }
  }

  // Listar tokens ativos
  async listActiveTokens() {
    try {
      return await this.apiTokensRepo.findActiveTokens();
    } catch (error) {
      logger.error('Erro ao listar tokens ativos:', error);
      throw error;
    }
  }
}

module.exports = ExternalAuthService;

