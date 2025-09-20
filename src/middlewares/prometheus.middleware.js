// ==========================================
// 7. MONITORAMENTO COM PROMETHEUS/GRAFANA
// ==========================================
// backend/src/middleware/prometheus.middleware.js

const client = require('prom-client');
const logger = require('../config/logger');

// Criar métricas personalizadas para APIs externas
const externalApiRequests = new client.Counter({
  name: 'external_api_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['integracao', 'operacao', 'status']
});

const externalApiDuration = new client.Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'Duration of external API requests',
  labelNames: ['integracao', 'operacao'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const externalApiErrors = new client.Counter({
  name: 'external_api_errors_total',
  help: 'Total number of external API errors',
  labelNames: ['integracao', 'operacao', 'error_type']
});

const externalApiActiveTokens = new client.Gauge({
  name: 'external_api_active_tokens',
  help: 'Number of active external API tokens',
  labelNames: ['integracao']
});

class PrometheusMiddleware {
  constructor() {
    // Registrar métricas padrão
    client.register.clear();
    client.collectDefaultMetrics();
  }

  // Middleware para coletar métricas das APIs externas
  metricsMiddleware() {
    return (req, res, next) => {
      if (!req.path.startsWith('/api/external/')) {
        return next();
      }

      const startTime = Date.now();
      const integracao = req.externalAuth?.integracao || 'unknown';
      const operacao = this.extractOperation(req.path, req.method);

      // Interceptar resposta para coletar métricas
      const originalSend = res.send;
      res.send = function(body) {
        const duration = (Date.now() - startTime) / 1000;
        const status = res.statusCode >= 400 ? 'error' : 'success';

        // Coletar métricas
        externalApiRequests.inc({ integracao, operacao, status });
        externalApiDuration.observe({ integracao, operacao }, duration);

        if (res.statusCode >= 400) {
          externalApiErrors.inc({ 
            integracao, 
            operacao, 
            error_type: res.statusCode >= 500 ? 'server_error' : 'client_error' 
          });
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  extractOperation(path, method) {
    if (path.includes('/notas-fiscais')) {
      return method === 'GET' ? 'consulta_nf' : 'envio_nf';
    }
    if (path.includes('/ocorrencias')) {
      return method === 'GET' ? 'consulta_ocorrencia' : 'envio_ocorrencia';
    }
    if (path.includes('/webhook')) {
      return 'webhook';
    }
    return 'other';
  }

  // Atualizar métrica de tokens ativos
  async updateActiveTokensMetric(database) {
    try {
      const query = `
        SELECT integracao, COUNT(*) as count
        FROM api_tokens 
        WHERE active = true 
          AND (expires_at IS NULL OR expires_at > NOW())
        GROUP BY integracao
      `;

      const result = await database.query(query);
      
      // Reset gauge
      externalApiActiveTokens.reset();
      
      // Atualizar valores
      result.rows.forEach(row => {
        externalApiActiveTokens.set({ integracao: row.integracao }, row.count);
      });

    } catch (error) {
      logger.error('Erro ao atualizar métricas de tokens:', error);
    }
  }

  // Endpoint para Prometheus scraping
  metricsEndpoint() {
    return async (req, res) => {
      try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    };
  }
}

module.exports = PrometheusMiddleware;