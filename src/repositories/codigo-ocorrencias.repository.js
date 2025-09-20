const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class CodigoOcorrenciasRepository extends BaseRepository {
  constructor() {
    super('codigo_ocorrencias');
  }

  // Buscar por código numérico
  async findByCodigo(codigo) {
    try {
      const where = [];
      const params = [codigo];
      const soft = await this.softDeleteClause('co');
      if (soft) where.push(soft);
      where.push(`co.codigo = $1`);

      const query = `
        SELECT co.*
        FROM ${this.tableName} co
        ${this._where(where)}
        LIMIT 1
      `;

      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar código de ocorrência por código:', error);
      throw error;
    }
  }

  // Validar código único
  async validateUniqueCodigo(codigo, excludeId = null) {
    try {
      const where = [];
      const params = [codigo];
      const soft = await this.softDeleteClause('co');
      if (soft) where.push(soft);
      where.push(`co.codigo = $1`);

      if (excludeId) {
        params.push(excludeId);
        where.push(`co.id != $${params.length}`);
      }

      const query = `
        SELECT co.id 
        FROM ${this.tableName} co
        ${this._where(where)}
        LIMIT 1
      `;

      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar código único:', error);
      throw error;
    }
  }

  // Verificar se código está em uso
  async isUsedInOcorrencias(id) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ocorrencias o
        WHERE o.codigo = (
          SELECT codigo FROM ${this.tableName} WHERE id = $1
        )
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [id]);
      return parseInt(result.rows[0]?.count || 0, 10) > 0;
    } catch (error) {
      logger.error('Erro ao verificar uso do código:', error);
      throw error;
    }
  }

  // Listar tipos disponíveis
  async getTipos() {
    try {
      const query = `
        SELECT DISTINCT tipo
        FROM ${this.tableName}
        WHERE tipo IS NOT NULL
        ORDER BY tipo
      `;

      const result = await this.executeQuery(query);
      return result.rows.map(row => row.tipo);
    } catch (error) {
      logger.error('Erro ao buscar tipos:', error);
      throw error;
    }
  }

  // Listar processos disponíveis
  async getProcessos() {
    try {
      const query = `
        SELECT DISTINCT processo
        FROM ${this.tableName}
        WHERE processo IS NOT NULL
        ORDER BY processo
      `;

      const result = await this.executeQuery(query);
      return result.rows.map(row => row.processo);
    } catch (error) {
      logger.error('Erro ao buscar processos:', error);
      throw error;
    }
  }

  // Buscar com filtros específicos
  async findAllWithFilters(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'co.codigo',
        orderDirection = 'ASC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('co');
      if (soft) where.push(soft);

      // Aplicar filtros
      let paramCount = 0;
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          paramCount++;
          if (key === 'finalizadora' || key === 'api') {
            where.push(`co.${key} = $${paramCount}`);
          } else if (typeof value === 'string' && value.includes('%')) {
            where.push(`co.${key} ILIKE $${paramCount}`);
          } else {
            where.push(`co.${key} = $${paramCount}`);
          }
          params.push(value);
        }
      });

      // Query de dados
      let dataSql = `
        SELECT co.*
        FROM ${this.tableName} co
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      let countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} co
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
      logger.error('Erro ao buscar códigos de ocorrência com filtros:', error);
      throw error;
    }
  }
}

module.exports = CodigoOcorrenciasRepository;