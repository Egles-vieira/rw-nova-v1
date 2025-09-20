const BaseController = require('./base.controller');
const EmbarcadoresRepository = require('../repositories/embarcadores.repository');
const { validateCNPJ } = require('../utils/validators');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class EmbarcadoresController extends BaseController {
  constructor() {
    const repository = new EmbarcadoresRepository();
    super(repository);
  }

  // Sobrescrever list para incluir estatísticas
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithStats(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcadores recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar embarcadores:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir estatísticas
  async get(req, res) {
    try {
      const { id } = req.params;
      const embarcador = await this.repository.findWithNotasStats(id);

      if (!embarcador) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Embarcador não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcador encontrado',
        data: embarcador
      });
    } catch (error) {
      logger.error('Erro ao buscar embarcador por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por documento (CNPJ)
  async getByDocumento(req, res) {
    try {
      const { documento } = req.params;

      if (!validateCNPJ(documento)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'CNPJ inválido'
        });
      }

      const embarcador = await this.repository.findByDocumento(documento.replace(/\D/g, ''));

      if (!embarcador) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Embarcador não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcador encontrado',
        data: embarcador
      });
    } catch (error) {
      logger.error('Erro ao buscar embarcador por documento:', error);
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

      const embarcadores = await this.repository.searchByName(searchTerm, parseInt(limit));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: embarcadores
      });
    } catch (error) {
      logger.error('Erro ao buscar embarcadores por nome:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por cidade
  async getByCidade(req, res) {
    try {
      const { cidade } = req.params;

      const embarcadores = await this.repository.findByCidade(cidade);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcadores encontrados',
        data: embarcadores
      });
    } catch (error) {
      logger.error('Erro ao buscar embarcadores por cidade:', error);
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

      const embarcadores = await this.repository.findByUf(uf.toUpperCase());

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcadores encontrados',
        data: embarcadores
      });
    } catch (error) {
      logger.error('Erro ao buscar embarcadores por UF:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar embarcadores com depósitos
  async getWithDepositos(req, res) {
    try {
      const { id } = req.params;
      const embarcador = await this.repository.findWithDepositos(id);

      if (!embarcador) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Embarcador não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcador com depósitos recuperado',
        data: embarcador
      });
    } catch (error) {
      logger.error('Erro ao buscar embarcador com depósitos:', error);
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
      logger.error('Erro ao obter estatísticas de embarcadores:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar CNPJ
    if (!data.documento || !validateCNPJ(data.documento)) {
      throw new Error('CNPJ inválido');
    }

    // Verificar se CNPJ já existe
    const isUnique = await this.repository.validateUniqueDocumento(data.documento.replace(/\D/g, ''));
    if (!isUnique) {
      throw new Error('Já existe um embarcador com este CNPJ');
    }

    // Normalizar dados
    data.documento = data.documento.replace(/\D/g, ''); // Apenas números
    data.nome = data.nome.trim().toUpperCase();
    if (data.uf) data.uf = data.uf.trim().toUpperCase();
    if (data.cidade) data.cidade = data.cidade.trim();
    if (data.bairro) data.bairro = data.bairro.trim();
    if (data.endereco) data.endereco = data.endereco.trim();
    if (data.cep) data.cep = data.cep.replace(/\D/g, '');
    if (data.inscricao_estadual) data.inscricao_estadual = data.inscricao_estadual.trim();
    if (data.cnpj) data.cnpj = data.cnpj.replace(/\D/g, '');

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar CNPJ se fornecido
    if (data.documento) {
      if (!validateCNPJ(data.documento)) {
        throw new Error('CNPJ inválido');
      }

      // Verificar se CNPJ já existe (excluindo o registro atual)
      const isUnique = await this.repository.validateUniqueDocumento(data.documento.replace(/\D/g, ''), id);
      if (!isUnique) {
        throw new Error('Já existe um embarcador com este CNPJ');
      }

      data.documento = data.documento.replace(/\D/g, ''); // Apenas números
    }

    // Normalizar dados
    if (data.nome) data.nome = data.nome.trim().toUpperCase();
    if (data.uf) data.uf = data.uf.trim().toUpperCase();
    if (data.cidade) data.cidade = data.cidade.trim();
    if (data.bairro) data.bairro = data.bairro.trim();
    if (data.endereco) data.endereco = data.endereco.trim();
    if (data.cep) data.cep = data.cep.replace(/\D/g, '');
    if (data.inscricao_estadual) data.inscricao_estadual = data.inscricao_estadual.trim();
    if (data.cnpj) data.cnpj = data.cnpj.replace(/\D/g, '');

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se tem notas fiscais associadas
    const embarcador = await this.repository.findWithNotasStats(id);
    
    if (embarcador && parseInt(embarcador.total_notas) > 0) {
      throw new Error('Não é possível deletar embarcador com notas fiscais associadas');
    }

    return true;
  }

  // Método delete sobrescrito para usar hard delete (já que não temos soft delete)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Embarcador não encontrado'
        });
      }

      // Executar validações antes de deletar
      await this.beforeDelete(id, req);

      await this.repository.delete(id);

      // Executar ações após deletar
      await this.afterDelete(id, req);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Embarcador deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar embarcador:', error);
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

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Novo embarcador criado:', {
      id: record.id,
      nome: record.nome,
      documento: record.documento,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(record, req) {
    logger.info('Embarcador atualizado:', {
      id: record.id,
      nome: record.nome,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após deletar
  async afterDelete(id, req) {
    logger.info('Embarcador deletado:', {
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

    if (error.message.includes('Já existe um embarcador')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'CNPJ já cadastrado',
        error: 'Já existe um embarcador com este CNPJ'
      });
    }

    if (error.message.includes('notas fiscais associadas')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Não é possível deletar',
        error: 'Embarcador possui notas fiscais associadas'
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = EmbarcadoresController;