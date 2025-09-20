// ==========================================
// 1. EXTERNAL LOGS REPOSITORY
// ==========================================
// backend/src/repositories/external-logs.repository.js

const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class ExternalLogsRepository extends BaseRepository {
  constructor(database) {
    super(database, 'external_logs');
  }

  // Criar log de operação externa
  async create(logData) {
    const query = `
      INSERT INTO external_logs (
        integracao, transportadora_id, operacao, ip, user_agent, 
        resultado, request_size, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      logData.integracao,
      logData.transportadora_id,
      logData.operacao,
      logData.ip,
      logData.user_agent,
      JSON.stringify(logData.resultado),
      logData.request_size,
      logData.created_at
    ];

    const result = await this.database.query(query, values);
    return result.rows[0];
  }

  // Buscar logs por integração
  async findByIntegracao(integracao, options = {}) {
    const { page = 1, limit = 50, dataInicio, dataFim } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE integracao = $1';
    const values = [integracao];
    let paramCount = 1;

    if (dataInicio) {
      whereClause += ` AND created_at >= $${++paramCount}`;
      values.push(dataInicio);
    }

    if (dataFim) {
      whereClause += ` AND created_at <= $${++paramCount}`;
      values.push(dataFim);
    }

    const query = `
      SELECT 
        el.*,
        t.nome as transportadora_nome
      FROM external_logs el
      LEFT JOIN transportadoras t ON t.id = el.transportadora_id
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);

    const result = await this.database.query(query, values);
    return result.rows;
  }

  // Estatísticas de uso da API
  async getApiStats(integracao = null, dias = 7) {
    let whereClause = '';
    const values = [dias];

    if (integracao) {
      whereClause = 'AND integracao = $2';
      values.push(integracao);
    }

    const query = `
      SELECT 
        integracao,
        operacao,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN resultado->>'error' IS NULL THEN 1 END) as successful_requests,
        COUNT(CASE WHEN resultado->>'error' IS NOT NULL THEN 1 END) as failed_requests,
        AVG(request_size) as avg_request_size,
        COUNT(DISTINCT ip) as unique_ips
      FROM external_logs
      WHERE created_at >= NOW() - INTERVAL '$1 days'
        ${whereClause}
      GROUP BY integracao, operacao
      ORDER BY total_requests DESC
    `;

    const result = await this.database.query(query, values);
    return result.rows;
  }

  // Logs de erro recentes
  async getRecentErrors(limit = 20) {
    const query = `
      SELECT 
        el.*,
        t.nome as transportadora_nome
      FROM external_logs el
      LEFT JOIN transportadoras t ON t.id = el.transportadora_id
      WHERE resultado->>'error' IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.database.query(query, [limit]);
    return result.rows;
  }
}

module.exports = ExternalLogsRepository;
