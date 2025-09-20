// ==========================================
// SCRIPT DE HEALTH CHECK
// ==========================================
// backend/scripts/health-check.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const axios = require('axios');
const Database = require('../src/database/connection');
const logger = require('../src/config/logger');

class HealthChecker {
  constructor() {
    this.baseURL = process.env.BASE_URL || 'http://localhost:3001';
    this.adminToken = process.env.ADMIN_TOKEN;
  }

  async performHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      status: 'unknown',
      checks: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };

    logger.info('=== HEALTH CHECK DO SISTEMA ===');

    // 1. Verificar banco de dados
    results.checks.database = await this.checkDatabase();
    
    // 2. Verificar API
    results.checks.api = await this.checkAPI();
    
    // 3. Verificar sistema de jobs
    results.checks.jobs = await this.checkJobsSystem();
    
    // 4. Verificar integrações
    results.checks.integrations = await this.checkIntegrations();
    
    // 5. Verificar recursos do sistema
    results.checks.resources = await this.checkSystemResources();

    // Calcular resumo
    for (const check of Object.values(results.checks)) {
      results.summary.total++;
      if (check.status === 'healthy') {
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
    }

    // Determinar status geral
    if (results.summary.failed === 0) {
      results.status = 'healthy';
    } else if (results.summary.passed > results.summary.failed) {
      results.status = 'degraded';
    } else {
      results.status = 'unhealthy';
    }

    this.printResults(results);
    return results;
  }

  async checkDatabase() {
    try {
      const database = new Database();
      await database.connect();
      
      const result = await database.query('SELECT NOW() as current_time');
      await database.disconnect();

      return {
        status: 'healthy',
        message: 'Conexão com banco de dados OK',
        details: {
          timestamp: result.rows[0].current_time,
          responseTime: '< 100ms'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Erro na conexão com banco de dados',
        error: error.message
      };
    }
  }

  async checkAPI() {
    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'API respondendo normalmente',
        details: {
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'API não está respondendo',
        error: error.message
      };
    }
  }

  async checkJobsSystem() {
    try {
      if (!this.adminToken) {
        return {
          status: 'warning',
          message: 'Token de admin não configurado'
        };
      }

      const response = await axios.get(`${this.baseURL}/api/jobs/status`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const { scheduler, statistics } = response.data.data;

      const isHealthy = scheduler.running && scheduler.config?.enabled;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Sistema de jobs funcionando' : 'Sistema de jobs com problemas',
        details: {
          running: scheduler.running,
          enabled: scheduler.config?.enabled,
          integrations_24h: statistics.total_integracoes,
          success_rate: statistics.taxa_sucesso + '%'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Sistema de jobs inacessível',
        error: error.message
      };
    }
  }

  async checkIntegrations() {
    try {
      if (!this.adminToken) {
        return {
          status: 'warning',
          message: 'Token de admin não configurado'
        };
      }

      const response = await axios.get(`${this.baseURL}/api/monitoring/health`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const integrations = response.data.data;
      
      if (!integrations || integrations.length === 0) {
        return {
          status: 'warning',
          message: 'Nenhuma integração configurada'
        };
      }

      const healthy = integrations.filter(i => i.status_saude === 'SAUDAVEL').length;
      const total = integrations.length;
      const healthyPercentage = Math.round((healthy / total) * 100);

      return {
        status: healthyPercentage >= 80 ? 'healthy' : healthyPercentage >= 50 ? 'degraded' : 'unhealthy',
        message: `${healthy}/${total} integrações saudáveis (${healthyPercentage}%)`,
        details: {
          total_integrations: total,
          healthy: healthy,
          percentage: healthyPercentage
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Erro ao verificar integrações',
        error: error.message
      };
    }
  }

  async checkSystemResources() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();

      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const memUsagePercent = Math.round((memUsedMB / memTotalMB) * 100);

      const uptimeHours = Math.round(uptime / 3600);

      let status = 'healthy';
      if (memUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memUsagePercent > 80) {
        status = 'warning';
      }

      return {
        status,
        message: `Recursos do sistema OK (Mem: ${memUsagePercent}%)`,
        details: {
          memory: {
            used: `${memUsedMB}MB`,
            total: `${memTotalMB}MB`,
            percentage: `${memUsagePercent}%`
          },
          uptime: `${uptimeHours}h`,
          node_version: process.version
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Erro ao verificar recursos',
        error: error.message
      };
    }
  }

  printResults(results) {
    const statusIcon = {
      'healthy': '✅',
      'degraded': '⚠️',
      'unhealthy': '❌',
      'warning': '⚠️',
      'unknown': '❓'
    };

    logger.info(`Status Geral: ${statusIcon[results.status]} ${results.status.toUpperCase()}`);
    logger.info(`Resumo: ${results.summary.passed}/${results.summary.total} verificações passaram`);
    logger.info('');

    for (const [name, check] of Object.entries(results.checks)) {
      const icon = statusIcon[check.status] || '❓';
      logger.info(`${icon} ${name}: ${check.message}`);
      
      if (check.details) {
        Object.entries(check.details).forEach(([key, value]) => {
          logger.info(`   - ${key}: ${value}`);
        });
      }
      
      if (check.error) {
        logger.info(`   - Erro: ${check.error}`);
      }
    }

    logger.info('');
    logger.info(`Health check concluído em: ${results.timestamp}`);
  }
}

async function runHealthCheck() {
  const checker = new HealthChecker();
  const results = await checker.performHealthCheck();
  
  // Exit code baseado no resultado
  if (results.status === 'unhealthy') {
    process.exit(1);
  } else if (results.status === 'degraded') {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runHealthCheck().catch(error => {
    logger.error('Erro no health check:', error);
    process.exit(1);
  });
}

module.exports = { HealthChecker, runHealthCheck };
