// backend/src/repositories/transportadoras.repository.js
const db = require('../database/connection');
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class TransportadorasRepository extends BaseRepository {
  constructor(database = db) {
    super(database, 'transportadoras');
  }

  // Helper para aplicar soft-delete condicionalmente (para a tabela principal desta instância)
  async softDeleteClause(alias) {
    const has = await this.hasColumn('deleted_at');
    return has ? `${alias}.deleted_at IS NULL` : null;
  }

  // Helper genérico para WHERE dinâmico seguro
  _where(parts) {
    const filtered = parts.filter(Boolean);
    return filtered.length ? `WHERE ${filtered.join(' AND ')}` : '';
  }

  // Buscar por CNPJ
async findByClienteAndCep(clienteId, cep) {
  try {
    const sql = `SELECT * FROM endereco_entrega WHERE cliente_id = $1 AND cep = $2 LIMIT 1`;
    const result = await this.database.query(sql, [clienteId, cep]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar endereço por cliente e CEP:', error);
    throw error;
  }
}
async findByCnpj(cnpj) {
  try {
    const sql = `SELECT * FROM transportadoras WHERE cnpj = $1 LIMIT 1`;
    const result = await this.database.query(sql, [cnpj]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar transportadora por CNPJ:', error);
    throw error;
  }
}
  // Buscar por nome (busca parcial)
  async searchByName(searchTerm, limit = 10) {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('t');
      if (soft) where.push(soft);

      params.push(`%${searchTerm}%`);
      where.push(`t.nome ILIKE $${params.length}`);

      params.push(limit);
      const query = `
        SELECT t.id, t.nome, t.cnpj, t.municipio, t.uf
        FROM ${this.tableName} t
        ${this._where(where)}
        ORDER BY t.nome
        LIMIT $${params.length}
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar transportadoras por nome:', error);
      throw error;
    }
  }

  // Buscar por UF
  async findByUf(uf) {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('t');
      if (soft) where.push(soft);

      params.push(uf);
      where.push(`t.uf = $${params.length}`);

      const query = `
        SELECT t.*
        FROM ${this.tableName} t
        ${this._where(where)}
        ORDER BY t.nome
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar transportadoras por UF:', error);
      throw error;
    }
  }

  // Buscar com contagem de romaneios (via NF -> Romaneios)
  async findWithRomaneiosCount(id) {
    try {
      const tSoft = await this.softDeleteClause('t');

      const hasRDeleted = await (async () => {
        const sql = `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='romaneios' AND column_name='deleted_at'
          LIMIT 1
        `;
        const { rows } = await this.executeQuery(sql);
        return rows.length > 0;
      })();
      const rSoft = hasRDeleted ? `r.deleted_at IS NULL` : null;

      const hasNfDeleted = await (async () => {
        const sql = `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='notas_fiscais' AND column_name='deleted_at'
          LIMIT 1
        `;
        const { rows } = await this.executeQuery(sql);
        return rows.length > 0;
      })();
      const nfSoft = hasNfDeleted ? `nf.deleted_at IS NULL` : null;

      const where = [];
      const params = [id];
      where.push(`t.id = $1`);
      if (tSoft) where.push(tSoft);

      const query = `
        SELECT 
          t.*,
          COUNT(r.id) AS total_romaneios,
          COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS romaneios_mes
        FROM ${this.tableName} t
        LEFT JOIN notas_fiscais nf
          ON nf.transportadora_id = t.id
          ${nfSoft ? `AND ${nfSoft}` : ''}
        LEFT JOIN romaneios r
          ON r.id = nf.romaneio_id
          ${rSoft ? `AND ${rSoft}` : ''}
        ${this._where(where)}
        GROUP BY t.id
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar transportadora com contagem de romaneios:', error);
      throw error;
    }
  }

  // Buscar transportadoras com estatísticas (via NF -> Romaneios)
  async findAllWithStats(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 't.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const tSoft = await this.softDeleteClause('t');

      const hasRDeleted = await (async () => {
        const sql = `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='romaneios' AND column_name='deleted_at'
          LIMIT 1
        `;
        const { rows } = await this.executeQuery(sql);
        return rows.length > 0;
      })();
      const rSoft = hasRDeleted ? `r.deleted_at IS NULL` : null;

      const hasNfDeleted = await (async () => {
        const sql = `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='notas_fiscais' AND column_name='deleted_at'
          LIMIT 1
        `;
        const { rows } = await this.executeQuery(sql);
        return rows.length > 0;
      })();
      const nfSoft = hasNfDeleted ? `nf.deleted_at IS NULL` : null;

      const where = [];
      const params = [];

      if (tSoft) where.push(tSoft);

      if (filters.nome) {
        params.push(`%${filters.nome}%`);
        where.push(`t.nome ILIKE $${params.length}`);
      }
      if (filters.uf) {
        params.push(filters.uf);
        where.push(`t.uf = $${params.length}`);
      }
      if (filters.municipio) {
        params.push(`%${filters.municipio}%`);
        where.push(`t.municipio ILIKE $${params.length}`);
      }

      const baseFrom = `
        FROM ${this.tableName} t
        LEFT JOIN notas_fiscais nf
          ON nf.transportadora_id = t.id
          ${nfSoft ? `AND ${nfSoft}` : ''}
        LEFT JOIN romaneios r
          ON r.id = nf.romaneio_id
          ${rSoft ? `AND ${rSoft}` : ''}
      `;

      const dataSql = `
        SELECT 
          t.*,
          COUNT(DISTINCT r.id) AS total_romaneios,
          COUNT(DISTINCT CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN r.id END) AS romaneios_mes,
          COUNT(DISTINCT nf.id) AS total_notas_fiscais
        ${baseFrom}
        ${this._where(where)}
        GROUP BY t.id
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      const countParams = params.slice(0, params.length - 2); // remove limit/offset
      const countSql = `
        SELECT COUNT(DISTINCT t.id) AS total
        ${baseFrom}
        ${this._where(where)}
      `;

      const [countResult, result] = await Promise.all([
        this.executeQuery(countSql, countParams),
        this.executeQuery(dataSql, params)
      ]);

      const total = parseInt(countResult.rows[0]?.total || 0, 10);

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
      logger.error('Erro ao buscar transportadoras com estatísticas:', error);
      throw error;
    }
  }

  // Validar CNPJ único
  async validateUniqueCnpj(cnpj, excludeId = null) {
    try {
      const where = [];
      const params = [cnpj];
      const soft = await this.softDeleteClause('t');
      if (soft) where.push(soft);
      where.push(`t.cnpj = $1`);

      if (excludeId) {
        params.push(excludeId);
        where.push(`t.id != $${params.length}`);
      }

      const query = `
        SELECT t.id 
        FROM ${this.tableName} t
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar CNPJ único:', error);
      throw error;
    }
  }

  // Buscar transportadoras ativas para integração
  async findActiveForIntegration() {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('t');
      if (soft) where.push(soft);
      where.push(`t.integracao_ocorrencia IS NOT NULL`);

      const query = `
        SELECT t.id, t.nome, t.cnpj, t.integracao_ocorrencia
        FROM ${this.tableName} t
        ${this._where(where)}
        ORDER BY t.nome
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar transportadoras para integração:', error);
      throw error;
    }
  }

  // ✅ Alias esperado pelo JobSchedulerService
  async findForIntegration(options = {}) {
    return this.findActiveForIntegration(options);
  }

  // Estatísticas gerais
  async getStats() {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('t');
      if (soft) where.push(soft);

      const query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(CASE WHEN t.integracao_ocorrencia IS NOT NULL THEN 1 END) AS com_integracao,
          COUNT(CASE WHEN t.romaneio_auto = true THEN 1 END) AS romaneio_automatico,
          COUNT(CASE WHEN t.roterizacao_automatica = true THEN 1 END) AS roterizacao_automatica,
          COUNT(DISTINCT t.uf) AS total_ufs
        FROM ${this.tableName} t
        ${this._where(where)}
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas de transportadoras:', error);
      throw error;
    }
  }
}

module.exports = TransportadorasRepository;
