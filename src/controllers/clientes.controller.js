const BaseController = require('./base.controller');
const ClientesRepository = require('../repositories/clientes.repository');
const { validateCPF, validateCNPJ } = require('../utils/validators');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class ClientesController extends BaseController {
  constructor() {
    const repository = new ClientesRepository();
    super(repository);
  }

  // Sobrescrever list para incluir estatísticas
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAll(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Clientes recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar clientes:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir endereços de entrega
  async get(req, res) {
    try {
      const { id } = req.params;
      const cliente = await this.repository.findWithEnderecos(id);

      if (!cliente) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Cliente encontrado',
        data: cliente
      });
    } catch (error) {
      logger.error('Erro ao buscar cliente por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por documento (CPF/CNPJ)
  async getByDocumento(req, res) {
    try {
      const { documento } = req.params;

      // Validar documento
      const documentoLimpo = documento.replace(/\D/g, '');
      if (documentoLimpo.length === 11 && !validateCPF(documento)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'CPF inválido'
        });
      }
      if (documentoLimpo.length === 14 && !validateCNPJ(documento)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'CNPJ inválido'
        });
      }

      const cliente = await this.repository.findByDocumento(documentoLimpo);

      if (!cliente) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Cliente encontrado',
        data: cliente
      });
    } catch (error) {
      logger.error('Erro ao buscar cliente por documento:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por código do cliente
  async getByCodCliente(req, res) {
    try {
      const { codCliente } = req.params;

      const cliente = await this.repository.findByCodCliente(parseInt(codCliente));

      if (!cliente) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Cliente encontrado',
        data: cliente
      });
    } catch (error) {
      logger.error('Erro ao buscar cliente por código:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por nome (autocomplete)
  async search(req, res) {
    try {
      const { q: searchTerm, limit = 10 } = req.query;

      if (!searchTerm || searchTerm.length < 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      const clientes = await this.repository.searchByName(searchTerm, parseInt(limit));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: clientes
      });
    } catch (error) {
      logger.error('Erro ao buscar clientes por nome:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por cidade
  async getByCidade(req, res) {
    try {
      const { cidade } = req.params;

      const clientes = await this.repository.findByCidade(cidade);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Clientes encontrados',
        data: clientes
      });
    } catch (error) {
      logger.error('Erro ao buscar clientes por cidade:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por UF
  async getByUf(req, res) {
    try {
      const { uf } = req.params;

      if (!uf || uf.length !== 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'UF deve ter 2 caracteres'
        });
      }

      const clientes = await this.repository.findByUf(uf.toUpperCase());

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Clientes encontrados',
        data: clientes
      });
    } catch (error) {
      logger.error('Erro ao buscar clientes por UF:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar cliente com estatísticas de notas fiscais
  async getWithStats(req, res) {
    try {
      const { id } = req.params;
      const cliente = await this.repository.findWithNotasStats(id);

      if (!cliente) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Cliente com estatísticas recuperado',
        data: cliente
      });
    } catch (error) {
      logger.error('Erro ao buscar cliente com estatísticas:', error);
      return this.handleError(res, error);
    }
  }
// === usado pelo beforeDelete no controller ===
async findWithNotasStats(id) {
  try {
    const andNotDeletedC = await this._andNotDeleted('c');
    const nfCfg = await this._resolveNotasSchema();

    // se não houver tabela/ligação de notas, retorna cliente + zeros
    if (!nfCfg) {
      const sql = `
        SELECT 
          c.*,
          0::bigint   AS total_notas,
          0::bigint   AS notas_finalizadas,
          0::bigint   AS notas_mes,
          0::numeric  AS valor_total,
          0::numeric  AS peso_total
        FROM ${this.tableName} c
        WHERE c.id = $1 ${andNotDeletedC}
        LIMIT 1
      `;
      const r = await this.executeQuery(sql, [id]);
      return r.rows[0] || null;
    }

    const { table, fk, columns, softClause } = nfCfg;

    // campos opcionais (só usa se existirem)
    const finalizadaExpr = columns.has('finalizada')
      ? `COUNT(CASE WHEN nf.finalizada = true THEN 1 END)`
      : `0::bigint`;
    const mesExpr = columns.has('created_at')
      ? `COUNT(CASE WHEN nf.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)`
      : `0::bigint`;
    const valorExpr = columns.has('valor')
      ? `COALESCE(SUM(nf.valor), 0)`
      : `0::numeric`;
    // tenta vários nomes de peso
    const pesoCol = ['peso_calculo','peso_liquido','peso'].find(c => columns.has(c));
    const pesoExpr = pesoCol ? `COALESCE(SUM(nf."${pesoCol}"), 0)` : `0::numeric`;

    const sql = `
      SELECT 
        c.*,
        COUNT(nf.${fk}) AS total_notas,
        ${finalizadaExpr} AS notas_finalizadas,
        ${mesExpr} AS notas_mes,
        ${valorExpr} AS valor_total,
        ${pesoExpr} AS peso_total
      FROM ${this.tableName} c
      LEFT JOIN ${table} nf
        ON nf.${fk} = c.id
       AND ${softClause}
      WHERE c.id = $1 ${andNotDeletedC}
      GROUP BY c.id
    `;
    const r = await this.executeQuery(sql, [id]);
    return r.rows[0] || null;
  } catch (err) {
    logger.error('Erro ao obter stats de notas do cliente:', err);
    throw err;
  }
}
  // Estatísticas gerais
  async getStats(req, res) {
    try {
      const stats = await this.repository.getStats();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de clientes:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar documento
    if (data.documento) {
      const documento = data.documento.replace(/\D/g, '');
      
      if (documento.length === 11 && !validateCPF(data.documento)) {
        throw new Error('CPF inválido');
      }
      if (documento.length === 14 && !validateCNPJ(data.documento)) {
        throw new Error('CNPJ inválido');
      }

      // Verificar se documento já existe
      const isUniqueDoc = await this.repository.validateUniqueDocumento(documento);
      if (!isUniqueDoc) {
        throw new Error('Já existe um cliente com este documento');
      }

      data.documento = documento;
    }

    // Verificar se código do cliente já existe
    if (data.cod_cliente) {
      const isUniqueCod = await this.repository.validateUniqueCodCliente(data.cod_cliente);
      if (!isUniqueCod) {
        throw new Error('Já existe um cliente com este código');
      }
    }

    // Normalizar dados
    data.nome = data.nome.trim().toUpperCase();
    if (data.uf) data.uf = data.uf.trim().toUpperCase();
    if (data.cidade) data.cidade = data.cidade.trim();
    if (data.bairro) data.bairro = data.bairro.trim();
    if (data.endereco) data.endereco = data.endereco.trim();
    if (data.cep) data.cep = data.cep.replace(/\D/g, '');
    if (data.contato) data.contato = data.contato.trim();

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar documento se fornecido
    if (data.documento) {
      const documento = data.documento.replace(/\D/g, '');
      
      if (documento.length === 11 && !validateCPF(data.documento)) {
        throw new Error('CPF inválido');
      }
      if (documento.length === 14 && !validateCNPJ(data.documento)) {
        throw new Error('CNPJ inválido');
      }

      // Verificar se documento já existe (excluindo o registro atual)
      const isUniqueDoc = await this.repository.validateUniqueDocumento(documento, id);
      if (!isUniqueDoc) {
        throw new Error('Já existe um cliente com este documento');
      }

      data.documento = documento;
    }

    // Verificar código do cliente se fornecido
    if (data.cod_cliente) {
      const isUniqueCod = await this.repository.validateUniqueCodCliente(data.cod_cliente, id);
      if (!isUniqueCod) {
        throw new Error('Já existe um cliente com este código');
      }
    }

    // Normalizar dados
    if (data.nome) data.nome = data.nome.trim().toUpperCase();
    if (data.uf) data.uf = data.uf.trim().toUpperCase();
    if (data.cidade) data.cidade = data.cidade.trim();
    if (data.bairro) data.bairro = data.bairro.trim();
    if (data.endereco) data.endereco = data.endereco.trim();
    if (data.cep) data.cep = data.cep.replace(/\D/g, '');
    if (data.contato) data.contato = data.contato.trim();

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se tem notas fiscais associadas
    const cliente = await this.repository.findWithNotasStats(id);
    
    if (cliente && parseInt(cliente.total_notas) > 0) {
      throw new Error('Não é possível deletar cliente com notas fiscais associadas');
    }

    return true;
  }

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Novo cliente criado:', {
      id: record.id,
      nome: record.nome,
      documento: record.documento,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(record, req) {
    logger.info('Cliente atualizado:', {
      id: record.id,
      nome: record.nome,
      user_id: req.user?.id
    });

    return record;
  }

  // Método delete sobrescrito para usar hard delete (já que não temos soft delete)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      // Executar validações antes de deletar
      await this.beforeDelete(id, req);

      await this.repository.delete(id);

      // Executar ações após deletar
      await this.afterDelete(id, req);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Cliente deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar cliente:', error);
      return this.handleError(res, error);
    }
  }

  // Método restore não disponível (sem soft delete)
  async restore(req, res) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Funcionalidade de restauração não disponível'
    });
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    // Erros específicos de negócio
    if (error.message.includes('inválido')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Já existe um cliente')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('notas fiscais associadas')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Não é possível deletar',
        error: 'Cliente possui notas fiscais associadas'
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = ClientesController;