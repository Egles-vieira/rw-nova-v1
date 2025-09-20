// ==========================================
// 2. MONITORING REPOSITORY
// ==========================================
// backend/src/repositories/monitoring.repository.js

const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class MonitoringRepository extends BaseRepository {
  constructor(database) {
    super(database, 'log_integracaos');
  }

  // Dashboard principal
  async getDashboardData(options = {}) {
    const { periodo = 7 } = options;

    // Métricas gerais
    const metricsQuery = `
      SELECT 
        COUNT(DISTINCT ji.id) as total_integracoes,
        SUM(ji.qtd) as total_nfs_processadas,
        COUNT(DISTINCT CASE WHEN ji.fim IS NOT NULL THEN ji.id END) as integracoes_concluidas,
        AVG(CASE WHEN ji.fim IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ji.fim - ji.inicio)) END) as tempo_medio_segundos
      FROM job_integracoes ji
      WHERE ji.inicio >= NOW() - INTERVAL '${periodo} days'
    `;

    // Estatísticas por transportadora
    const transportadorasQuery = `
      SELECT 
        t.id,
        t.nome,
        t.integracao_ocorrencia,
        COUNT(nf.id) as total_nfs,
        COUNT(CASE WHEN nf.finalizada = true THEN 1 END) as nfs_finalizadas,
        COUNT(CASE WHEN nf.finalizada = false THEN 1 END) as nfs_pendentes
      FROM transportadoras t
      LEFT JOIN notas_fiscais nf ON nf.transportadora_id = t.id 
        AND nf.created_at >= NOW() - INTERVAL '${periodo} days'
      WHERE t.ativo = true
      GROUP BY t.id, t.nome, t.integracao_ocorrencia
      ORDER BY total_nfs DESC
      LIMIT 10
    `;

    // Evolução diária
    const evolucaoQuery = `
      SELECT 
        DATE(ji.inicio) as data,
        COUNT(*) as integracoes,
        SUM(ji.qtd) as nfs_processadas,
        AVG(CASE WHEN ji.fim IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ji.fim - ji.inicio)) END) as tempo_medio
      FROM job_integracoes ji
      WHERE ji.inicio >= NOW() - INTERVAL '${periodo} days'
      GROUP BY DATE(ji.inicio)
      ORDER BY data ASC
    `;

    // Erros recentes
    const errosQuery = `
      SELECT 
        li.integracao,
        li.nro,
        li.texto,
        li.created_at
      FROM log_integracaos li
      WHERE li.texto LIKE '%Erro%' 
        AND li.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY li.created_at DESC
      LIMIT 10
    `;

    const [metricsResult, transportadorasResult, evolucaoResult, errosResult] = await Promise.all([
      this.database.query(metricsQuery),
      this.database.query(transportadorasQuery),
      this.database.query(evolucaoQuery),
      this.database.query(errosQuery)
    ]);

    return {
      metricas: metricsResult.rows[0],
      transportadoras: transportadorasResult.rows,
      evolucao: evolucaoResult.rows,
      erros_recentes: errosResult.rows
    };
  }

  // Métricas por transportadora
  async getTransportadoraMetrics(options = {}) {
    const { transportadoraId, periodo = 30 } = options;

    const query = `
      SELECT 
        DATE(nf.created_at) as data,
        COUNT(*) as total_nfs,
        COUNT(CASE WHEN nf.finalizada = true THEN 1 END) as nfs_finalizadas,
        COUNT(CASE WHEN nf.finalizada = false THEN 1 END) as nfs_pendentes,
        COUNT(o.id) as total_ocorrencias
      FROM notas_fiscais nf
      LEFT JOIN ocorrencias o ON o.nro_nf = nf.nro_ctrc
      WHERE nf.transportadora_id = $1 
        AND nf.created_at >= NOW() - INTERVAL '${periodo} days'
      GROUP BY DATE(nf.created_at)
      ORDER BY data ASC
    `;

    const detailsQuery = `
      SELECT 
        COUNT(*) as total_nfs,
        COUNT(CASE WHEN finalizada = true THEN 1 END) as finalizadas,
        COUNT(CASE WHEN finalizada = false THEN 1 END) as pendentes,
        AVG(CASE WHEN finalizada = true AND data_integracao IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (data_integracao - created_at)) / 3600 END) as tempo_medio_horas
      FROM notas_fiscais 
      WHERE transportadora_id = $1 
        AND created_at >= NOW() - INTERVAL '${periodo} days'
    `;

    const [metricsResult, detailsResult] = await Promise.all([
      this.database.query(query, [transportadoraId]),
      this.database.query(detailsQuery, [transportadoraId])
    ]);

    return {
      evolucao: metricsResult.rows,
      resumo: detailsResult.rows[0]
    };
  }

  // Estatísticas de performance
  async getPerformanceStats(options = {}) {
    const { periodo = 7, agrupamento = 'dia' } = options;
    
    let dateFormat = 'DATE(created_at)';
    let intervalGroup = 'day';
    
    if (agrupamento === 'hora') {
      dateFormat = 'DATE_TRUNC(\'hour\', created_at)';
      intervalGroup = 'hour';
    } else if (agrupamento === 'mes') {
      dateFormat = 'DATE_TRUNC(\'month\', created_at)';
      intervalGroup = 'month';
    }

    const query = `
      SELECT 
        ${dateFormat} as periodo,
        COUNT(*) as total_logs,
        COUNT(CASE WHEN texto LIKE '%Erro%' THEN 1 END) as erros,
        COUNT(CASE WHEN texto LIKE '%sucesso%' THEN 1 END) as sucessos,
        COUNT(DISTINCT integracao) as integracoes_ativas
      FROM log_integracaos 
      WHERE created_at >= NOW() - INTERVAL '${periodo} ${intervalGroup}s'
      GROUP BY ${dateFormat}
      ORDER BY periodo ASC
    `;

    const result = await this.database.query(query);
    
    return result.rows.map(row => ({
      ...row,
      taxa_sucesso: row.total_logs > 0 ? 
        (parseFloat(row.sucessos) / parseFloat(row.total_logs) * 100).toFixed(2) : 0
    }));
  }

  // Relatório de saúde das integrações
  async getIntegrationsHealth() {
    const query = `
      SELECT 
        t.nome,
        t.integracao_ocorrencia,
        COUNT(nf.id) as total_nfs_periodo,
        COUNT(CASE WHEN nf.finalizada = false THEN 1 END) as nfs_pendentes,
        COUNT(CASE WHEN li.texto LIKE '%Erro%' THEN 1 END) as erros_recentes,
        MAX(li.created_at) as ultimo_log,
        CASE 
          WHEN COUNT(CASE WHEN li.texto LIKE '%Erro%' THEN 1 END) > 10 THEN 'CRITICO'
          WHEN COUNT(CASE WHEN li.texto LIKE '%Erro%' THEN 1 END) > 5 THEN 'ALERTA'
          WHEN MAX(li.created_at) < NOW() - INTERVAL '2 hours' THEN 'INATIVO'
          ELSE 'SAUDAVEL'
        END as status_saude
      FROM transportadoras t
      LEFT JOIN notas_fiscais nf ON nf.transportadora_id = t.id 
        AND nf.created_at >= NOW() - INTERVAL '24 hours'
      LEFT JOIN log_integracaos li ON li.integracao = t.integracao_ocorrencia 
        AND li.created_at >= NOW() - INTERVAL '24 hours'
      WHERE t.ativo = true 
        AND t.integracao_ocorrencia IS NOT NULL 
        AND t.integracao_ocorrencia != 'manual'
      GROUP BY t.id, t.nome, t.integracao_ocorrencia
      ORDER BY 
        CASE status_saude 
          WHEN 'CRITICO' THEN 1 
          WHEN 'ALERTA' THEN 2 
          WHEN 'INATIVO' THEN 3 
          ELSE 4 
        END,
        t.nome
    `;

    const result = await this.database.query(query);
    return result.rows;
  }

  // Logs com filtros avançados
  async getLogsWithFilters(filters = {}) {
    const { 
      page = 1, 
      limit = 50, 
      integracao, 
      nivel, 
      dataInicio, 
      dataFim, 
      nro, 
      busca 
    } = filters;
    
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (integracao) {
      conditions.push(`integracao = $${++paramCount}`);
      values.push(integracao);
    }

    if (nivel) {
      if (nivel === 'erro') {
        conditions.push(`texto LIKE '%Erro%'`);
      } else if (nivel === 'sucesso') {
        conditions.push(`texto LIKE '%sucesso%'`);
      }
    }

    if (dataInicio) {
      conditions.push(`created_at >= $${++paramCount}`);
      values.push(dataInicio);
    }

    if (dataFim) {
      conditions.push(`created_at <= $${++paramCount}`);
      values.push(dataFim);
    }

    if (nro) {
      conditions.push(`nro = $${++paramCount}`);
      values.push(nro);
    }

    if (busca) {
      conditions.push(`texto ILIKE $${++paramCount}`);
      values.push(`%${busca}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM log_integracaos 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM log_integracaos 
      ${whereClause}
    `;

    values.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.database.query(query, values),
      this.database.query(countQuery, values.slice(0, -2))
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  // Alertas ativos (baseado em regras)
  async getActiveAlerts() {
    const alerts = [];

    // Alerta: Muitos erros nas últimas 2 horas
    const errosQuery = `
      SELECT 
        integracao,
        COUNT(*) as total_erros
      FROM log_integracaos 
      WHERE texto LIKE '%Erro%' 
        AND created_at >= NOW() - INTERVAL '2 hours'
      GROUP BY integracao
      HAVING COUNT(*) >= 5
    `;

    const errosResult = await this.database.query(errosQuery);
    
    for (const erro of errosResult.rows) {
      alerts.push({
        tipo: 'ERROR_RATE',
        severidade: 'ALTO',
        titulo: `Taxa alta de erros - ${erro.integracao}`,
        descricao: `${erro.total_erros} erros nas últimas 2 horas`,
        integracao: erro.integracao,
        created_at: new Date()
      });
    }

    // Alerta: Integrações inativas
    const inativasQuery = `
      SELECT DISTINCT 
        t.nome,
        t.integracao_ocorrencia
      FROM transportadoras t
      WHERE t.ativo = true 
        AND t.integracao_ocorrencia IS NOT NULL 
        AND t.integracao_ocorrencia != 'manual'
        AND NOT EXISTS (
          SELECT 1 FROM log_integracaos li 
          WHERE li.integracao = t.integracao_ocorrencia 
            AND li.created_at >= NOW() - INTERVAL '4 hours'
        )
    `;

    const inativasResult = await this.database.query(inativasQuery);
    
    for (const inativa of inativasResult.rows) {
      alerts.push({
        tipo: 'INTEGRATION_INACTIVE',
        severidade: 'MEDIO',
        titulo: `Integração inativa - ${inativa.nome}`,
        descricao: 'Nenhuma atividade nas últimas 4 horas',
        integracao: inativa.integracao_ocorrencia,
        created_at: new Date()
      });
    }

    return alerts;
  }

  // Resumo de NFs por status
  async getNFStatusSummary(options = {}) {
    const { transportadoraId, periodo = 30 } = options;
    
    let whereClause = '';
    const values = [periodo];
    
    if (transportadoraId) {
      whereClause = 'AND nf.transportadora_id = $2';
      values.push(transportadoraId);
    }

    const query = `
      SELECT 
        nf.status_api,
        COUNT(*) as quantidade,
        COUNT(CASE WHEN nf.finalizada = true THEN 1 END) as finalizadas,
        COUNT(CASE WHEN nf.finalizada = false THEN 1 END) as pendentes
      FROM notas_fiscais nf
      WHERE nf.created_at >= NOW() - INTERVAL '$1 days'
        ${whereClause}
      GROUP BY nf.status_api
      ORDER BY quantidade DESC
    `;

    const result = await this.database.query(query, values);
    return result.rows;
  }

  // Gerar relatório
  async generateReport(options = {}) {
    const { tipo, periodo = 30, transportadoraId } = options;

    if (tipo === 'performance') {
      return this.getPerformanceStats({ periodo, agrupamento: 'dia' });
    }

    if (tipo === 'transportadoras') {
      const query = `
        SELECT 
          t.nome,
          t.integracao_ocorrencia,
          COUNT(nf.id) as total_nfs,
          COUNT(CASE WHEN nf.finalizada = true THEN 1 END) as finalizadas,
          COUNT(CASE WHEN nf.finalizada = false THEN 1 END) as pendentes,
          AVG(CASE WHEN nf.finalizada = true AND nf.data_integracao IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (nf.data_integracao - nf.created_at)) / 3600 END) as tempo_medio_horas
        FROM transportadoras t
        LEFT JOIN notas_fiscais nf ON nf.transportadora_id = t.id 
          AND nf.created_at >= NOW() - INTERVAL '${periodo} days'
        WHERE t.ativo = true
        GROUP BY t.id, t.nome, t.integracao_ocorrencia
        ORDER BY total_nfs DESC
      `;

      const result = await this.database.query(query);
      return result.rows;
    }

    throw new Error(`Tipo de relatório não suportado: ${tipo}`);
  }

  // Configurações de monitoramento
  async getMonitoringConfig() {
    const query = `
      SELECT * FROM settings 
      WHERE slug = 'monitoring_config'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.database.query(query);
    
    if (result.rows.length === 0) {
      return {
        alertas: {
          erro_threshold: 5,
          inatividade_hours: 4
        },
        dashboard: {
          periodo_padrao: 7,
          refresh_interval: 30
        }
      };
    }

    return result.rows[0].settings;
  }

  // Atualizar configurações
  async updateMonitoringConfig(config) {
    const query = `
      INSERT INTO settings (slug, env, settings, created_at)
      VALUES ('monitoring_config', 'production', $1, NOW())
      ON CONFLICT (slug, env) 
      DO UPDATE SET 
        settings = $1,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.database.query(query, [JSON.stringify(config)]);
    return result.rows[0];
  }
}

module.exports = MonitoringRepository;