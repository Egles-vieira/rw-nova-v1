const BaseController = require('./base.controller');
const MotoristasRepository = require('../repositories/motoristas.repository');
const { validateCPF, validateEmail } = require('../utils/validators');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class MotoristasController extends BaseController {
  constructor() {
    const repository = new MotoristasRepository();
    super(repository);
  }

  // Sobrescrever list para incluir estatísticas
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithStats(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motoristas recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar motoristas:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir estatísticas
  async get(req, res) {
    try {
      const { id } = req.params;
      const motorista = await this.repository.findWithRomaneiosCount(id);

      if (!motorista) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motorista encontrado',
        data: motorista
      });
    } catch (error) {
      logger.error('Erro ao buscar motorista por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por CPF
  async getByCpf(req, res) {
    try {
      const { cpf } = req.params;

      if (!validateCPF(cpf)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'CPF inválido'
        });
      }

      const motorista = await this.repository.findByCpf(cpf);

      if (!motorista) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motorista encontrado',
        data: motorista
      });
    } catch (error) {
      logger.error('Erro ao buscar motorista por CPF:', error);
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

      const motoristas = await this.repository.searchByName(searchTerm, parseInt(limit));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: motoristas
      });
    } catch (error) {
      logger.error('Erro ao buscar motoristas por nome:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por cidade
  async getByCidade(req, res) {
    try {
      const { cidade } = req.params;

      if (!cidade || cidade.length < 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Cidade deve ter pelo menos 2 caracteres'
        });
      }

      const motoristas = await this.repository.findByCidade(cidade);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motoristas encontrados',
        data: motoristas
      });
    } catch (error) {
      logger.error('Erro ao buscar motoristas por cidade:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar motoristas ativos para mensagens
  async getActiveForMessages(req, res) {
    try {
      const motoristas = await this.repository.findActiveForMessages();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motoristas ativos para mensagens recuperados',
        data: motoristas
      });
    } catch (error) {
      logger.error('Erro ao buscar motoristas ativos para mensagens:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar com jornada de trabalho
  async getWithJornada(req, res) {
    try {
      const { id } = req.params;
      const motorista = await this.repository.findWithJornada(id);

      if (!motorista) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motorista com jornada encontrado',
        data: motorista
      });
    } catch (error) {
      logger.error('Erro ao buscar motorista com jornada:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar com informações de legislação
  async getWithLegislacao(req, res) {
    try {
      const { id } = req.params;
      const motorista = await this.repository.findWithLegislacao(id);

      if (!motorista) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motorista com legislação encontrado',
        data: motorista
      });
    } catch (error) {
      logger.error('Erro ao buscar motorista com legislação:', error);
      return this.handleError(res, error);
    }
  }

  // Listar legislações disponíveis
  async getLegislacoes(req, res) {
    try {
      const legislacoes = await this.repository.findAvailableLegislacoes();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Legislações recuperadas com sucesso',
        data: legislacoes
      });
    } catch (error) {
      logger.error('Erro ao obter legislações:', error);
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
      logger.error('Erro ao obter estatísticas de motoristas:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar CPF
    if (!data.cpf || !validateCPF(data.cpf)) {
      throw new Error('CPF inválido');
    }

    // Verificar se CPF já existe
    const isUniqueCpf = await this.repository.validateUniqueCpf(data.cpf);
    if (!isUniqueCpf) {
      throw new Error('Já existe um motorista com este CPF');
    }

    // Validar email se fornecido
    if (data.email) {
      if (!validateEmail(data.email)) {
        throw new Error('Email inválido');
      }

      const isUniqueEmail = await this.repository.validateUniqueEmail(data.email);
      if (!isUniqueEmail) {
        throw new Error('Já existe um motorista com este email');
      }
    }

    // Validar legislacao_id se fornecido
    if (data.legislacao_id) {
      const legislacaoExists = await this.repository.validateLegislacaoExists(data.legislacao_id);
      if (!legislacaoExists) {
        throw new Error('Legislação não encontrada');
      }
    }

    // Normalizar dados
    data.cpf = data.cpf.replace(/\D/g, ''); // Apenas números
    data.nome = data.nome.trim().toUpperCase();
    if (data.sobrenome) {
      data.sobrenome = data.sobrenome.trim().toUpperCase();
    }
    if (data.email) {
      data.email = data.email.toLowerCase().trim();
    }
    if (data.estado) {
      data.estado = data.estado.trim().toUpperCase();
    }
    if (data.cidade) {
      data.cidade = data.cidade.trim();
    }
    if (data.cep) {
      data.cep = data.cep.replace(/\D/g, ''); // Apenas números
    }

    // Garantir valores default
    if (data.send_mensagem === undefined) {
      data.send_mensagem = true;
    }

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar CPF se fornecido
    if (data.cpf) {
      if (!validateCPF(data.cpf)) {
        throw new Error('CPF inválido');
      }

      // Verificar se CPF já existe (excluindo o registro atual)
      const isUniqueCpf = await this.repository.validateUniqueCpf(data.cpf, id);
      if (!isUniqueCpf) {
        throw new Error('Já existe um motorista com este CPF');
      }

      data.cpf = data.cpf.replace(/\D/g, ''); // Apenas números
    }

    // Validar email se fornecido
    if (data.email) {
      if (!validateEmail(data.email)) {
        throw new Error('Email inválido');
      }

      const isUniqueEmail = await this.repository.validateUniqueEmail(data.email, id);
      if (!isUniqueEmail) {
        throw new Error('Já existe um motorista com este email');
      }

      data.email = data.email.toLowerCase().trim();
    }

    // Validar legislacao_id se fornecido
    if (data.legislacao_id) {
      const legislacaoExists = await this.repository.validateLegislacaoExists(data.legislacao_id);
      if (!legislacaoExists) {
        throw new Error('Legislação não encontrada');
      }
    }

    // Normalizar dados
    if (data.nome) {
      data.nome = data.nome.trim().toUpperCase();
    }
    if (data.sobrenome) {
      data.sobrenome = data.sobrenome.trim().toUpperCase();
    }
    if (data.estado) {
      data.estado = data.estado.trim().toUpperCase();
    }
    if (data.cidade) {
      data.cidade = data.cidade.trim();
    }
    if (data.cep) {
      data.cep = data.cep.replace(/\D/g, ''); // Apenas números
    }

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se tem romaneios associados
    const motorista = await this.repository.findWithRomaneiosCount(id);
    
    if (motorista && parseInt(motorista.total_romaneios) > 0) {
      throw new Error('Não é possível deletar motorista com romaneios associados');
    }

    return true;
  }

  // Sobrescrever create para incluir validações
  async create(req, res) {
    try {
      let data = this.sanitizeData(req.body);
      
      // Executar validações antes de criar
      data = await this.beforeCreate(data, req);
      
      const record = await this.repository.create(data);

      logger.info('Novo motorista criado:', {
        id: record.id,
        nome: record.nome,
        cpf: record.cpf,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Motorista criado com sucesso',
        data: record
      });
    } catch (error) {
      logger.error('Erro ao criar motorista:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever update para incluir validações
  async update(req, res) {
    try {
      const { id } = req.params;
      let data = this.sanitizeData(req.body);

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      // Executar validações antes de atualizar
      data = await this.beforeUpdate(id, data, req);

      const record = await this.repository.update(id, data);

      logger.info('Motorista atualizado:', {
        id: record.id,
        nome: record.nome,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motorista atualizado com sucesso',
        data: record
      });
    } catch (error) {
      logger.error('Erro ao atualizar motorista:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever delete para incluir validações
  async delete(req, res) {
    try {
      const { id } = req.params;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      // Executar validações antes de deletar
      await this.beforeDelete(id, req);

      await this.repository.delete(id);

      logger.info('Motorista deletado:', {
        id,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Motorista deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar motorista:', error);
      return this.handleError(res, error);
    }
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    // Erros específicos de negócio
    if (error.message.includes('CPF inválido')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'CPF inválido',
        error: 'Formato de CPF incorreto'
      });
    }

    if (error.message.includes('Já existe um motorista com este CPF')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'CPF já cadastrado',
        error: 'Já existe um motorista com este CPF'
      });
    }

    if (error.message.includes('Email inválido')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email inválido',
        error: 'Formato de email incorreto'
      });
    }

    if (error.message.includes('Já existe um motorista com este email')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Email já cadastrado',
        error: 'Já existe um motorista com este email'
      });
    }

    if (error.message.includes('Legislação não encontrada')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Legislação não encontrada',
        error: 'O ID da legislação fornecido não existe. Use GET /api/motoristas/legislacoes para ver as opções disponíveis'
      });
    }

    if (error.message.includes('romaneios associados')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Não é possível deletar',
        error: 'Motorista possui romaneios associados'
      });
    }

    // Erros de foreign key constraint
    if (error.code === '23503') {
      if (error.constraint === 'motoristas_legislacao_id_foreign') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Legislação não encontrada',
          error: 'O ID da legislação fornecido não existe. Use GET /api/motoristas/legislacoes para ver as opções disponíveis'
        });
      }
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = MotoristasController;