// ==========================================
// 1. JOBS REPOSITORY
// ==========================================
// backend/src/repositories/jobs.repository.js

const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class JobsRepository extends BaseRepository {
  constructor(database) {
    super(database, 'job_integracoes');
  }

  // Criar nova integração
  async createIntegracao(data) {
    const query = `
      INSERT INTO job_integracoes (integracao, qtd, inicio)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    
    const values = [data.integracao, data.qtd, data.inicio];
    const result = await this.database.query(query, values);
    
    logger.info('Nova integração criada:', { id: result.rows[0].id, ...data });
    return result.rows[0].id;
  }

  // Atualizar integração
  async updateIntegracao(id, data) {
    const query = `
      UPDATE job_integracoes 
      SET qtd = $2, fim = $3
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, data.qtd, data.fim];
    const result = await this.database.query(query, values);
    
    return result.rows[0];
  }

  // Criar log de integração
  async createLog(data) {
    const query = `
      INSERT INTO log_integracaos (integracao, nro, texto, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    
    const values = [data.integracao, data.nro, data.texto];
    const result = await this.database.query(query, values);
    
    return result.rows[0].id;
  }

  // Buscar integrações recentes
  async getRecentIntegrations(options = {}) {
    const { page = 1, limit = 20, dias = 7 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        ji.*,
        COUNT(li.id) as total_logs,
        COUNT(CASE WHEN li.texto LIKE '%Erro%' THEN 1 END) as total_erros
      FROM job_integracoes ji
      LEFT JOIN log_integracaos li ON li.integracao = ji.integracao 
        AND li.created_at >= ji.inicio 
        AND (ji.fim IS NULL OR li.created_at <= ji.fim)
      WHERE ji.inicio >= NOW() - INTERVAL '${dias} days'
      GROUP BY ji.id
      ORDER BY ji.inicio DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM job_integracoes 
      WHERE inicio >= NOW() - INTERVAL '${dias} days'
    `;

    const [dataResult, countResult] = await Promise.all([
      this.database.query(query, [limit, offset]),
      this.database.query(countQuery)
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  // Buscar logs de uma integração
  async getIntegrationLogs(options = {}) {
    const { integracaoId, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    // Primeiro buscar a integração
    const integracaoQuery = `
      SELECT * FROM job_integracoes WHERE id = $1
    `;
    const integracaoResult = await this.database.query(integracaoQuery, [integracaoId]);
    
    if (integracaoResult.rows.length === 0) {
      throw new Error('Integração não encontrada');
    }

    const integracao = integracaoResult.rows[0];

    // Buscar logs
    const logsQuery = `
      SELECT * FROM log_integracaos 
      WHERE integracao = $1 
        AND created_at >= $2 
        AND ($3::timestamp IS NULL OR created_at <= $3)
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM log_integracaos 
      WHERE integracao = $1 
        AND created_at >= $2 
        AND ($3::timestamp IS NULL OR created_at <= $3)
    `;

    const values = [integracao.integracao, integracao.inicio, integracao.fim, limit, offset];
    const countValues = [integracao.integracao, integracao.inicio, integracao.fim];

    const [logsResult, countResult] = await Promise.all([
      this.database.query(logsQuery, values),
      this.database.query(countQuery, countValues)
    ]);

    return {
      integracao,
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  // Estatísticas dos jobs
  async getJobStats() {
    const query = `
      SELECT 
        COUNT(*) as total_integracoes,
        COUNT(CASE WHEN fim IS NOT NULL THEN 1 END) as concluidas,
        COUNT(CASE WHEN fim IS NULL THEN 1 END) as em_andamento,
        AVG(CASE WHEN fim IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (fim - inicio)) END) as tempo_medio_segundos,
        SUM(qtd) as total_nfs_processadas
      FROM job_integracoes 
      WHERE inicio >= NOW() - INTERVAL '24 hours'
    `;

    const result = await this.database.query(query);
    const stats = result.rows[0];

    // Estatísticas de logs
    const logsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN texto LIKE '%Erro%' THEN 1 END) as total_erros,
        COUNT(CASE WHEN texto LIKE '%sucesso%' THEN 1 END) as total_sucessos
      FROM log_integracaos 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const logsResult = await this.database.query(logsQuery);
    const logsStats = logsResult.rows[0];

    return {
      ...stats,
      ...logsStats,
      taxa_sucesso: logsStats.total_logs > 0 ? 
        (parseFloat(logsStats.total_sucessos) / parseFloat(logsStats.total_logs) * 100).toFixed(2) : 0
    };
  }

  // Buscar transportadora por ID
  async getTransportadoraById(id) {
    const query = `
      SELECT * FROM transportadoras 
      WHERE id = $1 AND ativo = true
    `;
    
    const result = await this.database.query(query, [id]);
    return result.rows[0];
  }

  // Gerenciar tokens de API
  async createApiToken(data) {
    const query = `
      INSERT INTO api_tokens (integracao, token, expires_at, active, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const values = [data.integracao, data.token, data.expires_at, data.active];
    const result = await this.database.query(query, values);
    
    return result.rows[0];
  }

  async deactivateApiTokens(integracao) {
    const query = `
      UPDATE api_tokens 
      SET active = false 
      WHERE integracao = $1
    `;
    
    await this.database.query(query, [integracao]);
  }

  async getApiTokens() {
    const query = `
      SELECT * FROM api_tokens 
      ORDER BY created_at DESC
    `;
    
    const result = await this.database.query(query);
    return result.rows;
  }

  async getActiveToken(integracao) {
    const query = `
      SELECT * FROM api_tokens 
      WHERE integracao = $1 
        AND active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await this.database.query(query, [integracao]);
    return result.rows[0];
  }
}

module.exports = JobsRepository;

