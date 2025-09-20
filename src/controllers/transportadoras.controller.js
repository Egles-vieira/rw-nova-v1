const BaseController = require('./base.controller');
const TransportadorasRepository = require('../repositories/transportadoras.repository');
const { validateCNPJ } = require('../utils/validators');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class TransportadorasController extends BaseController {
  constructor() {
    const repository = new TransportadorasRepository();
    super(repository);
  }

  // Sobrescrever list para incluir estatísticas
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithStats(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Transportadoras recuperadas com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar transportadoras:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir estatísticas
  async get(req, res) {
    try {
      const { id } = req.params;
      const transportadora = await this.repository.findWithRomaneiosCount(id);

      if (!transportadora) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Transportadora não encontrada'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Transportadora encontrada',
        data: transportadora
      });
    } catch (error) {
      logger.error('Erro ao buscar transportadora por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por CNPJ
  async getByCnpj(req, res) {
    try {
      const { cnpj } = req.params;

      if (!validateCNPJ(cnpj)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'CNPJ inválido'
        });
      }

      const transportadora = await this.repository.findByCnpj(cnpj);

      if (!transportadora) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Transportadora não encontrada'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Transportadora encontrada',
        data: transportadora
      });
    } catch (error) {
      logger.error('Erro ao buscar transportadora por CNPJ:', error);
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

      const transportadoras = await this.repository.searchByName(searchTerm, parseInt(limit));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: transportadoras
      });
    } catch (error) {
      logger.error('Erro ao buscar transportadoras por nome:', error);
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

      const transportadoras = await this.repository.findByUf(uf.toUpperCase());

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Transportadoras encontradas',
        data: transportadoras
      });
    } catch (error) {
      logger.error('Erro ao buscar transportadoras por UF:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar transportadoras para integração
  async getForIntegration(req, res) {
    try {
      const transportadoras = await this.repository.findActiveForIntegration();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Transportadoras para integração recuperadas',
        data: transportadoras
      });
    } catch (error) {
      logger.error('Erro ao buscar transportadoras para integração:', error);
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
      logger.error('Erro ao obter estatísticas de transportadoras:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar CNPJ
    if (!data.cnpj || !validateCNPJ(data.cnpj)) {
      throw new Error('CNPJ inválido');
    }

    // Verificar se CNPJ já existe
    const isUnique = await this.repository.validateUniqueCnpj(data.cnpj);
    if (!isUnique) {
      throw new Error('Já existe uma transportadora com este CNPJ');
    }

    // Normalizar dados
    data.cnpj = data.cnpj.replace(/\D/g, ''); // Apenas números
    data.nome = data.nome.trim().toUpperCase();
    data.uf = data.uf?.trim().toUpperCase();
    data.municipio = data.municipio?.trim();

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar CNPJ se fornecido
    if (data.cnpj) {
      if (!validateCNPJ(data.cnpj)) {
        throw new Error('CNPJ inválido');
      }

      // Verificar se CNPJ já existe (excluindo o registro atual)
      const isUnique = await this.repository.validateUniqueCnpj(data.cnpj, id);
      if (!isUnique) {
        throw new Error('Já existe uma transportadora com este CNPJ');
      }

      data.cnpj = data.cnpj.replace(/\D/g, ''); // Apenas números
    }

    // Normalizar dados
    if (data.nome) {
      data.nome = data.nome.trim().toUpperCase();
    }
    if (data.uf) {
      data.uf = data.uf.trim().toUpperCase();
    }
    if (data.municipio) {
      data.municipio = data.municipio.trim();
    }

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se tem romaneios associados
    const transportadora = await this.repository.findWithRomaneiosCount(id);
    
    if (transportadora && parseInt(transportadora.total_romaneios) > 0) {
      throw new Error('Não é possível deletar transportadora com romaneios associados');
    }

    return true;
  }

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Nova transportadora criada:', {
      id: record.id,
      nome: record.nome,
      cnpj: record.cnpj,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(record, req) {
    logger.info('Transportadora atualizada:', {
      id: record.id,
      nome: record.nome,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após deletar
  async afterDelete(id, req) {
    logger.info('Transportadora deletada:', {
      id,
      user_id: req.user?.id
    });

    return true;
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    // Erros específicos de negócio
    if (error.message.includes('CNPJ inválido')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'CNPJ inválido',
        error: 'Formato de CNPJ incorreto'
      });
    }

    if (error.message.includes('Já existe uma transportadora')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'CNPJ já cadastrado',
        error: 'Já existe uma transportadora com este CNPJ'
      });
    }

    if (error.message.includes('romaneios associados')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Não é possível deletar',
        error: 'Transportadora possui romaneios associados'
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = TransportadorasController;