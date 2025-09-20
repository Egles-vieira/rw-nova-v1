// backend/src/repositories/base.repository.js
const db = require('../database/connection');
const logger = require('../config/logger');
const config = require('../config/env');

class BaseRepository {
  // Aceita: super('tabela')  OU  super(database, 'tabela')
   constructor(arg1, arg2) {
     if (arg2) {
       this.database = arg1 || db; // se não vier, usa fallback global
       this.tableName = arg2;
     } else {
       this.database = db;
       this.tableName = arg1;
     }
     this.defaultLimit = config.pagination.defaultLimit;
     this.maxLimit = config.pagination.maxLimit;
     this._columnsCache = null;
   }
 

  async executeQuery(sql, params = []) {
    try {
      return await db.query(sql, params);
    } catch (error) {
      logger.error(`Erro em executeQuery na tabela ${this.tableName}:`, error);
      throw error;
    }
  }

  // 🔧 novos helpers
  async getTableColumns() {
    if (this._columnsCache) return this._columnsCache;
    const sql = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `;
    const { rows } = await db.query(sql, [this.tableName]);
    this._columnsCache = rows.map(r => r.column_name);
    return this._columnsCache;
  }

  async hasColumn(columnName) {
    const cols = await this.getTableColumns();
    return cols.includes(columnName);
  }

  // Método genérico para buscar todos os registros com paginação e filtros
// Método genérico para buscar todos os registros com paginação e filtros
async findAll(options = {}) {
  try {
    const {
      page = 1,
      limit = this.defaultLimit,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      filters = {},
      select = '*',
      joins = [],
      groupBy = null,
      having = null
    } = options;

    // Validar e limitar o limit
    const validLimit = Math.min(limit, this.maxLimit);
    const offset = (page - 1) * validLimit;

    // Construir SELECT
    let query = `SELECT ${select} FROM ${this.tableName}`;
    const params = [];
    let paramCount = 0;

    // Adicionar JOINs
    if (joins.length > 0) {
      query += ` ${joins.join(' ')}`;
    }

    // Construir WHERE
    const whereConditions = [];
    
    // Soft delete check (se a tabela tiver deleted_at)
    if (await this.hasColumn('deleted_at')) {
      whereConditions.push(`${this.tableName}.deleted_at IS NULL`);
    }

    // Filtros dinâmicos
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        paramCount++;
        if (Array.isArray(value)) {
          whereConditions.push(`${key} = ANY($${paramCount})`);
          params.push(value);
        } else if (typeof value === 'string' && value.includes('%')) {
          whereConditions.push(`${key} ILIKE $${paramCount}`);
          params.push(value);
        } else {
          whereConditions.push(`${key} = $${paramCount}`);
          params.push(value);
        }
      }
    });

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // GROUP BY
    if (groupBy) {
      query += ` GROUP BY ${groupBy}`;
    }

    // HAVING
    if (having) {
      query += ` HAVING ${having}`;
    }

    // Contar total de registros - CORREÇÃO AQUI
    let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    
    if (joins.length > 0) {
      countQuery += ` ${joins.join(' ')}`;
    }
    
    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // GROUP BY e HAVING para count (se aplicável)
    if (groupBy) {
      countQuery += ` GROUP BY ${groupBy}`;
    }
    if (having) {
      countQuery += ` HAVING ${having}`;
    }

    // Se há GROUP BY, precisamos contar diferentemente
    if (groupBy) {
      countQuery = `SELECT COUNT(*) as total FROM (${countQuery}) as subquery`;
    }

    const countResult = await db.query(countQuery, params);
    const total = groupBy ? parseInt(countResult.rows[0].total) : parseInt(countResult.rows[0].total);

    // ORDER BY
    const allowedOrderColumns = await this.getTableColumns();
    if (allowedOrderColumns.includes(orderBy.split('.').pop())) {
      query += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // LIMIT e OFFSET
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(validLimit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    return {
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
        hasNext: page * validLimit < total,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    logger.error(`Erro ao buscar registros de ${this.tableName}:`, error);
    throw error;
  }
}

  // Buscar por ID
  async findById(id, options = {}) {
    try {
      const { select = '*', joins = [] } = options;
      
      let query = `SELECT ${select} FROM ${this.tableName}`;
      
      if (joins.length > 0) {
        query += ` ${joins.join(' ')}`;
      }
      
      query += ` WHERE ${this.tableName}.id = $1`;
      
      if (await this.hasColumn('deleted_at')) {
        query += ` AND ${this.tableName}.deleted_at IS NULL`;
      }

      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Erro ao buscar registro ${id} de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Buscar por campos específicos
  async findBy(criteria, options = {}) {
    try {
      const { select = '*', joins = [], orderBy = 'created_at', orderDirection = 'DESC' } = options;
      
      let query = `SELECT ${select} FROM ${this.tableName}`;
      const params = [];
      let paramCount = 0;

      if (joins.length > 0) {
        query += ` ${joins.join(' ')}`;
      }

      const whereConditions = [];
      
      if (await this.hasColumn('deleted_at')) {
        whereConditions.push(`${this.tableName}.deleted_at IS NULL`);
      }

      Object.entries(criteria).forEach(([key, value]) => {
        paramCount++;
        whereConditions.push(`${key} = $${paramCount}`);
        params.push(value);
      });

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Erro ao buscar registros de ${this.tableName} por critério:`, error);
      throw error;
    }
  }

  // Buscar um registro por critério
  async findOneBy(criteria, options = {}) {
    const results = await this.findBy(criteria, { ...options, limit: 1 });
    return results[0];
  }

  // Criar registro
  async create(data, options = {}) {
    try {
      const { returning = '*' } = options;
      
      // Adicionar timestamps se as colunas existirem
      if (await this.hasColumn('created_at')) {
        data.created_at = new Date();
      }
      if (await this.hasColumn('updated_at')) {
        data.updated_at = new Date();
      }

      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`);

      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${returning}
      `;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Erro ao criar registro em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Atualizar registro
  async update(id, data, options = {}) {
    try {
      const { returning = '*' } = options;
      
      // Adicionar updated_at se a coluna existir
      if (await this.hasColumn('updated_at')) {
        data.updated_at = new Date();
      }

      const entries = Object.entries(data);
      const setClause = entries.map(([key], index) => `${key} = $${index + 1}`);
      const values = entries.map(([, value]) => value);
      values.push(id);

      let query = `
        UPDATE ${this.tableName}
        SET ${setClause.join(', ')}
        WHERE id = $${values.length}
      `;

      if (await this.hasColumn('deleted_at')) {
        query += ` AND deleted_at IS NULL`;
      }

      query += ` RETURNING ${returning}`;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Erro ao atualizar registro ${id} em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Soft delete
  async softDelete(id) {
    try {
      if (!(await this.hasColumn('deleted_at'))) {
        throw new Error(`Tabela ${this.tableName} não suporta soft delete`);
      }

      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = $1, updated_at = $2
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await db.query(query, [new Date(), new Date(), id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Erro ao fazer soft delete do registro ${id} em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Hard delete
  async delete(id) {
    try {
      let query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      
      if (await this.hasColumn('deleted_at')) {
        query += ` AND deleted_at IS NULL`;
      }
      
      query += ` RETURNING id`;

      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Erro ao deletar registro ${id} em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Restaurar soft deleted
  async restore(id) {
    try {
      if (!(await this.hasColumn('deleted_at'))) {
        throw new Error(`Tabela ${this.tableName} não suporta restore`);
      }

      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = NULL, updated_at = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(query, [new Date(), id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Erro ao restaurar registro ${id} em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Contar registros
  async count(criteria = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const params = [];
      let paramCount = 0;

      const whereConditions = [];
      
      if (await this.hasColumn('deleted_at')) {
        whereConditions.push(`deleted_at IS NULL`);
      }

      Object.entries(criteria).forEach(([key, value]) => {
        paramCount++;
        whereConditions.push(`${key} = $${paramCount}`);
        params.push(value);
      });

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      logger.error(`Erro ao contar registros em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Verificar se existe
  async exists(criteria) {
    const count = await this.count(criteria);
    return count > 0;
  }
}


  module.exports = BaseRepository;