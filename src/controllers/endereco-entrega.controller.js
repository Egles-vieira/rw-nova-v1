const BaseController = require('./base.controller');
const { EnderecoEntregaRepository } = require('../repositories/endereco-entrega.repository');
const ClientesRepository = require('../repositories/clientes.repository');
const RestricaoLogisticaRepository = require('../repositories/restricao-logistica.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class EnderecoEntregaController extends BaseController {
  constructor() {
    const repository = new EnderecoEntregaRepository();
    super(repository);
    this.clientesRepository = new ClientesRepository();
    this.restricaoLogisticaRepository = new RestricaoLogisticaRepository();
  }

  // Sobrescrever list para usar o padrão correto
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAll(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Endereços de entrega recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar endereços de entrega:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir relacionamentos
  async get(req, res) {
    try {
      const { id } = req.params;
      const endereco = await this.repository.findWithRelations(id);

      if (!endereco) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Endereço de entrega não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Endereço de entrega encontrado',
        data: endereco
      });
    } catch (error) {
      logger.error('Erro ao buscar endereço de entrega por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar endereços por cliente
  async getByCliente(req, res) {
    try {
      const { clienteId } = req.params;
      
      const enderecos = await this.repository.findByCliente(clienteId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Endereços de entrega do cliente recuperados',
        data: enderecos
      });
    } catch (error) {
      logger.error('Erro ao buscar endereços por cliente:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar endereços por cidade e UF
  async getByCidadeUf(req, res) {
    try {
      const { cidade, uf } = req.query;

      if (!cidade || !uf) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Cidade e UF são obrigatórios'
        });
      }

      const enderecos = await this.repository.findByCidadeUf(cidade, uf);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Endereços de entrega encontrados',
        data: enderecos
      });
    } catch (error) {
      logger.error('Erro ao buscar endereços por cidade e UF:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar endereços com restrição
  async getComRestricao(req, res) {
    try {
      const enderecos = await this.repository.findComRestricao();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Endereços com restrição recuperados',
        data: enderecos
      });
    } catch (error) {
      logger.error('Erro ao buscar endereços com restrição:', error);
      return this.handleError(res, error);
    }
  }

  // Atualizar coordenadas
  async updateCoordenadas(req, res) {
    try {
      const { id } = req.params;
      const { lat, lon } = req.body;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Endereço de entrega não encontrado'
        });
      }

      const endereco = await this.repository.updateCoordenadas(id, lat, lon);

      logger.info('Coordenadas do endereço atualizadas:', {
        id,
        lat,
        lon,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Coordenadas atualizadas com sucesso',
        data: endereco
      });
    } catch (error) {
      logger.error('Erro ao atualizar coordenadas:', error);
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

    // Validar se restrição logística existe (se fornecida)
    if (data.restricao_logistica_id) {
      const restricao = await this.restricaoLogisticaRepository.findById(data.restricao_logistica_id);
      if (!restricao) {
        throw new Error('Restrição logística não encontrada');
      }
    }

    // Validar endereço único para o cliente
    const isUnique = await this.repository.validateUniqueEndereco(
      data.cliente_id,
      data.endereco,
      data.cidade,
      data.uf
    );
    
    if (!isUnique) {
      throw new Error('Já existe um endereço com estas informações para este cliente');
    }

    // Normalizar dados
    if (data.uf) {
      data.uf = data.uf.toUpperCase();
    }

    if (data.cep) {
      data.cep = data.cep.replace(/\D/g, '');
    }

    // Gerar endereço completo
    data.endereco_completo = `${data.endereco}, ${data.bairro}, ${data.cidade} - ${data.uf}, ${data.cep}`;

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    const existing = await this.repository.findById(id);
    
    // Validar se cliente existe (se fornecido)
    if (data.cliente_id && data.cliente_id !== existing.cliente_id) {
      const cliente = await this.clientesRepository.findById(data.cliente_id);
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }
    }

    // Validar se restrição logística existe (se fornecida)
    if (data.restricao_logistica_id) {
      const restricao = await this.restricaoLogisticaRepository.findById(data.restricao_logistica_id);
      if (!restricao) {
        throw new Error('Restrição logística não encontrada');
      }
    }

    // Validar endereço único para o cliente (se dados relevantes foram alterados)
    if (data.endereco || data.cidade || data.uf) {
      const clienteId = data.cliente_id || existing.cliente_id;
      const endereco = data.endereco || existing.endereco;
      const cidade = data.cidade || existing.cidade;
      const uf = data.uf || existing.uf;

      const isUnique = await this.repository.validateUniqueEndereco(
        clienteId,
        endereco,
        cidade,
        uf,
        id
      );
      
      if (!isUnique) {
        throw new Error('Já existe um endereço com estas informações para este cliente');
      }
    }

    // Normalizar dados
    if (data.uf) {
      data.uf = data.uf.toUpperCase();
    }

    if (data.cep) {
      data.cep = data.cep.replace(/\D/g, '');
    }

    // Atualizar endereço completo se algum campo relevante foi alterado
    if (data.endereco || data.bairro || data.cidade || data.uf || data.cep) {
      const finalEndereco = data.endereco || existing.endereco;
      const finalBairro = data.bairro || existing.bairro;
      const finalCidade = data.cidade || existing.cidade;
      const finalUf = data.uf || existing.uf;
      const finalCep = data.cep || existing.cep;

      data.endereco_completo = `${finalEndereco}, ${finalBairro}, ${finalCidade} - ${finalUf}, ${finalCep}`;
    }

    return data;
  }

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Novo endereço de entrega criado:', {
      id: record.id,
      cliente_id: record.cliente_id,
      cidade: record.cidade,
      uf: record.uf,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(record, req) {
    logger.info('Endereço de entrega atualizado:', {
      id: record.id,
      cliente_id: record.cliente_id,
      user_id: req.user?.id
    });

    return record;
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

    if (error.message.includes('Restrição logística não encontrada')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Restrição logística inválida',
        error: 'Restrição logística não encontrada no sistema'
      });
    }

    if (error.message.includes('Já existe um endereço')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Endereço duplicado',
        error: error.message
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = EnderecoEntregaController;