const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class MotoristasRepository extends BaseRepository {
  constructor() {
    super('motoristas');
  }

  // Helper para aplicar soft-delete condicionalmente
  async softDeleteClause(alias) {
    const has = await this.hasColumn('deleted_at');
    return has ? `${alias}.deleted_at IS NULL` : null;
  }

  // Helper genérico para WHERE dinâmico seguro
  _where(parts) {
    const filtered = parts.filter(Boolean);
    return filtered.length ? `WHERE ${filtered.join(' AND ')}` : '';
  }

  // Buscar por CPF
  async findByCpf(cpf) {
    try {
      const where = [];
      const params = [cpf];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.cpf = $1`);

      const query = `
        SELECT m.*
        FROM ${this.tableName} m
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar motorista por CPF:', error);
      throw error;
    }
  }

  // Buscar por email
  async findByEmail(email) {
    try {
      const where = [];
      const params = [email];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.email = $1`);

      const query = `
        SELECT m.*
        FROM ${this.tableName} m
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar motorista por email:', error);
      throw error;
    }
  }

  // Buscar por nome (busca parcial)
  async searchByName(searchTerm, limit = 10) {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);

      params.push(`%${searchTerm}%`);
      where.push(`(m.nome ILIKE $${params.length} OR m.sobrenome ILIKE $${params.length})`);

      params.push(limit);
      const query = `
        SELECT m.id, m.nome, m.sobrenome, m.cpf, m.contato, m.email
        FROM ${this.tableName} m
        ${this._where(where)}
        ORDER BY m.nome, m.sobrenome
        LIMIT $${params.length}
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar motoristas por nome:', error);
      throw error;
    }
  }

  // Buscar por cidade
  async findByCidade(cidade) {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);

      params.push(`%${cidade}%`);
      where.push(`m.cidade ILIKE $${params.length}`);

      const query = `
        SELECT m.*
        FROM ${this.tableName} m
        ${this._where(where)}
        ORDER BY m.nome, m.sobrenome
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar motoristas por cidade:', error);
      throw error;
    }
  }

  // Buscar com informações de legislação
  async findWithLegislacao(id) {
    try {
      const where = [];
      const params = [id];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.id = $1`);

      const query = `
        SELECT 
          m.*,
          l.nome as legislacao_nome,
          l.max_direcao_continua,
          l.max_trabalho_continuo,
          l.tempo_pausa
        FROM ${this.tableName} m
        LEFT JOIN legislacao l ON l.id = m.legislacao_id
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar motorista com legislação:', error);
      throw error;
    }
  }

  // Buscar com contagem de romaneios
  async findWithRomaneiosCount(id) {
    try {
      const mSoft = await this.softDeleteClause('m');

      // Checa soft-delete em romaneios
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

      const where = [];
      const params = [id];
      where.push(`m.id = $1`);
      if (mSoft) where.push(mSoft);

      const query = `
        SELECT 
          m.*,
          l.nome as legislacao_nome,
          COUNT(r.id) AS total_romaneios,
          COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS romaneios_mes
        FROM ${this.tableName} m
        LEFT JOIN legislacao l ON l.id = m.legislacao_id
        LEFT JOIN romaneios r
          ON r.motorista_id = m.id
          ${rSoft ? `AND ${rSoft}` : ''}
        ${this._where(where)}
        GROUP BY m.id, l.id
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar motorista com contagem de romaneios:', error);
      throw error;
    }
  }

  // Buscar motoristas com estatísticas
  async findAllWithStats(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'm.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      // Soft-delete por tabela/alias
      const mSoft = await this.softDeleteClause('m');

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

      const hasVDeleted = await (async () => {
        const sql = `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='veiculos' AND column_name='deleted_at'
          LIMIT 1
        `;
        const { rows } = await this.executeQuery(sql);
        return rows.length > 0;
      })();
      const vSoft = hasVDeleted ? `v.deleted_at IS NULL` : null;

      const where = [];
      const params = [];

      if (mSoft) where.push(mSoft);

      if (filters.nome) {
        params.push(`%${filters.nome}%`);
        where.push(`(m.nome ILIKE $${params.length} OR m.sobrenome ILIKE $${params.length})`);
      }
      if (filters.cpf) {
        params.push(filters.cpf);
        where.push(`m.cpf = $${params.length}`);
      }
      if (filters.cidade) {
        params.push(`%${filters.cidade}%`);
        where.push(`m.cidade ILIKE $${params.length}`);
      }
      if (filters.estado) {
        params.push(filters.estado);
        where.push(`m.estado = $${params.length}`);
      }
      if (filters.legislacao_id) {
        params.push(filters.legislacao_id);
        where.push(`m.legislacao_id = $${params.length}`);
      }

      // Base FROM com joins
      let baseFrom = `
        FROM ${this.tableName} m
        LEFT JOIN legislacao l ON l.id = m.legislacao_id
        LEFT JOIN romaneios r
          ON r.motorista_id = m.id
          ${rSoft ? `AND ${rSoft}` : ''}
        LEFT JOIN veiculos v
          ON v.motorista_id = m.id
          ${vSoft ? `AND ${vSoft}` : ''}
      `;

      // Query de dados
      let dataSql = `
        SELECT 
          m.*,
          l.nome as legislacao_nome,
          COUNT(DISTINCT r.id) AS total_romaneios,
          COUNT(DISTINCT CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN r.id END) AS romaneios_mes,
          COUNT(DISTINCT v.id) AS total_veiculos
        ${baseFrom}
        ${this._where(where)}
        GROUP BY m.id, l.id
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      let countSql = `
        SELECT COUNT(DISTINCT m.id) AS total
        ${baseFrom}
        ${this._where(where)}
      `;

      const [countResult, result] = await Promise.all([
        this.executeQuery(countSql, params.slice(0, params.length - 2)),
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
      logger.error('Erro ao buscar motoristas com estatísticas:', error);
      throw error;
    }
  }

  // Validar CPF único
  async validateUniqueCpf(cpf, excludeId = null) {
    try {
      const where = [];
      const params = [cpf];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.cpf = $1`);

      if (excludeId) {
        params.push(excludeId);
        where.push(`m.id != $${params.length}`);
      }

      const query = `
        SELECT m.id 
        FROM ${this.tableName} m
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar CPF único:', error);
      throw error;
    }
  }

  // Validar email único
  async validateUniqueEmail(email, excludeId = null) {
    try {
      if (!email) return true; // Email é opcional

      const where = [];
      const params = [email];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.email = $1`);

      if (excludeId) {
        params.push(excludeId);
        where.push(`m.id != $${params.length}`);
      }

      const query = `
        SELECT m.id 
        FROM ${this.tableName} m
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar email único:', error);
      throw error;
    }
  }

  // Buscar motoristas ativos (que podem receber mensagens)
  async findActiveForMessages() {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.send_mensagem = true`);
      where.push(`m.contato IS NOT NULL`);

      const query = `
        SELECT m.id, m.nome, m.sobrenome, m.contato, m.email
        FROM ${this.tableName} m
        ${this._where(where)}
        ORDER BY m.nome, m.sobrenome
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar motoristas ativos para mensagens:', error);
      throw error;
    }
  }

  // Buscar com jornada de trabalho
  async findWithJornada(id) {
    try {
      const where = [];
      const params = [id];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);
      where.push(`m.id = $1`);

      const query = `
        SELECT 
          m.*,
          l.nome as legislacao_nome,
          json_agg(
            json_build_object(
              'id', jt.id,
              'inicio', jt.inicio,
              'fim', jt.fim
            ) ORDER BY jt.id
          ) FILTER (WHERE jt.id IS NOT NULL) as jornadas_trabalho
        FROM ${this.tableName} m
        LEFT JOIN legislacao l ON l.id = m.legislacao_id
        LEFT JOIN jornada_trabalho jt ON jt.motorista_id = m.id
        ${this._where(where)}
        GROUP BY m.id, l.id
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar motorista com jornada:', error);
      throw error;
    }
  }

  // Estatísticas gerais
  async getStats() {
    try {
      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('m');
      if (soft) where.push(soft);

      const query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(CASE WHEN m.send_mensagem = true THEN 1 END) AS recebem_mensagem,
          COUNT(CASE WHEN m.legislacao_id IS NOT NULL THEN 1 END) AS com_legislacao,
          COUNT(CASE WHEN m.email IS NOT NULL AND m.email != '' THEN 1 END) AS com_email,
          COUNT(CASE WHEN m.contato IS NOT NULL AND m.contato != '' THEN 1 END) AS com_contato,
          COUNT(DISTINCT m.cidade) AS total_cidades
        FROM ${this.tableName} m
        ${this._where(where)}
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas de motoristas:', error);
      throw error;
    }
  }
}

module.exports = MotoristasRepository;