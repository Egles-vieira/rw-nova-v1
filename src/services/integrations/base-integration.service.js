// ==========================================
// 1. BASE INTEGRATION SERVICE
// ==========================================
// backend/src/services/integrations/base-integration.service.js

const logger = require('../../config/logger');
const { HTTP_STATUS } = require('../../utils/constants');

class BaseIntegrationService {
  constructor(config = {}) {
    this.name = config.name || 'base';
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.rateLimitRequests = config.rateLimitRequests || 100;
    this.rateLimitPer = config.rateLimitPer || 'minute';
    this.circuitBreakerEnabled = config.circuitBreakerEnabled !== false;
    this.failureThreshold = config.failureThreshold || 5;
    this.resetTimeout = config.resetTimeout || 60000;

    // Circuit breaker state
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }

  // Template method - deve ser implementado pelas classes filhas
  async consultarAPI(numeroNF, transportadoraConfig) {
    throw new Error('consultarAPI deve ser implementado pela classe filha');
  }

  // Template method - parser de resposta
  parseResponse(response, numeroNF) {
    throw new Error('parseResponse deve ser implementado pela classe filha');
  }

  // Método principal para consulta com circuit breaker e retry
  async consultar(numeroNF, transportadoraConfig) {
    try {
      // Verificar circuit breaker
      if (!this.isRequestAllowed()) {
        throw new Error(`Circuit breaker OPEN para ${this.name}`);
      }

      // Tentar consulta com retry
      const response = await this.retryRequest(
        () => this.consultarAPI(numeroNF, transportadoraConfig),
        this.retryAttempts
      );

      // Processar resposta
      const ocorrencias = this.parseResponse(response, numeroNF);

      // Reset circuit breaker em caso de sucesso
      this.onSuccess();

      return {
        success: true,
        numeroNF,
        transportadora: this.name,
        ocorrencias,
        response
      };

    } catch (error) {
      this.onFailure();
      
      logger.error(`Erro na integração ${this.name}:`, {
        numeroNF,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  // Retry logic com backoff exponencial
  async retryRequest(requestFn, attempts) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Não fazer retry para erros 4xx (exceto 429)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          throw error;
        }

        if (attempt === attempts) {
          throw error;
        }

        // Backoff exponencial
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);

        logger.warn(`Tentativa ${attempt}/${attempts} falhou para ${this.name}:`, {
          error: error.message,
          nextAttempt: attempt + 1,
          delay
        });
      }
    }

    throw lastError;
  }

  // Circuit breaker methods
  isRequestAllowed() {
    if (!this.circuitBreakerEnabled) return true;

    if (this.circuitState === 'CLOSED') {
      return true;
    }

    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.circuitState = 'HALF_OPEN';
        logger.info(`Circuit breaker HALF_OPEN para ${this.name}`);
        return true;
      }
      return false;
    }

    if (this.circuitState === 'HALF_OPEN') {
      return true;
    }

    return false;
  }

  onSuccess() {
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
      this.failureCount = 0;
      logger.info(`Circuit breaker CLOSED para ${this.name}`);
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'OPEN';
      logger.warn(`Circuit breaker OPEN para ${this.name}`, {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Rate limiting check (deve ser implementado com Redis em produção)
  async checkRateLimit() {
    // Implementação básica - em produção usar Redis
    const now = Date.now();
    const windowMs = this.rateLimitPer === 'minute' ? 60000 : 3600000;

    if (now - this.lastResetTime >= windowMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.rateLimitRequests) {
      throw new Error(`Rate limit excedido para ${this.name}: ${this.rateLimitRequests}/${this.rateLimitPer}`);
    }

    this.requestCount++;
    return true;
  }
}

module.exports = BaseIntegrationService;






