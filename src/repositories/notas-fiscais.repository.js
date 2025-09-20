const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class NotasFiscaisRepository extends BaseRepository {
  constructor() {
    super('notas_fiscais');
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

  // Buscar por número da nota fiscal
  async findByNumero(numero) {
    try {
      const where = [];
      const params = [numero];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.nro = $1`);

      const query = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          e.documento as embarcador_documento,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          ee.endereco as endereco_entrega_completo
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        ORDER BY nf.created_at DESC
      `;
      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por número:', error);
      throw error;
    }
  }

  // Buscar por chave da nota fiscal
  async findByChaveNf(chaveNf) {
    try {
      const where = [];
      const params = [chaveNf];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.chave_nf = $1`);

      const query = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          e.documento as embarcador_documento,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          ee.endereco as endereco_entrega_completo
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por chave NF:', error);
      throw error;
    }
  }

  // Buscar por chave CTE
  async findByChaveCte(chaveCte) {
    try {
      const where = [];
      const params = [chaveCte];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.chave_cte = $1`);

      const query = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          e.documento as embarcador_documento,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          ee.endereco as endereco_entrega_completo
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por chave CTE:', error);
      throw error;
    }
  }

  // Buscar por número e série
async findByNumeroSerie(numero, serie) {
  try {
    const sql = `SELECT * FROM notas_fiscais WHERE nro = $1 AND ser = $2 ORDER BY created_at DESC`;
    const result = await this.database.query(sql, [numero, serie]);
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar notas fiscais por número e série:', error);
    throw error;
  }
}

  // Buscar notas fiscais por transportadora
  async findByTransportadora(transportadoraId, options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'nf.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [transportadoraId];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.transportadora_id = $1`);

      // Filtros adicionais
      let paramCount = 1;
      if (filters.status_nf) {
        paramCount++;
        where.push(`nf.status_nf = $${paramCount}`);
        params.push(filters.status_nf);
      }
      if (filters.finalizada !== undefined) {
        paramCount++;
        where.push(`nf.finalizada = $${paramCount}`);
        params.push(filters.finalizada);
      }
      if (filters.data_inicio) {
        paramCount++;
        where.push(`nf.emi_nf >= $${paramCount}`);
        params.push(filters.data_inicio);
      }
      if (filters.data_fim) {
        paramCount++;
        where.push(`nf.emi_nf <= $${paramCount}`);
        params.push(filters.data_fim);
      }

      // Query de dados
      let dataSql = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          ee.endereco as endereco_entrega_completo
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      let countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} nf
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
      logger.error('Erro ao buscar notas fiscais por transportadora:', error);
      throw error;
    }
  }

  // Buscar notas fiscais por cliente
  async findByCliente(clienteId, options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'nf.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [clienteId];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.cliente_id = $1`);

      // Filtros adicionais
      let paramCount = 1;
      if (filters.status_nf) {
        paramCount++;
        where.push(`nf.status_nf = $${paramCount}`);
        params.push(filters.status_nf);
      }
      if (filters.finalizada !== undefined) {
        paramCount++;
        where.push(`nf.finalizada = $${paramCount}`);
        params.push(filters.finalizada);
      }
      if (filters.data_inicio) {
        paramCount++;
        where.push(`nf.emi_nf >= $${paramCount}`);
        params.push(filters.data_inicio);
      }
      if (filters.data_fim) {
        paramCount++;
        where.push(`nf.emi_nf <= $${paramCount}`);
        params.push(filters.data_fim);
      }

      // Query de dados
      let dataSql = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          ee.endereco as endereco_entrega_completo
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      let countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} nf
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
      logger.error('Erro ao buscar notas fiscais por cliente:', error);
      throw error;
    }
  }

  // Buscar notas fiscais por romaneio
  async findByRomaneio(romaneioId, options = {}) {
    try {
      const where = [];
      const params = [romaneioId];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.romaneio_id = $1`);

      const query = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          r.placa_cavalo,
          r.placa_carreta,
          m.nome as motorista_nome,
          ee.endereco as endereco_entrega_completo,
          ee.cidade as endereco_cidade,
          ee.uf as endereco_uf
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN motoristas m ON m.id = r.motorista_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        ORDER BY nf.ordem ASC, nf.created_at ASC
      `;

      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar notas fiscais por romaneio:', error);
      throw error;
    }
  }

  // Buscar com relacionamentos (ID específico)
  async findWithRelations(id) {
    try {
      const where = [];
      const params = [id];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.id = $1`);

      const query = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          c.endereco as cliente_endereco,
          e.nome as embarcador_nome,
          e.documento as embarcador_documento,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero,
          r.placa_cavalo,
          r.placa_carreta,
          m.nome as motorista_nome,
          m.cpf as motorista_cpf,
          m.contato as motorista_contato,
          ee.endereco as endereco_entrega_completo,
          ee.cidade as endereco_cidade,
          ee.uf as endereco_uf,
          ee.bairro as endereco_bairro,
          ee.cep as endereco_cep
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        LEFT JOIN motoristas m ON m.id = r.motorista_id
        LEFT JOIN endereco_entrega ee ON ee.id = nf.endereco_entrega_id
        ${this._where(where)}
        LIMIT 1
      `;

      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal com relacionamentos:', error);
      throw error;
    }
  }

  // Buscar com todos os dados relacionados (para listagem)
  async findAllWithStats(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'nf.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);

      // Aplicar filtros
      let paramCount = 0;
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          paramCount++;
          if (key.includes('_id')) {
            where.push(`nf.${key} = $${paramCount}`);
          } else if (key === 'finalizada') {
            where.push(`nf.finalizada = $${paramCount}`);
          } else if (typeof value === 'string' && value.includes('%')) {
            where.push(`nf.${key} ILIKE $${paramCount}`);
          } else {
            where.push(`nf.${key} = $${paramCount}`);
          }
          params.push(value);
        }
      });

      // Query de dados
      let dataSql = `
        SELECT 
          nf.*,
          c.nome as cliente_nome,
          c.documento as cliente_documento,
          c.cidade as cliente_cidade,
          c.uf as cliente_uf,
          e.nome as embarcador_nome,
          t.nome as transportadora_nome,
          t.cnpj as transportadora_cnpj,
          r.numero as romaneio_numero
        FROM ${this.tableName} nf
        LEFT JOIN clientes c ON c.id = nf.cliente_id
        LEFT JOIN embarcadores e ON e.id = nf.embarcador_id
        LEFT JOIN transportadoras t ON t.id = nf.transportadora_id
        LEFT JOIN romaneios r ON r.id = nf.romaneio_id
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      let countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.tableName} nf
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
      logger.error('Erro ao buscar notas fiscais com estatísticas:', error);
      throw error;
    }
  }

  // Finalizar nota fiscal
  async finalizar(id, dataEntrega, horaEntrega, observacoes) {
    try {
      const updateData = {
        finalizada: true,
        data_entrega: dataEntrega,
        hora_entrega: horaEntrega,
        updated_at: new Date()
      };

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      const entries = Object.entries(updateData);
      const setClause = entries.map(([key], index) => `${key} = $${index + 1}`);
      const values = entries.map(([, value]) => value);
      values.push(id);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause.join(', ')}
        WHERE id = $${values.length} AND finalizada = false
        RETURNING *
      `;

      const result = await this.executeQuery(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao finalizar nota fiscal:', error);
      throw error;
    }
  }

  // Atualizar status
  async updateStatus(id, status, observacoes) {
    try {
      const updateData = {
        status_nf: status,
        updated_at: new Date()
      };

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      const entries = Object.entries(updateData);
      const setClause = entries.map(([key], index) => `${key} = $${index + 1}`);
      const values = entries.map(([, value]) => value);
      values.push(id);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await this.executeQuery(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao atualizar status da nota fiscal:', error);
      throw error;
    }
  }

  // Estatísticas gerais
  async getStats() {
    try {
      const where = [];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);

      const query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(CASE WHEN nf.finalizada = true THEN 1 END) AS finalizadas,
          COUNT(CASE WHEN nf.finalizada = false THEN 1 END) AS pendentes,
          COUNT(CASE WHEN nf.romaneio_id IS NULL THEN 1 END) AS sem_romaneio,
          COUNT(CASE WHEN nf.romaneio_id IS NOT NULL THEN 1 END) AS com_romaneio,
          COUNT(CASE WHEN nf.nf_retida = true THEN 1 END) AS retidas,
          COUNT(CASE WHEN nf.previsao_entrega < CURRENT_DATE AND nf.finalizada = false THEN 1 END) AS atrasadas,
          COUNT(CASE WHEN nf.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS mes_atual,
          COALESCE(SUM(nf.valor), 0) AS valor_total,
          COALESCE(AVG(nf.valor), 0) AS valor_medio,
          COALESCE(SUM(nf.peso_calculo), 0) AS peso_total,
          COUNT(DISTINCT nf.cliente_id) AS clientes_unicos,
          COUNT(DISTINCT nf.transportadora_id) AS transportadoras_unicas
        FROM ${this.tableName} nf
        ${this._where(where)}
      `;
      const result = await this.executeQuery(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas de notas fiscais:', error);
      throw error;
    }
  }

  // Estatísticas por período
  async getStatsByPeriod(dataInicio, dataFim) {
    try {
      const where = [];
      const params = [dataInicio, dataFim];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.emi_nf >= $1 AND nf.emi_nf <= $2`);

      const query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(CASE WHEN nf.finalizada = true THEN 1 END) AS finalizadas,
          COUNT(CASE WHEN nf.finalizada = false THEN 1 END) AS pendentes,
          COALESCE(SUM(nf.valor), 0) AS valor_total,
          COALESCE(AVG(nf.valor), 0) AS valor_medio,
          COALESCE(SUM(nf.peso_calculo), 0) AS peso_total,
          COUNT(DISTINCT nf.cliente_id) AS clientes_unicos,
          COUNT(DISTINCT nf.transportadora_id) AS transportadoras_unicas
        FROM ${this.tableName} nf
        ${this._where(where)}
      `;
      const result = await this.executeQuery(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao obter estatísticas por período:', error);
      throw error;
    }
  }

  // Validações
  async validateUniqueChaveNf(chaveNf, excludeId = null) {
    try {
      const where = [];
      const params = [chaveNf];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.chave_nf = $1`);

      if (excludeId) {
        params.push(excludeId);
        where.push(`nf.id != $${params.length}`);
      }

      const query = `
        SELECT nf.id 
        FROM ${this.tableName} nf
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar chave NF única:', error);
      throw error;
    }
  }

  async validateUniqueChaveCte(chaveCte, excludeId = null) {
    try {
      const where = [];
      const params = [chaveCte];
      const soft = await this.softDeleteClause('nf');
      if (soft) where.push(soft);
      where.push(`nf.chave_cte = $1`);

      if (excludeId) {
        params.push(excludeId);
        where.push(`nf.id != $${params.length}`);
      }

      const query = `
        SELECT nf.id 
        FROM ${this.tableName} nf
        ${this._where(where)}
        LIMIT 1
      `;
      const result = await this.executeQuery(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Erro ao validar chave CTE única:', error);
      throw error;
    }
  }


 
}

module.exports = NotasFiscaisRepository;