const BaseController = require('./base.controller');
const NotasFiscaisRepository = require('../repositories/notas-fiscais.repository');
const ClientesRepository = require('../repositories/clientes.repository');
const EmbarcadoresRepository = require('../repositories/embarcadores.repository');
const TransportadorasRepository = require('../repositories/transportadoras.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class NotasFiscaisController extends BaseController {
  constructor() {
    const repository = new NotasFiscaisRepository();
    super(repository);
    this.clientesRepository = new ClientesRepository();
    this.embarcadoresRepository = new EmbarcadoresRepository();
    this.transportadorasRepository = new TransportadorasRepository();
  }

  // Sobrescrever list para incluir relacionamentos
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithStats(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais recuperadas com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar notas fiscais:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir relacionamentos
  async get(req, res) {
    try {
      const { id } = req.params;
      const notaFiscal = await this.repository.findWithRelations(id);

      if (!notaFiscal) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Nota fiscal encontrada',
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por chave da nota fiscal
  async getByChaveNf(req, res) {
    try {
      const { chave } = req.params;

      if (!chave || chave.length !== 44) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Chave da nota fiscal deve ter 44 caracteres'
        });
      }

      const notaFiscal = await this.repository.findByChaveNf(chave);

      if (!notaFiscal) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Nota fiscal encontrada',
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por chave:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por chave do CTE
  async getByChaveCte(req, res) {
    try {
      const { chave } = req.params;

      if (!chave || chave.length !== 44) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Chave do CTE deve ter 44 caracteres'
        });
      }

      const notaFiscal = await this.repository.findByChaveCte(chave);

      if (!notaFiscal) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Nota fiscal encontrada',
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por chave CTE:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por número e série
  async getByNumeroSerie(req, res) {
    try {
      const { numero, serie } = req.params;

      if (!numero || !serie) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Número e série são obrigatórios'
        });
      }

      const notasFiscais = await this.repository.findByNumeroSerie(parseInt(numero), parseInt(serie));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais encontradas',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal por número e série:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar notas fiscais por cliente
  async getByCliente(req, res) {
    try {
      const { clienteId } = req.params;
      const options = this.buildQueryOptions(req);
      
      const result = await this.repository.findByCliente(clienteId, options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais do cliente recuperadas',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao buscar notas fiscais por cliente:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar notas fiscais por romaneio
  async getByRomaneio(req, res) {
    try {
      const { romaneioId } = req.params;
      
      const notasFiscais = await this.repository.findByRomaneio(romaneioId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais do romaneio recuperadas',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao buscar notas fiscais por romaneio:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar notas fiscais pendentes de romaneio
  async getPendentesRomaneio(req, res) {
    try {
      const { transportadoraId } = req.query;
      
      const notasFiscais = await this.repository.findPendentesRomaneio(transportadoraId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais pendentes de romaneio recuperadas',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao buscar notas fiscais pendentes:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar notas fiscais com atraso
  async getComAtraso(req, res) {
    try {
      const notasFiscais = await this.repository.findComAtraso();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais com atraso recuperadas',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao buscar notas fiscais com atraso:', error);
      return this.handleError(res, error);
    }
  }

  // Atualizar status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, observacoes } = req.body;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      const notaFiscal = await this.repository.updateStatus(id, status, observacoes);

      logger.info('Status de nota fiscal atualizado:', {
        id,
        status_anterior: existing.status_nf,
        status_novo: status,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status atualizado com sucesso',
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao atualizar status da nota fiscal:', error);
      return this.handleError(res, error);
    }
  }

  // Finalizar nota fiscal
  async finalizar(req, res) {
    try {
      const { id } = req.params;
      const { data_entrega, hora_entrega, observacoes } = req.body;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }

      if (existing.finalizada) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'Nota fiscal já foi finalizada'
        });
      }

      const notaFiscal = await this.repository.finalizar(id, data_entrega, hora_entrega, observacoes);

      logger.info('Nota fiscal finalizada:', {
        id,
        data_entrega,
        hora_entrega,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Nota fiscal finalizada com sucesso',
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao finalizar nota fiscal:', error);
      return this.handleError(res, error);
    }
  }

  // Associar notas fiscais a romaneio
  async associarRomaneio(req, res) {
    try {
      const { romaneioId } = req.params;
      const { notaIds } = req.body;

      if (!Array.isArray(notaIds) || notaIds.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Lista de IDs de notas fiscais é obrigatória'
        });
      }

      const notasFiscais = await this.repository.associarRomaneio(notaIds, romaneioId);

      logger.info('Notas fiscais associadas ao romaneio:', {
        romaneio_id: romaneioId,
        nota_ids: notaIds,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais associadas ao romaneio com sucesso',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao associar notas fiscais ao romaneio:', error);
      return this.handleError(res, error);
    }
  }

  // Desassociar notas fiscais de romaneio
  async desassociarRomaneio(req, res) {
    try {
      const { notaIds } = req.body;

      if (!Array.isArray(notaIds) || notaIds.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Lista de IDs de notas fiscais é obrigatória'
        });
      }

      const notasFiscais = await this.repository.desassociarRomaneio(notaIds);

      logger.info('Notas fiscais desassociadas do romaneio:', {
        nota_ids: notaIds,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais desassociadas do romaneio com sucesso',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao desassociar notas fiscais do romaneio:', error);
      return this.handleError(res, error);
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
      logger.error('Erro ao obter estatísticas de notas fiscais:', error);
      return this.handleError(res, error);
    }
  }

// Alias de compatibilidade com rotas antigas:
// GET /api/notas-fiscais/dashboard/status → usa o mesmo cálculo do getStats,
// mas entrega num formato já “pronto para dashboard”.
async getDashboardByStatus(req, res) {
  try {
    const s = await this.repository.getStats();

    const data = {
      totals: {
        total: Number(s?.total ?? 0),
        valor_total: Number(s?.valor_total ?? 0),
        peso_total: Number(s?.peso_total ?? 0),
      },
      status: [
        { key: 'finalizadas', value: Number(s?.finalizadas ?? 0) },
        { key: 'pendentes',   value: Number(s?.pendentes   ?? 0) },
        { key: 'atrasadas',   value: Number(s?.atrasadas   ?? 0) },
        { key: 'retidas',     value: Number(s?.retidas     ?? 0) },
      ],
      romaneio: [
        { key: 'com_romaneio', value: Number(s?.com_romaneio ?? 0) },
        { key: 'sem_romaneio', value: Number(s?.sem_romaneio ?? 0) },
      ],
      medias: {
        valor_medio: Number(s?.valor_medio ?? 0),
      },
    };

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Dashboard de notas fiscais recuperado com sucesso',
      data,
    });
  } catch (error) {
    logger.error('Erro ao obter dashboard de notas fiscais:', error);
    return this.handleError(res, error);
  }
}



  // Estatísticas por período
  async getStatsByPeriod(req, res) {
    try {
      const { data_inicio, data_fim } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Data de início e fim são obrigatórias'
        });
      }

      const stats = await this.repository.getStatsByPeriod(data_inicio, data_fim);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas por período recuperadas',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas por período:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar se cliente existe
    if (data.cliente_id) {
      const cliente = await this.clientesRepository.findById(data.cliente_id);
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }
    }

    // Validar se embarcador existe
    if (data.embarcador_id) {
      const embarcador = await this.embarcadoresRepository.findById(data.embarcador_id);
      if (!embarcador) {
        throw new Error('Embarcador não encontrado');
      }
    }

    // Validar se transportadora existe
    if (data.transportadora_id) {
      const transportadora = await this.transportadorasRepository.findById(data.transportadora_id);
      if (!transportadora) {
        throw new Error('Transportadora não encontrada');
      }
    }

    // Validar chave da nota fiscal única
    if (data.chave_nf) {
      const isUnique = await this.repository.validateUniqueChaveNf(data.chave_nf);
      if (!isUnique) {
        throw new Error('Já existe uma nota fiscal com esta chave');
      }
    }

    // Validar chave CTE única
    if (data.chave_cte) {
      const isUnique = await this.repository.validateUniqueChaveCte(data.chave_cte);
      if (!isUnique) {
        throw new Error('Já existe uma nota fiscal com esta chave CTE');
      }
    }

    // Validar datas
    if (data.emi_nf && new Date(data.emi_nf) > new Date()) {
      throw new Error('Data de emissão não pode ser futura');
    }

    if (data.previsao_entrega && data.emi_nf && new Date(data.previsao_entrega) < new Date(data.emi_nf)) {
      throw new Error('Data de previsão de entrega não pode ser anterior à emissão');
    }

    // Normalizar dados
    if (data.nome_rep) {
      data.nome_rep = data.nome_rep.trim().toUpperCase();
    }

    // Valores padrão
    data.finalizada = data.finalizada || false;
    data.roteirizada = data.roteirizada || false;
    data.nf_retida = data.nf_retida || false;
    data.ordem = data.ordem || 0;

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar se cliente existe (se fornecido)
    if (data.cliente_id) {
      const cliente = await this.clientesRepository.findById(data.cliente_id);
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }
    }

    // Validar se embarcador existe (se fornecido)
    if (data.embarcador_id) {
      const embarcador = await this.embarcadoresRepository.findById(data.embarcador_id);
      if (!embarcador) {
        throw new Error('Embarcador não encontrado');
      }
    }

    // Validar se transportadora existe (se fornecido)
    if (data.transportadora_id) {
      const transportadora = await this.transportadorasRepository.findById(data.transportadora_id);
      if (!transportadora) {
        throw new Error('Transportadora não encontrada');
      }
    }

    // Validar chave da nota fiscal única (se fornecida)
    if (data.chave_nf) {
      const isUnique = await this.repository.validateUniqueChaveNf(data.chave_nf, id);
      if (!isUnique) {
        throw new Error('Já existe uma nota fiscal com esta chave');
      }
    }

    // Validar chave CTE única (se fornecida)
    if (data.chave_cte) {
      const isUnique = await this.repository.validateUniqueChaveCte(data.chave_cte, id);
      if (!isUnique) {
        throw new Error('Já existe uma nota fiscal com esta chave CTE');
      }
    }

    // Validar se nota não foi finalizada
    const existing = await this.repository.findById(id);
    if (existing && existing.finalizada && data.finalizada === false) {
      throw new Error('Não é possível reabrir uma nota fiscal finalizada');
    }

    // Normalizar dados
    if (data.nome_rep) {
      data.nome_rep = data.nome_rep.trim().toUpperCase();
    }

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    const notaFiscal = await this.repository.findById(id);
    
    if (notaFiscal && notaFiscal.finalizada) {
      throw new Error('Não é possível deletar uma nota fiscal finalizada');
    }

    if (notaFiscal && notaFiscal.romaneio_id) {
      throw new Error('Não é possível deletar nota fiscal associada a romaneio');
    }

    return true;
  }

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Nova nota fiscal criada:', {
      id: record.id,
      nro: record.nro,
      chave_nf: record.chave_nf,
      cliente_id: record.cliente_id,
      transportadora_id: record.transportadora_id,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(record, req) {
    logger.info('Nota fiscal atualizada:', {
      id: record.id,
      nro: record.nro,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após deletar
  async afterDelete(id, req) {
    logger.info('Nota fiscal deletada:', {
      id,
      user_id: req.user?.id
    });

    return true;
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    // Erros específicos de negócio
    if (error.message.includes('Cliente não encontrado')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cliente inválido',
        error: 'Cliente não encontrado no sistema'
      });
    }

    if (error.message.includes('Embarcador não encontrado')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Embarcador inválido',
        error: 'Embarcador não encontrado no sistema'
      });
    }

    if (error.message.includes('Transportadora não encontrada')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Transportadora inválida',
        error: 'Transportadora não encontrada no sistema'
      });
    }

    if (error.message.includes('Já existe uma nota fiscal')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Nota fiscal duplicada',
        error: error.message
      });
    }

    if (error.message.includes('nota fiscal finalizada')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Operação não permitida',
        error: error.message
      });
    }

    if (error.message.includes('associada a romaneio')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Operação não permitida',
        error: 'Nota fiscal está associada a um romaneio'
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = NotasFiscaisController;