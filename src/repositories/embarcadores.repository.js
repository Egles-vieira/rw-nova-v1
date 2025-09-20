// src/repositories/embarcadores.repository.js
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class EmbarcadoresRepository extends BaseRepository {
  constructor() {
    super('embarcadores');
    // tolerância caso BaseRepository não defina defaults
    this.defaultLimit = this.defaultLimit || 20;
    this.maxLimit = this.maxLimit || 100;
  }

  /** -----------------------------
   * Helpers internos (soft delete / metadata)
   * ------------------------------ */

  // Verifica se uma tabela possui uma coluna
  async _tableHasColumn(tableName, columnName) {
    const sql = `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `;
    const r = await this.executeQuery(sql, [String(tableName), String(columnName)]);
    return r.rowCount > 0;
  }

  // Cláusula WHERE para ignorar registros deletados por alias (ou neutro se não houver deleted_at)
  async _whereNotDeleted(alias = 'e') {
    const hasDeletedAt = await this._tableHasColumn(this.tableName, 'deleted_at');
    return hasDeletedAt ? `${alias}.deleted_at IS NULL` : '1=1';
  }

  // Atalho para "AND not deleted"
  async _andNotDeleted(alias = 'e') {
    return `AND ${(await this._whereNotDeleted(alias))}`;
  }

  // Retorna condição opcional de not-deleted para outra tabela (ex.: notas_fiscais)
  async _andOtherTableNotDeleted(otherTableAlias, otherTableName) {
    const hasDeletedAt = await this._tableHasColumn(otherTableName, 'deleted_at');
    return hasDeletedAt ? `AND ${otherTableAlias}.deleted_at IS NULL` : '';
  }

  /** -----------------------------
   * Métodos de negócio
   * ------------------------------ */

  // Buscar por documento (CNPJ)
async findByDocumento(documento) {
  try {
    const sql = `SELECT * FROM embarcadores WHERE documento = $1 LIMIT 1`;
    const result = await this.database.query(sql, [documento]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar embarcador por documento:', error);
    throw error;
  }
}

  // Buscar embarcador + estatísticas de notas fiscais
  async findWithNotasStats(id) {
    try {
      const andNotDeletedE = await this._andNotDeleted('e');
      const andNotDeletedNF = await this._andOtherTableNotDeleted('nf', 'notas_fiscais');

      const query = `
        SELECT 
          e.*,
          COUNT(nf.id) AS total_notas,
          COUNT(CASE WHEN nf.finalizada = true THEN 1 END) AS notas_finalizadas,
          COUNT(CASE WHEN nf.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS notas_mes,
          COALESCE(SUM(nf.valor), 0) AS valor_total,
          COALESCE(SUM(nf.peso_calculo), 0) AS peso_total
        FROM ${this.tableName} e
        LEFT JOIN notas_fiscais nf
          ON nf.embarcador_id = e.id
          ${andNotDeletedNF}
        WHERE e.id = $1 ${andNotDeletedE}
        GROUP BY e.id
      `;
      const result = await this.executeQuery(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar embarcador com estatísticas:', error);
      throw error;
    }
  }

  // Buscar por cidade
  async findByCidade(cidade) {
    try {
      const andNotDeleted = await this._andNotDeleted('e');
      const query = `
        SELECT e.*
        FROM ${this.tableName} e
        WHERE e.cidade ILIKE $1 ${andNotDeleted}
        ORDER BY e.nome
      `;
      const result = await this.executeQuery(query, [`%${cidade}%`]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar embarcadores por cidade:', error);
      throw error;
    }
  }

  // Buscar por UF
  async findByUf(uf) {
    try {
      const andNotDeleted = await this._andNotDeleted('e');
      const query = `
        SELECT e.*
        FROM ${this.tableName} e
        WHERE e.uf = $1 ${andNotDeleted}
        ORDER BY e.nome
      `;
      const result = await this.executeQuery(query, [uf]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar embarcadores por UF:', error);
      throw error;
    }
  }

  // Buscar com depósitos associados
  // OBS: mantém o nome de tabela "deposito" conforme seu código original.
  async findWithDepositos(id) {
    try {
      const andNotDeleted = await this._andNotDeleted('e');
      const query = `
        SELECT 
          e.*,
          json_agg(
            json_build_object(
              'id', d.id,
              'nome', d.nome,
              'latitude', d.latitude,
              'longitude', d.longitude,
              'endereco_completo', d.endereco_completo,
              'restricao_logistica_id', d.restricao_logistica_id
            ) ORDER BY d.id
          ) FILTER (WHERE d.id IS NOT NULL) AS depositos
        FROM ${this.tableName} e
        LEFT JOIN deposito d ON d.embarcador_id = e.id
        WHERE e.id = $1 ${andNotDeleted}
        GROUP BY e.id
      `;
      const result = await this.executeQuery(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar embarcador com depósitos:', error);
      throw error;
    }
  }

  // Listagem com estatísticas + filtros + paginação
  async findAllWithStats(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'e.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(Number(limit) || this.defaultLimit, this.maxLimit);
      const offset = (Number(page) - 1) * validLimit;

      // Whitelist de colunas para ORDER BY (usar sempre com alias e.)
      const orderable = new Set([
        'e.id', 'e.nome', 'e.documento', 'e.cidade', 'e.uf', 'e.created_at', 'e.updated_at'
      ]);

      // Permitir que venha "created_at" do validador e normalizar para "e.created_at"
      const normalizeOrderBy = (col) => {
        if (!col) return 'e.created_at';
        const hasAlias = col.includes('.');
        const withAlias = hasAlias ? col : `e.${col}`;
        return orderable.has(withAlias) ? withAlias : 'e.created_at';
      };

      const _orderBy = normalizeOrderBy(orderBy);
      const _orderDir = String(orderDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const whereNotDeletedE = await this._whereNotDeleted('e');
      const andNotDeletedNF = await this._andOtherTableNotDeleted('nf', 'notas_fiscais');

      const whereClauses = [whereNotDeletedE];
      const params = [];
      let i = 0;

      if (filters.nome) {
        params.push(`%${filters.nome}%`); i++;
        whereClauses.push(`e.nome ILIKE $${i}`);
      }
      if (filters.documento) {
        params.push(filters.documento); i++;
        whereClauses.push(`e.documento = $${i}`);
      }
      if (filters.cidade) {
        params.push(`%${filters.cidade}%`); i++;
        whereClauses.push(`e.cidade ILIKE $${i}`);
      }
      if (filters.uf) {
        params.push(filters.uf); i++;
        whereClauses.push(`e.uf = $${i}`);
      }

      const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT
          e.*,
          COUNT(DISTINCT nf.id) AS total_notas,
          COUNT(DISTINCT CASE WHEN nf.finalizada = true THEN nf.id END) AS notas_finalizadas,
          COUNT(DISTINCT d.id) AS total_depositos,
          COALESCE(SUM(nf.valor), 0) AS valor_total
        FROM ${this.tableName} e
        LEFT JOIN notas_fiscais nf
          ON nf.embarcador_id = e.id
          ${andNotDeletedNF}
        LEFT JOIN deposito d
          ON d.embarcador_id = e.id
        ${whereSQL}
        GROUP BY e.id
        ORDER BY ${_orderBy} ${_orderDir}
        LIMIT $${i + 1}
        OFFSET $${i + 2}
      `;
      const queryParams = [...params, validLimit, offset];

      const countQuery = `
        SELECT COUNT(DISTINCT e.id) AS total
        FROM ${this.tableName} e
        ${whereSQL}
      `;
      const countResult = await this.executeQuery(countQuery, params);
      const total = parseInt(countResult.rows?.[0]?.total || 0, 10);

      const result = await this.executeQuery(query, queryParams);

      return {
        data: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: validLimit,
          total,
          totalPages: Math.ceil(total / validLimit),
          hasNext: page * validLimit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Erro ao buscar embarcadores com estatísticas:', error);
      throw error;
    }
  }

  // Autocomplete por nome
  async searchByName(searchTerm, limit = 10) {
    try {
      const andNotDeleted = await this._andNotDeleted('e');
      const query = `
        SELECT e.id, e.nome, e.documento, e.cidade, e.uf
        FROM ${this.tableName} e
        WHERE e.nome ILIKE $1 ${andNotDeleted}
        ORDER BY e.nome
        LIMIT $2
      `;
      const result = await this.executeQuery(query, [`%${searchTerm}%`, Number(limit)]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar embarcadores por nome:', error);
      throw error;
    }
  }

  // Valida unicidade de documento (CNPJ)
  async validateUniqueDocumento(documento, excludeId = null) {
    try {
      const andNotDeleted = await this._andNotDeleted('e');
      const params = [documento];
      let i = 1;

      let where = `WHERE e.documento = $${i} ${andNotDeleted}`;
      if (excludeId) {
        i += 1;
        params.push(excludeId);
        where += ` AND e.id <> $${i}`;
      }

      const query = `
        SELECT e.id
        FROM ${this.tableName} e
        ${where}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rowCount === 0;
    } catch (error) {
      logger.error('Erro ao validar documento único:', error);
      throw error;
    }
  }

  // Estatísticas gerais
  async getStats() {
    try {
      const whereNotDeleted = await this._whereNotDeleted('e');
      const query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(DISTINCT e.cidade) AS total_cidades,
          COUNT(DISTINCT e.uf) AS total_ufs,
          COUNT(CASE WHEN e.inscricao_estadual IS NOT NULL AND e.inscricao_estadual <> '' THEN 1 END) AS com_inscricao_estadual
        FROM ${this.tableName} e
        WHERE ${whereNotDeleted}
      `;
      const result = await this.executeQuery(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas de embarcadores:', error);
      throw error;
    }
  }
}

module.exports = EmbarcadoresRepository;
