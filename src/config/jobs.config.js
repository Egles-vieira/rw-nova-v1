// ==========================================
// 3. CONFIGURAÇÕES DE PRODUÇÃO
// ==========================================
// backend/src/config/jobs.config.js

const config = {
  development: {
    enabled: true,
    poll_interval: 60, // 1 minuto para desenvolvimento
    rate_limits: {
      jamef: { requests: 10, per: 'minute' },
      braspress: { requests: 20, per: 'hour' }
    },
    timeouts: {
      default: 10000,
      jamef: 5000
    },
    retry: {
      attempts: 2,
      exponential: true
    },
    circuit_breaker: {
      enabled: false // Desabilitado em dev
    }
  },

  test: {
    enabled: false, // Desabilitado em testes
    poll_interval: 10,
    rate_limits: {},
    timeouts: { default: 1000 },
    retry: { attempts: 1 },
    circuit_breaker: { enabled: false }
  },

  production: {
    enabled: true,
    poll_interval: 300, // 5 minutos
    rate_limits: {
      jamef: { requests: 100, per: 'minute' },
      braspress: { requests: 500, per: 'hour' },
      tnt: { requests: 200, per: 'minute' }
    },
    timeouts: {
      default: 30000,
      jamef: 15000,
      braspress: 45000,
      tnt: 20000
    },
    retry: {
      attempts: 3,
      exponential: true,
      base_delay: 1000
    },
    circuit_breaker: {
      enabled: true,
      failure_threshold: 5,
      reset_timeout: 60000
    }
  }
};

const env = process.env.NODE_ENV || 'development';

module.exports = config[env];