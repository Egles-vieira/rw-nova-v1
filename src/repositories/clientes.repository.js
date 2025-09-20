// src/repositories/clientes.repository.js
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class ClientesRepository extends BaseRepository {
  constructor() {
    super('clientes');
    this.defaultLimit = this.defaultLimit || 20;
    this.maxLimit = this.maxLimit || 100;
  }

  /** ----------------------------------------------------------------
   * Helpers de metadados (existência de tabela/coluna e soft delete)
   * ---------------------------------------------------------------- */
  async _tableExists(tableName) {
    const sql = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
      LIMIT 1
    `;
    const r = await this.executeQuery(sql, [String(tableName)]);
    return r.rowCount > 0;
  }

  async _tableHasColumn(tableName, columnName) {
    const sql = `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      LIMIT 1
    `;
    const r = await this.executeQuery(sql, [String(tableName), String(columnName)]);
    return r.rowCount > 0;
  }

  async _whereNotDeleted(alias = 'c') {
    const hasDeletedAt = await this._tableHasColumn(this.tableName, 'deleted_at');
    return hasDeletedAt ? `${alias}.deleted_at IS NULL` : '1=1';
  }

  async _andNotDeleted(alias = 'c') {
    return `AND ${(await this._whereNotDeleted(alias))}`;
  }

  /** ----------------------------------------------------------------
   * Descoberta dinâmica da tabela de endereços e colunas disponíveis
   * ---------------------------------------------------------------- */
  async _resolveEnderecoSchema() {
    const candidateTables = [
      'enderecos_cliente',
      'endereco_entrega',
      'enderecos',
      'clientes_enderecos'
    ];
    const candidateFKs = ['cliente_id', 'id_cliente'];

    const getColumns = async (tableName) => {
      const sql = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
      `;
      const r = await this.executeQuery(sql, [String(tableName)]);
      return new Set(r.rows.map(x => x.column_name));
    };

    for (const t of candidateTables) {
      if (await this._tableExists(t)) {
        const cols = await getColumns(t);
        for (const fk of candidateFKs) {
          if (cols.has(fk)) {
            const softClause = cols.has('deleted_at') ? `${t}.deleted_at IS NULL` : '1=1';
            const idColExists = cols.has('id');
            return { table: t, fk, softClause, columns: cols, idColExists };
          }
        }
      }
    }
    return null; // sem tabela compatível
  }

  /** ----------------------------------------------------------------
   * Métodos de negócio
   * ---------------------------------------------------------------- */

  // ✅ ADICIONADO: Método para buscar por CNPJ (usado pelo webhook)
  async findByCnpj(cnpj) {
    try {
      const andNotDeleted = await this._andNotDeleted('c');
      const sql = `
        SELECT * 
        FROM ${this.tableName} c 
        WHERE c.documento = $1 ${andNotDeleted}
        LIMIT 1
      `;
      const r = await this.executeQuery(sql, [cnpj]);
      return r.rows[0] || null;
    } catch (err) {
      logger.error('Erro ao buscar cliente por CNPJ:', err);
      throw err;
    }
  }

  async findByDocumento(documento) {
    try {
      const sql = `SELECT * FROM clientes WHERE documento = $1 LIMIT 1`;
      const result = await this.database.query(sql, [documento]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar cliente por documento:', error);
      throw error;
    }
  }

  async findByCodigo(codCliente) {
    try {
      const andNotDeleted = await this._andNotDeleted('c');
      const sql = `
        SELECT *
        FROM ${this.tableName} c
        WHERE c.cod_cliente = $1 ${andNotDeleted}
        LIMIT 1
      `;
      const r = await this.executeQuery(sql, [codCliente]);
      return r.rows[0] || null;
    } catch (err) {
      logger.error('Erro ao buscar cliente por código:', err);
      throw err;
    }
  }

  // === helper: resolve schema de notas do cliente ===
  async _resolveNotasSchema() {
    const table = 'notas_fiscais';
    // existem bases que usam 'cliente_id' ou 'id_cliente'
    const candidateFKs = ['cliente_id', 'id_cliente'];
    // checa se a tabela existe
    const tableExists = await this._tableExists(table);
    if (!tableExists) return null;

    // pega colunas existentes
    const colsRes = await this.executeQuery(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
    `, [table]);
    const columns = new Set(colsRes.rows.map(r => r.column_name));

    // escolhe a FK que existir
    const fk = candidateFKs.find(k => columns.has(k));
    if (!fk) return null;

    // soft delete opcional em notas
    const softClause = columns.has('deleted_at') ? `${table}.deleted_at IS NULL` : '1=1';

    return { table, fk, columns, softClause };
  }

  // alias para manter compatibilidade com o controller atual
  async findByCodCliente(codCliente) {
    return this.findByCodigo(codCliente);
  }

  // Cliente com endereços agregados (NÃO quebra se tabela/colunas mudarem)
  async findWithEnderecos(id) {
    try {
      const endCfg = await this._resolveEnderecoSchema();
      const andNotDeletedC = await this._andNotDeleted('c');

      if (!endCfg) {
        const sql = `
          SELECT c.*, '[]'::json AS enderecos
          FROM ${this.tableName} c
          WHERE c.id = $1 ${andNotDeletedC}
          LIMIT 1
        `;
        const r = await this.executeQuery(sql, [id]);
        return r.rows[0] || null;
      }

      const { table, fk, softClause, columns, idColExists } = endCfg;

      // Mapeia chaves de saída → possíveis colunas da tabela de endereços
      const mappings = [
        { key:'id',           sources:['id'] },
        { key:'apelido',      sources:['apelido','alias','nome'] },
        { key:'logradouro',   sources:['logradouro','rua','endereco','endereco_logradouro'] },
        { key:'numero',       sources:['numero','num'] },
        { key:'bairro',       sources:['bairro','district'] },
        { key:'cidade',       sources:['cidade','municipio'] },
        { key:'uf',           sources:['uf','estado'] },
        { key:'cep',          sources:['cep','codigo_postal'] },
        { key:'complemento',  sources:['complemento','compl'] },
        { key:'principal',    sources:['principal','is_principal','padrao'] },
        { key:'latitude',     sources:['latitude','lat'] },
        { key:'longitude',    sources:['longitude','lng','long','lon'] }
      ];

      const jsonPairs = [];
      for (const map of mappings) {
        const col = map.sources.find(s => columns.has(s));
        if (col) jsonPairs.push(`'${map.key}', ec."${col}"`);
      }
      if (jsonPairs.length === 0) {
        // Garante ao menos um identificador de referência
        const refCol = idColExists ? 'ec.id' : `ec.${fk}`;
        jsonPairs.push(`'ref', ${refCol}`);
      }
      const jsonObject = `json_build_object(${jsonPairs.join(', ')})`;

      // Ordenação da lista de endereços (tudo QUALIFICADO com alias ec.)
      const primaryCol = ['principal','is_principal','padrao'].find(c => columns.has(c)) || null;
      const notNullRef = idColExists ? 'ec.id' : `ec.${fk}`;
      const orderTerms = [];
      if (primaryCol) orderTerms.push(`ec."${primaryCol}" DESC NULLS LAST`);
      orderTerms.push(notNullRef); // sempre ordena por referência no final
      const orderClause = orderTerms.join(', ');

      const sql = `
        SELECT 
          c.*,
          json_agg(${jsonObject} ORDER BY ${orderClause})
            FILTER (WHERE ${notNullRef} IS NOT NULL) AS enderecos
        FROM ${this.tableName} c
        LEFT JOIN ${table} ec
          ON ec.${fk} = c.id
         AND ${softClause}
        WHERE c.id = $1 ${andNotDeletedC}
        GROUP BY c.id
      `;
      const r = await this.executeQuery(sql, [id]);
      return r.rows[0] || null;
    } catch (err) {
      logger.error('Erro ao buscar cliente com endereços:', err);
      throw err;
    }
  }

  // Listagem com filtros + paginação + total_enderecos (resiliente)
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        orderBy = 'c.created_at',
        orderDirection = 'DESC',
        filters = {}
      } = options;

      const validLimit = Math.min(Number(limit) || this.defaultLimit, this.maxLimit);
      const offset = (Number(page) - 1) * validLimit;

      const orderable = new Set([
        'c.id', 'c.nome', 'c.documento', 'c.cod_cliente',
        'c.cidade', 'c.uf', 'c.created_at', 'c.updated_at'
      ]);
      const normalizeOrderBy = (col) => {
        if (!col) return 'c.created_at';
        const withAlias = col.includes('.') ? col : `c.${col}`;
        return orderable.has(withAlias) ? withAlias : 'c.created_at';
      };
      const _orderBy = normalizeOrderBy(orderBy);
      const _orderDir = String(orderDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const whereNotDeletedC = await this._whereNotDeleted('c');
      const whereClauses = [whereNotDeletedC];
      const params = [];
      let i = 0;

      if (filters.nome) {
        params.push(`%${filters.nome}%`); i++;
        whereClauses.push(`c.nome ILIKE $${i}`);
      }
      if (filters.documento) {
        params.push(filters.documento); i++;
        whereClauses.push(`c.documento = $${i}`);
      }
      if (filters.cod_cliente) {
        params.push(filters.cod_cliente); i++;
        whereClauses.push(`c.cod_cliente = $${i}`);
      }
      if (filters.cidade) {
        params.push(`%${filters.cidade}%`); i++;
        whereClauses.push(`c.cidade ILIKE $${i}`);
      }
      if (filters.uf) {
        params.push(filters.uf); i++;
        whereClauses.push(`c.uf = $${i}`);
      }

      const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

      // COUNT total com os mesmos filtros
      const countQuery = `
        SELECT COUNT(DISTINCT c.id) AS total
        FROM ${this.tableName} c
        ${whereSQL}
      `;
      const countResult = await this.executeQuery(countQuery, params);
      const total = parseInt(countResult.rows?.[0]?.total || 0, 10);

      // Query principal (conta endereços se existir tabela)
      const endCfg = await this._resolveEnderecoSchema();

      let query;
      if (endCfg) {
        const { table, fk, softClause } = endCfg;
        query = `
          SELECT
            c.*,
            COUNT(ec.${fk}) AS total_enderecos
          FROM ${this.tableName} c
          LEFT JOIN ${table} ec
            ON ec.${fk} = c.id
           AND ${softClause}
          ${whereSQL}
          GROUP BY c.id
          ORDER BY ${_orderBy} ${_orderDir}
          LIMIT $${i + 1}
          OFFSET $${i + 2}
        `;
      } else {
        query = `
          SELECT
            c.*,
            0::bigint AS total_enderecos
          FROM ${this.tableName} c
          ${whereSQL}
          ORDER BY ${_orderBy} ${_orderDir}
          LIMIT $${i + 1}
          OFFSET $${i + 2}
        `;
      }

      const queryParams = [...params, validLimit, offset];
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
    } catch (err) {
      logger.error('Erro ao listar clientes:', err);
      throw err;
    }
  }

  // Autocomplete por nome
  async searchByName(searchTerm, limit = 10) {
    try {
      const andNotDeleted = await this._andNotDeleted('c');
      const sql = `
        SELECT c.id, c.nome, c.documento, c.cidade, c.uf
        FROM ${this.tableName} c
        WHERE c.nome ILIKE $1 ${andNotDeleted}
        ORDER BY c.nome
        LIMIT $2
      `;
      const r = await this.executeQuery(sql, [`%${searchTerm}%`, Number(limit)]);
      return r.rows;
    } catch (err) {
      logger.error('Erro ao buscar clientes por nome:', err);
      throw err;
    }
  }

  // Filtros simples (se seu controller expõe)
  async findByUf(uf) {
    try {
      const andNotDeleted = await this._andNotDeleted('c');
      const sql = `
        SELECT *
        FROM ${this.tableName} c
        WHERE c.uf = $1 ${andNotDeleted}
        ORDER BY c.nome
      `;
      const r = await this.executeQuery(sql, [uf]);
      return r.rows;
    } catch (err) {
      logger.error('Erro ao buscar clientes por UF:', err);
      throw err;
    }
  }

  async findByCidade(cidade) {
    try {
      const andNotDeleted = await this._andNotDeleted('c');
      const sql = `
        SELECT *
        FROM ${this.tableName} c
        WHERE c.cidade ILIKE $1 ${andNotDeleted}
        ORDER BY c.nome
      `;
      const r = await this.executeQuery(sql, [`%${cidade}%`]);
      return r.rows;
    } catch (err) {
      logger.error('Erro ao buscar clientes por cidade:', err);
      throw err;
    }
  }

  // Unicidade de documento
  async validateUniqueDocumento(documento, excludeId = null) {
    try {
      const andNotDeleted = await this._andNotDeleted('c');
      const params = [documento];
      let i = 1;

      let where = `WHERE c.documento = $${i} ${andNotDeleted}`;
      if (excludeId) {
        i += 1;
        params.push(excludeId);
        where += ` AND c.id <> $${i}`;
      }

      const sql = `
        SELECT c.id
        FROM ${this.tableName} c
        ${where}
        LIMIT 1
      `;
      const r = await this.executeQuery(sql, params);
      return r.rowCount === 0;
    } catch (err) {
      logger.error('Erro ao validar documento único (clientes):', err);
      throw err;
    }
  }




// Adicione este método se não existir no clientes.repository.js
async findByCnpj(cnpj) {
  try {
    const andNotDeleted = await this._andNotDeleted('c');
    const sql = `
      SELECT * 
      FROM ${this.tableName} c 
      WHERE c.documento = $1 ${andNotDeleted}
      LIMIT 1
    `;
    const r = await this.executeQuery(sql, [cnpj]);
    return r.rows[0] || null;
  } catch (err) {
    logger.error('Erro ao buscar cliente por CNPJ:', err);
    throw err;
  }
}



  // Estatísticas gerais
  async getStats() {
    try {
      const whereNotDeleted = await this._whereNotDeleted('c');
      const sql = `
        SELECT 
          COUNT(*) AS total,
          COUNT(DISTINCT c.cidade) AS total_cidades,
          COUNT(DISTINCT c.uf) AS total_ufs
        FROM ${this.tableName} c
        WHERE ${whereNotDeleted}
      `;
      const r = await this.executeQuery(sql);
      return r.rows[0];
    } catch (err) {
      logger.error('Erro ao obter estatísticas de clientes:', err);
      throw err;
    }
  }

  // Compat: alguns controllers chamam findAllWithStats
  async findAllWithStats(options = {}) {
    return this.findAll(options);
  }
}

module.exports = ClientesRepository;