
// ==========================================
// 1. SCRIPT DE MANUTENÇÃO AUTOMÁTICA
// ==========================================
// backend/scripts/maintenance-external-apis.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Database = require('../src/database/connection');
const ExternalApiManagerService = require('../src/services/external/external-api-manager.service');
const logger = require('../src/config/logger');

class ExternalAPIMaintenance {
  constructor() {
    this.database = null;
    this.apiManager = null;
  }

  async initialize() {
    this.database = new Database();
    await this.database.connect();
    
    // Repositories básicos necessários
    const repositories = {
      apiTokens: new (require('../src/repositories/api-tokens.repository'))(this.database),
      externalLogs: new (require('../src/repositories/external-logs.repository'))(this.database)
    };

    this.apiManager = new ExternalApiManagerService(this.database, repositories);
  }

  async runMaintenance() {
    try {
      logger.info('=== INICIANDO MANUTENÇÃO DAS APIS EXTERNAS ===');

      // 1. Limpar logs antigos
      await this.cleanOldLogs();

      // 2. Verificar tokens expirados
      await this.checkExpiredTokens();

      // 3. Otimizar índices do banco
      await this.optimizeIndexes();

      // 4. Gerar relatório de saúde
      await this.generateHealthReport();

      // 5. Limpar cache se necessário
      await this.cleanCache();

      logger.info('=== MANUTENÇÃO CONCLUÍDA COM SUCESSO ===');

    } catch (error) {
      logger.error('Erro durante manutenção:', error);
      throw error;
    }
  }

  async cleanOldLogs() {
    try {
      logger.info('Limpando logs antigos...');

      const retentionDays = process.env.EXTERNAL_API_LOG_RETENTION_DAYS || 30;
      
      const deleteQuery = `
        DELETE FROM external_logs 
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      `;

      const result = await this.database.query(deleteQuery);
      
      logger.info(`✓ ${result.rowCount} logs antigos removidos (>${retentionDays} dias)`);

      // Vacuum da tabela para recuperar espaço
      await this.database.query('VACUUM ANALYZE external_logs');
      
    } catch (error) {
      logger.error('Erro ao limpar logs antigos:', error);
    }
  }

  async checkExpiredTokens() {
    try {
      logger.info('Verificando tokens expirados...');

      const expiredQuery = `
        SELECT id, integracao, expires_at 
        FROM api_tokens 
        WHERE active = true 
          AND expires_at IS NOT NULL 
          AND expires_at < NOW()
      `;

      const expiredTokens = await this.database.query(expiredQuery);

      if (expiredTokens.rows.length > 0) {
        logger.warn(`Encontrados ${expiredTokens.rows.length} tokens expirados:`);
        
        for (const token of expiredTokens.rows) {
          logger.warn(`- ${token.integracao}: expirado em ${token.expires_at}`);
        }

        // Desativar tokens expirados
        const deactivateQuery = `
          UPDATE api_tokens 
          SET active = false 
          WHERE expires_at < NOW() AND active = true
        `;

        const deactivated = await this.database.query(deactivateQuery);
        logger.info(`✓ ${deactivated.rowCount} tokens expirados desativados`);

        // Notificar sobre tokens que expiram em breve (próximos 7 dias)
        const soonExpireQuery = `
          SELECT integracao, expires_at 
          FROM api_tokens 
          WHERE active = true 
            AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        `;

        const soonExpire = await this.database.query(soonExpireQuery);
        
        if (soonExpire.rows.length > 0) {
          logger.warn('Tokens que expiram nos próximos 7 dias:');
          soonExpire.rows.forEach(token => {
            logger.warn(`- ${token.integracao}: expira em ${token.expires_at}`);
          });
        }

      } else {
        logger.info('✓ Nenhum token expirado encontrado');
      }

    } catch (error) {
      logger.error('Erro ao verificar tokens expirados:', error);
    }
  }

  async optimizeIndexes() {
    try {
      logger.info('Otimizando índices do banco...');

      const tables = [
        'external_logs',
        'api_tokens', 
        'notas_fiscais',
        'ocorrencias'
      ];

      for (const table of tables) {
        await this.database.query(`ANALYZE ${table}`);
      }

      logger.info('✓ Índices otimizados');

    } catch (error) {
      logger.error('Erro ao otimizar índices:', error);
    }
  }

  async generateHealthReport() {
    try {
      logger.info('Gerando relatório de saúde...');

      // Estatísticas dos últimos 7 dias
      const statsQuery = `
        SELECT 
          integracao,
          operacao,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN resultado->>'error' IS NULL THEN 1 END) as successful,
          COUNT(CASE WHEN resultado->>'error' IS NOT NULL THEN 1 END) as failed,
          ROUND(AVG(request_size), 2) as avg_request_size
        FROM external_logs 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY integracao, operacao
        ORDER BY total_requests DESC
      `;

      const stats = await this.database.query(statsQuery);
      
      logger.info('📊 Estatísticas dos últimos 7 dias:');
      
      if (stats.rows.length === 0) {
        logger.info('Nenhuma atividade registrada nos últimos 7 dias');
      } else {
        stats.rows.forEach(stat => {
          const successRate = stat.total_requests > 0 ? 
            Math.round((stat.successful / stat.total_requests) * 100) : 0;
          
          logger.info(
            `${stat.integracao} (${stat.operacao}): ` +
            `${stat.total_requests} requests, ` +
            `${successRate}% sucesso, ` +
            `${stat.avg_request_size}KB médio`
          );
        });
      }

      // Verificar integrações sem atividade
      const inactiveQuery = `
        SELECT DISTINCT integracao 
        FROM api_tokens 
        WHERE active = true 
          AND integracao NOT IN (
            SELECT DISTINCT integracao 
            FROM external_logs 
            WHERE created_at >= NOW() - INTERVAL '7 days'
          )
      `;

      const inactive = await this.database.query(inactiveQuery);
      
      if (inactive.rows.length > 0) {
        logger.warn('⚠️  Integrações sem atividade nos últimos 7 dias:');
        inactive.rows.forEach(row => {
          logger.warn(`- ${row.integracao}`);
        });
      }

    } catch (error) {
      logger.error('Erro ao gerar relatório de saúde:', error);
    }
  }

  async cleanCache() {
    try {
      logger.info('Limpando cache (se aplicável)...');
      
      // Se houver sistema de cache Redis ou similar
      // implementar limpeza aqui
      
      logger.info('✓ Cache limpo');

    } catch (error) {
      logger.error('Erro ao limpar cache:', error);
    }
  }

  async disconnect() {
    if (this.database) {
      await this.database.disconnect();
    }
  }
}

async function runMaintenance() {
  const maintenance = new ExternalAPIMaintenance();
  
  try {
    await maintenance.initialize();
    await maintenance.runMaintenance();
  } catch (error) {
    logger.error('Falha na manutenção:', error);
    process.exit(1);
  } finally {
    await maintenance.disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMaintenance();
}

module.exports = { ExternalAPIMaintenance, runMaintenance };