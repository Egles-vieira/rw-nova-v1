// repositories/transportadora-codigo-ocorrencia.repository.js
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class TransportadoraCodigoOcorrenciaRepository extends BaseRepository {
  constructor() {
    super('transportadora_codigo_ocorrencia');
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

  // Buscar todos com relacionamentos
  async findAllWithRelations(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'tco.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);

      // Aplicar filtros
      let paramCount = 0;
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          paramCount++;
          if (key === 'transportadora_id') {
            where.push(`tco.transportadora_id = $${paramCount}`);
          } else if (key === 'codigo_ocorrencia_codigo') {
            where.push(`tco.codigo_ocorrencia_codigo = $${paramCount}`);
          } else if (typeof value === 'string' && value.includes('%')) {
            where.push(`tco.${key} ILIKE $${paramCount}`);
          } else {
            where.push(`tco.${key} = $${paramCount}`);
          }
          params.push(value);
        }
      });

      // Query de dados
      const dataSql = `
        SELECT 
          tco.*,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          co.descricao as ocorrencia_descricao,
          co.tipo as ocorrencia_tipo,
          co.processo as ocorrencia_processo,
          co.finalizadora as ocorrencia_finalizadora
        FROM ${this.tableName} tco
        LEFT JOIN transportadoras t ON t.id = tco.transportadora_id
        LEFT JOIN codigo_ocorrencias co ON co.codigo = tco.codigo_ocorrencia_codigo
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} tco
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
      logger.error('Erro ao buscar vínculos transportadora-código:', error);
      throw error;
    }
  }

  // Buscar por ID com relacionamentos
  async findWithRelations(id) {
    try {
      const where = [];
      const params = [id];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);
      where.push(`tco.id = $1`);

      const query = `
        SELECT 
          tco.*,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          t.uf as transportadora_uf,
          co.descricao as ocorrencia_descricao,
          co.tipo as ocorrencia_tipo,
          co.processo as ocorrencia_processo,
          co.finalizadora as ocorrencia_finalizadora,
          co.api as ocorrencia_api
        FROM ${this.tableName} tco
        LEFT JOIN transportadoras t ON t.id = tco.transportadora_id
        LEFT JOIN codigo_ocorrencias co ON co.codigo = tco.codigo_ocorrencia_codigo
        ${this._where(where)}
        LIMIT 1
      `;

      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar vínculo com relacionamentos:', error);
      throw error;
    }
  }

  // Buscar por transportadora
  async findByTransportadora(transportadoraId, options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'co.codigo',
        orderDirection = 'ASC'
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [transportadoraId];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);
      where.push(`tco.transportadora_id = $1`);

      // Query de dados
      const dataSql = `
        SELECT 
          tco.*,
          co.descricao as ocorrencia_descricao,
          co.tipo as ocorrencia_tipo,
          co.processo as ocorrencia_processo,
          co.finalizadora as ocorrencia_finalizadora,
          co.api as ocorrencia_api
        FROM ${this.tableName} tco
        LEFT JOIN codigo_ocorrencias co ON co.codigo = tco.codigo_ocorrencia_codigo
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} tco
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
      logger.error('Erro ao buscar códigos por transportadora:', error);
      throw error;
    }
  }

  // Buscar por código de ocorrência
  async findByCodigoOcorrencia(codigoOcorrencia, options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 't.nome',
        orderDirection = 'ASC'
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [codigoOcorrencia];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);
      where.push(`tco.codigo_ocorrencia_codigo = $1`);

      // Query de dados
      const dataSql = `
        SELECT 
          tco.*,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          t.uf as transportadora_uf
        FROM ${this.tableName} tco
        LEFT JOIN transportadoras t ON t.id = tco.transportadora_id
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} tco
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
      logger.error('Erro ao buscar transportadoras por código:', error);
      throw error;
    }
  }

  // Verificar se vínculo já existe
  async existsVinculo(transportadoraId, codigoOcorrencia) {
    try {
      const where = [];
      const params = [transportadoraId, codigoOcorrencia];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);
      where.push(`tco.transportadora_id = $1 AND tco.codigo_ocorrencia_codigo = $2`);

      const query = `
        SELECT id 
        FROM ${this.tableName} tco
        ${this._where(where)}
        LIMIT 1
      `;

      const result = await this.executeQuery(query, params);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Erro ao verificar vínculo existente:', error);
      throw error;
    }
  }

  // Buscar vínculo específico
  async findVinculo(transportadoraId, codigoOcorrencia) {
    try {
      const where = [];
      const params = [transportadoraId, codigoOcorrencia];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);
      where.push(`tco.transportadora_id = $1 AND tco.codigo_ocorrencia_codigo = $2`);

      const query = `
        SELECT 
          tco.*,
          t.nome as transportadora_nome,
          co.descricao as ocorrencia_descricao
        FROM ${this.tableName} tco
        LEFT JOIN transportadoras t ON t.id = tco.transportadora_id
        LEFT JOIN codigo_ocorrencias co ON co.codigo = tco.codigo_ocorrencia_codigo
        ${this._where(where)}
        LIMIT 1
      `;

      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar vínculo específico:', error);
      throw error;
    }
  }

  // Criar múltiplos vínculos
  async createMultiple(vinculos) {
    try {
      if (!Array.isArray(vinculos) || vinculos.length === 0) {
        throw new Error('Lista de vínculos é obrigatória');
      }

      const values = [];
      const placeholders = [];
      let paramCount = 1;

      vinculos.forEach((vinculo, index) => {
        const { transportadora_id, codigo_ocorrencia_codigo, codigo, descricao } = vinculo;
        values.push(transportadora_id, codigo_ocorrencia_codigo, codigo, descricao);
        
        const placeholder = `($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3})`;
        placeholders.push(placeholder);
        paramCount += 4;
      });

      const query = `
        INSERT INTO ${this.tableName} 
          (transportadora_id, codigo_ocorrencia_codigo, codigo, descricao, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;

      const result = await this.executeQuery(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao criar múltiplos vínculos:', error);
      throw error;
    }
  }

  // Deletar vínculos por transportadora
  async deleteByTransportadora(transportadoraId) {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE transportadora_id = $1
        RETURNING *
      `;

      const result = await this.executeQuery(query, [transportadoraId]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao deletar vínculos por transportadora:', error);
      throw error;
    }
  }

  // Deletar vínculos por código de ocorrência
  async deleteByCodigoOcorrencia(codigoOcorrencia) {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE codigo_ocorrencia_codigo = $1
        RETURNING *
      `;

      const result = await this.executeQuery(query, [codigoOcorrencia]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao deletar vínculos por código:', error);
      throw error;
    }
  }

  // Estatísticas
  async getStats() {
    try {
      const where = [];
      const soft = await this.softDeleteClause('tco');
      if (soft) where.push(soft);

      const query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(DISTINCT transportadora_id) AS transportadoras_unicas,
          COUNT(DISTINCT codigo_ocorrencia_codigo) AS codigos_unicos,
          COUNT(CASE WHEN descricao IS NOT NULL THEN 1 END) AS com_descricao_personalizada
        FROM ${this.tableName} tco
        ${this._where(where)}
      `;

      const result = await this.executeQuery(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

module.exports = TransportadoraCodigoOcorrenciaRepository;