// repositories/ocorrencias.repository.js
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class OcorrenciasRepository extends BaseRepository {
  constructor() {
    super('ocorrencias');
  }

  // Sobrescrever o método create para usar SQL manual com schema correto
  async create(data) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} (
          nro_nf, 
          "dataHoraEnvio", 
          "dataHoraEvento", 
          codigo, 
          descricao,
          complemento,
          "nomeRecebedor",
          "docRecebedor", 
          latitude, 
          longitude, 
          "linkComprovante",
          "zaapId",
          "messageId",
          id_z_api,
          enviado_zap,
          enviado_date,
          status,
          created_at,
          updated_at,
          link_comprovante_sistema,
          status_download_comprovante,
          tipo_comprovante_download
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING *
      `;

      const values = [
        data.nro_nf,                                                    // $1 - integer NOT NULL
        data.dataHoraEnvio,                                            // $2 - timestamp NOT NULL
        data.dataHoraEvento || null,                                   // $3 - timestamp nullable
        data.codigo,                                                   // $4 - integer NOT NULL
        data.descricao,                                               // $5 - text NOT NULL
        data.complemento || null,                                     // $6 - varchar(255) nullable
        data.nomeRecebedor || null,                                   // $7 - varchar(255) nullable
        data.docRecebedor || null,                                    // $8 - char(20) nullable
        data.latitude || null,                                        // $9 - numeric(8,2) nullable
        data.longitude || null,                                       // $10 - numeric(8,2) nullable
        data.linkComprovante || null,                                 // $11 - text nullable
        data.zaapId || null,                                          // $12 - varchar(255) nullable
        data.messageId || null,                                       // $13 - varchar(255) nullable
        data.id_z_api || null,                                        // $14 - varchar(255) nullable
        data.enviado_zap !== undefined ? data.enviado_zap : false,    // $15 - boolean DEFAULT false
        data.enviado_date || null,                                    // $16 - timestamp nullable
        data.status || 'waiting',                                     // $17 - varchar(255) com constraint
        data.created_at || new Date(),                                // $18 - timestamp
        data.updated_at || new Date(),                                // $19 - timestamp
        data.link_comprovante_sistema || null,                       // $20 - text nullable
        data.status_download_comprovante || null,                    // $21 - integer nullable
        data.tipo_comprovante_download || null                       // $22 - varchar(255) nullable
      ];

      const result = await this.executeQuery(sql, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao criar ocorrência:', error);
      throw error;
    }
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

  // Buscar todas ocorrências com relacionamentos
  async findAllWithRelations(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'o.id',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(limit, this.maxLimit);
      const offset = (page - 1) * validLimit;

      const where = [];
      const params = [];
      const soft = await this.softDeleteClause('o');
      if (soft) where.push(soft);

      // Aplicar filtros
      let paramCount = 0;
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          paramCount++;
          if (key === 'nro_nf' || key === 'codigo') {
            where.push(`o.${key} = $${paramCount}`);
          } else if (typeof value === 'string' && value.includes('%')) {
            where.push(`o.${key} ILIKE $${paramCount}`);
          } else {
            where.push(`o.${key} = $${paramCount}`);
          }
          params.push(value);
        }
      });

      // Query de dados
      const dataSql = `
        SELECT 
          o.*,
          co.descricao as codigo_descricao,
          co.tipo as codigo_tipo,
          co.finalizadora,
          nf.nro as nota_fiscal_numero
        FROM ${this.tableName} o
        LEFT JOIN codigo_ocorrencias co ON co.codigo = o.codigo
        LEFT JOIN notas_fiscais nf ON nf.nro = o.nro_nf
        ${this._where(where)}
        ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
        LIMIT $${params.push(validLimit)}
        OFFSET $${params.push(offset)}
      `;

      // Query de contagem
      const countSql = `
        SELECT COUNT(o.id) AS total
        FROM ${this.tableName} o
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
      logger.error('Erro ao buscar ocorrências:', error);
      throw error;
    }
  }

  // Buscar por número da NF
  async findByNumeroNF(numeroNF) {
    try {
      const where = [];
      const params = [numeroNF];
      const soft = await this.softDeleteClause('o');
      if (soft) where.push(soft);
      where.push(`o.nro_nf = $1`);

      const query = `
        SELECT 
          o.*,
          co.descricao as codigo_descricao,
          co.tipo as codigo_tipo,
          co.finalizadora
        FROM ${this.tableName} o
        LEFT JOIN codigo_ocorrencias co ON co.codigo = o.codigo
        ${this._where(where)}
        ORDER BY o."dataHoraEvento" DESC, o.created_at DESC
      `;

      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar ocorrências por número NF:', error);
      throw error;
    }
  }

  // Buscar por código de ocorrência
  async findByCodigo(codigo) {
    try {
      const where = [];
      const params = [codigo];
      const soft = await this.softDeleteClause('o');
      if (soft) where.push(soft);
      where.push(`o.codigo = $1`);

      const query = `
        SELECT 
          o.*,
          co.descricao as codigo_descricao,
          co.tipo as codigo_tipo,
          co.finalizadora
        FROM ${this.tableName} o
        LEFT JOIN codigo_ocorrencias co ON co.codigo = o.codigo
        ${this._where(where)}
        ORDER BY o."dataHoraEvento" DESC, o.created_at DESC
      `;

      const result = await this.executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar ocorrências por código:', error);
      throw error;
    }
  }

  // Verificar se código é finalizador
  async isCodigoFinalizador(codigo) {
    try {
      const query = `
        SELECT finalizadora FROM codigo_ocorrencias 
        WHERE codigo = $1 AND api = true
      `;
      
      const result = await this.executeQuery(query, [codigo]);
      return result.rows.length > 0 ? result.rows[0].finalizadora : false;
    } catch (error) {
      logger.error('Erro ao verificar código finalizador:', error);
      return false;
    }
  }

  // Buscar última ocorrência de uma NF
  async getLastOcorrencia(nroNF) {
    try {
      const query = `
        SELECT o.*, co.finalizadora, co.descricao as codigo_descricao
        FROM ${this.tableName} o
        LEFT JOIN codigo_ocorrencias co ON co.codigo = o.codigo
        WHERE o.nro_nf = $1
        ORDER BY o."dataHoraEvento" DESC, o.created_at DESC
        LIMIT 1
      `;
      
      const result = await this.executeQuery(query, [nroNF]);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao buscar última ocorrência:', error);
      throw error;
    }
  }

  // Buscar ocorrência existente para evitar duplicação
  async findOcorrenciaExistente(nroNf, codigo, dataHoraEvento) {
    try {
      const sql = `
        SELECT id FROM ${this.tableName} 
        WHERE nro_nf = $1 
        AND codigo = $2 
        AND "dataHoraEvento" = $3 
        LIMIT 1
      `;
      
      const result = await this.executeQuery(sql, [
        nroNf, 
        codigo, 
        new Date(dataHoraEvento)
      ]);

      return result.rows[0] || null;
    } catch (error) {
      logger.warn('Erro ao buscar ocorrência existente:', error.message);
      return null;
    }
  }

  // Buscar ocorrência por nota fiscal, código e data/hora do evento
  async findByNotaFiscalAndCodigo(nroNf, codigo, dataHoraEvento) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE nro_nf = $1 
        AND codigo = $2 
        AND "dataHoraEvento" = $3
        LIMIT 1
      `;
      
      const result = await this.executeQuery(sql, [nroNf, codigo, dataHoraEvento]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar ocorrência por NF, código e data:', error);
      throw error;
    }
  }

  // Estatísticas de ocorrências por transportadora
  async getStatsbyTransportadora(transportadoraId, dias = 30) {
    try {
      const query = `
        SELECT 
          co.codigo,
          co.descricao,
          COUNT(*) as quantidade,
          co.finalizadora
        FROM ${this.tableName} o
        INNER JOIN notas_fiscais nf ON nf.nro = o.nro_nf
        INNER JOIN codigo_ocorrencias co ON co.codigo = o.codigo
        WHERE nf.transportadora_id = $1
          AND o.created_at >= NOW() - INTERVAL '${dias} days'
        GROUP BY co.codigo, co.descricao, co.finalizadora
        ORDER BY quantidade DESC
      `;
      
      const result = await this.executeQuery(query, [transportadoraId]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao obter estatísticas por transportadora:', error);
      throw error;
    }
  }
}

module.exports = OcorrenciasRepository;