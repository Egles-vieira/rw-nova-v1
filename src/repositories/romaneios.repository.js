const BaseRepository = require('./base.repository');
const db = require('../config/database');

class RomaneiosRepository extends BaseRepository {
  constructor() {
    super('romaneios');
  }

  // Buscar todos com relacionamentos - CORRIGIDO
  async findAllWithRelations(options = {}) {
    const {
      page = 1,
      limit = this.defaultLimit,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      where = {}
    } = options;

    const validLimit = Math.min(limit, this.maxLimit);
    const offset = (page - 1) * validLimit;

    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    // Filtros (mantidos iguais)
    if (where.numero) {
      paramCount++;
      whereClause += ` AND r.numero = $${paramCount}`;
      params.push(where.numero);
    }

    if (where.motorista_id) {
      paramCount++;
      whereClause += ` AND r.motorista_id = $${paramCount}`;
      params.push(where.motorista_id);
    }

    if (where.placa_cavalo) {
      paramCount++;
      whereClause += ` AND r.placa_cavalo ILIKE $${paramCount}`;
      params.push(`%${where.placa_cavalo}%`);
    }

    if (where.roteirizacao) {
      paramCount++;
      whereClause += ` AND r.roteirizacao = $${paramCount}`;
      params.push(where.roteirizacao);
    }

    if (where.roteirizar !== undefined) {
      paramCount++;
      whereClause += ` AND r.roteirizar = $${paramCount}`;
      params.push(where.roteirizar);
    }

    if (where.unidade) {
      paramCount++;
      whereClause += ` AND r.unidade ILIKE $${paramCount}`;
      params.push(`%${where.unidade}%`);
    }

    if (where.doca) {
      paramCount++;
      whereClause += ` AND r.doca ILIKE $${paramCount}`;
      params.push(`%${where.doca}%`);
    }

    // Data de emissão
    if (where.data_inicio && where.data_fim) {
      paramCount++;
      whereClause += ` AND r.emissao BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(where.data_inicio, where.data_fim);
      paramCount++;
    } else if (where.data_inicio) {
      paramCount++;
      whereClause += ` AND r.emissao >= $${paramCount}`;
      params.push(where.data_inicio);
    } else if (where.data_fim) {
      paramCount++;
      whereClause += ` AND r.emissao <= $${paramCount}`;
      params.push(where.data_fim);
    }

    // QUERY CORRIGIDA - usando as colunas corretas da tabela notas_fiscais
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        m.cpf as motorista_cpf,
        m.contato as motorista_contato,
        COUNT(nf.id) as total_notas_fiscais,
        SUM(nf.peso_calculo) as peso_total_notas,  -- CORRIGIDO: nf.peso → nf.peso_calculo
        SUM(nf.qtd_volumes) as volume_total_notas   -- CORRIGIDO: nf.volume → nf.qtd_volumes
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE ${whereClause}
      GROUP BY r.id, m.nome, m.cpf, m.contato
      ORDER BY r.${orderBy} ${orderDirection.toUpperCase()}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(validLimit, offset);

    const countQuery = `
      SELECT COUNT(DISTINCT r.id) as total
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      WHERE ${whereClause}
    `;

    const [data, countResult] = await Promise.all([
      this.executeQuery(query, params),
      this.executeQuery(countQuery, params.slice(0, paramCount))
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      data: data.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit),
        hasNext: page < Math.ceil(total / validLimit),
        hasPrev: page > 1
      }
    };
  }

// Buscar por motorista - CORRIGIDO
async findByMotorista(motorista_id) {
  const query = `
    SELECT 
      r.*,
      m.nome as motorista_nome,
      m.cpf as motorista_cpf,
      m.contato as motorista_contato,
      COUNT(nf.id) as total_notas_fiscais,
      COALESCE(SUM(nf.peso_calculo), 0) as peso_total_notas,
      COALESCE(SUM(nf.qtd_volumes), 0) as volume_total_notas
    FROM ${this.tableName} r
    LEFT JOIN motoristas m ON r.motorista_id = m.id
    LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
    WHERE r.motorista_id = $1
    GROUP BY r.id, m.nome, m.cpf, m.contato
    ORDER BY r.created_at DESC
  `;

  const result = await this.executeQuery(query, [motorista_id]);
  return result.rows;
}



  // Buscar por ID com relacionamentos - CORRIGIDO
  async findWithRelations(id) {
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        m.cpf as motorista_cpf,
        m.contato as motorista_contato,
        m.email as motorista_email,
        COUNT(nf.id) as total_notas_fiscais,
        SUM(nf.peso_calculo) as peso_total_notas,  -- CORRIGIDO
        SUM(nf.qtd_volumes) as volume_total_notas,  -- CORRIGIDO
        SUM(nf.valor) as valor_total_notas
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE r.id = $1
      GROUP BY r.id, m.nome, m.cpf, m.contato, m.email
    `;

    const result = await this.executeQuery(query, [id]);
    return result.rows[0] || null;
  }

  // Buscar por período - CORRIGIDO
  async findByPeriodo(dataInicio, dataFim) {
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        COUNT(nf.id) as total_notas_fiscais,
        SUM(nf.peso_calculo) as peso_total,  -- CORRIGIDO
        SUM(nf.qtd_volumes) as volume_total   -- CORRIGIDO
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE r.emissao BETWEEN $1 AND $2
      GROUP BY r.id, m.nome
      ORDER BY r.emissao DESC
    `;

    const result = await this.executeQuery(query, [dataInicio, dataFim]);
    return result.rows;
  }

  // Buscar romaneios pendentes de roteirização - CORRIGIDO
  async findPendentesRoteirizacao() {
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        COUNT(nf.id) as total_notas_fiscais,
        SUM(nf.peso_calculo) as peso_total,  -- CORRIGIDO
        SUM(nf.qtd_volumes) as volume_total   -- CORRIGIDO
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE r.roteirizar = true
      GROUP BY r.id, m.nome
      ORDER BY r.emissao ASC
    `;

    const result = await this.executeQuery(query);
    return result.rows;
  }

  // Buscar romaneios por unidade - CORRIGIDO
  async findByUnidade(unidade) {
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        COUNT(nf.id) as total_notas_fiscais,
        SUM(nf.peso_calculo) as peso_total,  -- CORRIGIDO
        SUM(nf.qtd_volumes) as volume_total   -- CORRIGIDO
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE r.unidade = $1
      GROUP BY r.id, m.nome
      ORDER BY r.created_at DESC
    `;

    const result = await this.executeQuery(query, [unidade]);
    return result.rows;
  }





  // Buscar romaneios por doca - CORRIGIDO
  async findByDoca(doca) {
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        COUNT(nf.id) as total_notas_fiscais,
        SUM(nf.peso_calculo) as peso_total,  -- CORRIGIDO
        SUM(nf.qtd_volumes) as volume_total   -- CORRIGIDO
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE r.doca = $1
      GROUP BY r.id, m.nome
      ORDER BY r.created_at DESC
    `;

    const result = await this.executeQuery(query, [doca]);
    return result.rows;
  }

  // Buscar romaneios por período
  async findByPeriodo(dataInicio, dataFim) {
    const query = `
      SELECT 
        r.*,
        m.nome as motorista_nome,
        COUNT(nf.id) as total_notas_fiscais,
    SUM(nf.peso_calculo) as peso_total,
SUM(nf.qtd_volumes) as volume_total
      FROM ${this.tableName} r
      LEFT JOIN motoristas m ON r.motorista_id = m.id
      LEFT JOIN notas_fiscais nf ON r.id = nf.romaneio_id
      WHERE r.emissao BETWEEN $1 AND $2
      GROUP BY r.id, m.nome
      ORDER BY r.emissao DESC
    `;

    const result = await this.executeQuery(query, [dataInicio, dataFim]);
    return result.rows;
  }
}

module.exports = RomaneiosRepository;