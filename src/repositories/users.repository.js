const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class UsersRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  // Buscar por email
  async findByEmail(email) {
    try {
      const query = `
        SELECT id, name, email, password, email_verified_at, remember_token,
               created_at, updated_at, deleted_at, role
        FROM ${this.tableName} 
        WHERE email = $1 AND deleted_at IS NULL
      `;
      const result = await this.executeQuery(query, [email]);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  // Sobrescrever findById para incluir password quando necessário
  async findById(id, includePassword = false) {
    try {
      const fields = includePassword 
        ? 'id, name, email, password, email_verified_at, remember_token, created_at, updated_at, deleted_at'
        : 'id, name, email, email_verified_at, remember_token, created_at, updated_at, deleted_at';
      
      const query = `
        SELECT ${fields}
        FROM ${this.tableName}
        WHERE id = $1 AND deleted_at IS NULL
      `;
      const result = await this.executeQuery(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // Criar usuário
  async create(userData) {
    try {
      const {
        name,
        email,
        password,
        email_verified_at = null,
        remember_token = null
      } = userData;

      // Validações básicas
      if (!name || !email || !password) {
        throw new Error('Nome, email e senha são obrigatórios');
      }

      const query = `
        INSERT INTO ${this.tableName} (name, email, password, email_verified_at, remember_token, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, name, email, email_verified_at, remember_token, created_at, updated_at
      `;

      const values = [name, email, password, email_verified_at, remember_token];
      
      const result = await this.executeQuery(query, values);
      return result.rows[0];
    } catch (error) {
      // Tratar erro de email duplicado
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        throw new Error('Email já está em uso');
      }
      logger.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  // Atualizar usuário
  async update(id, userData) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 0;

      // Campos permitidos para atualização
      const allowedFields = [
        'name', 'email', 'password', 'email_verified_at', 'remember_token'
      ];

      // Construir query dinâmica
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && allowedFields.includes(key)) {
          paramCount++;
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      });

      if (updates.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      // Adicionar updated_at
      paramCount++;
      updates.push(`updated_at = $${paramCount}`);
      values.push(new Date());

      // Adicionar ID
      paramCount++;
      values.push(id);

      const query = `
        UPDATE ${this.tableName} 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND deleted_at IS NULL
        RETURNING id, name, email, email_verified_at, remember_token, created_at, updated_at, role
      `;

      const result = await this.executeQuery(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      // Tratar erro de email duplicado
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        throw new Error('Email já está em uso');
      }
      logger.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  // Verificar email único
  async validateUniqueEmail(email, excludeId = null) {
    try {
      let query = `
        SELECT id FROM ${this.tableName}
        WHERE email = $1 AND deleted_at IS NULL
      `;
      const params = [email];

      if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
      }

      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar email único:', error);
      throw error;
    }
  }

  // Verificar email
  async verifyEmail(id) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET email_verified_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, name, email, email_verified_at
      `;
      
      const result = await this.executeQuery(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao verificar email:', error);
      throw error;
    }
  }

  // Atualizar remember token
  async updateRememberToken(id, token) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET remember_token = $1, updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING id
      `;
      
      const result = await this.executeQuery(query, [token, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar remember token:', error);
      throw error;
    }
  }

  // Buscar por remember token
  async findByRememberToken(token) {
    try {
      const query = `
        SELECT id, name, email, email_verified_at, remember_token,
               created_at, updated_at, deleted_at, role
        FROM ${this.tableName} 
        WHERE remember_token = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.executeQuery(query, [token]);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar por remember token:', error);
      throw error;
    }
  }

  // Buscar usuários com paginação
  async findAllWithStats(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      let query = `
        SELECT 
          id, name, email, email_verified_at, remember_token, created_at, updated_at, role
        FROM ${this.tableName}
        WHERE deleted_at IS NULL
      `;

      const params = [];
      let paramCount = 0;

      // Aplicar filtros
      if (filters.name) {
        paramCount++;
        query += ` AND name ILIKE $${paramCount}`;
        params.push(`%${filters.name}%`);
      }

      if (filters.email) {
        paramCount++;
        query += ` AND email ILIKE $${paramCount}`;
        params.push(`%${filters.email}%`);
      }

      if (filters.verified !== undefined) {
        if (filters.verified === 'true' || filters.verified === true) {
          query += ` AND email_verified_at IS NOT NULL`;
        } else {
          query += ` AND email_verified_at IS NULL`;
        }
      }

      // Contar total
      const countQuery = query.replace(
        'SELECT id, name, email, email_verified_at, remember_token, created_at, updated_at',
        'SELECT COUNT(*) as total'
      );

      const countResult = await this.executeQuery(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // ORDER BY
      const allowedOrderColumns = ['id', 'name', 'email', 'created_at', 'updated_at'];
      if (allowedOrderColumns.includes(orderBy)) {
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

      const result = await this.executeQuery(query, params);

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
      logger.error('Erro ao buscar usuários com estatísticas:', error);
      throw error;
    }
  }

  // Estatísticas gerais
  async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as verified,
          COUNT(CASE WHEN email_verified_at IS NULL THEN 1 END) as unverified,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent
        FROM ${this.tableName}
        WHERE deleted_at IS NULL
      `;
      const result = await this.executeQuery(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas de usuários:', error);
      throw error;
    }
  }
}

module.exports = UsersRepository;