const BaseController = require('./base.controller');
const OcorrenciasRepository = require('../repositories/ocorrencias.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class OcorrenciasController extends BaseController {
  constructor() {
    const repository = new OcorrenciasRepository();
    super(repository);
  }

  // Sobrescrever list para incluir relacionamentos
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithRelations(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Códigos de ocorrências recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar códigos de ocorrências:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir relacionamentos
  async get(req, res) {
    try {
      const { id } = req.params;
      const ocorrencia = await this.repository.findWithRelations(id);

      if (!ocorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Código de ocorrência não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Código de ocorrência encontrado',
        data: ocorrencia
      });
    } catch (error) {
      logger.error('Erro ao buscar código de ocorrência por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por código
  async getByCodigo(req, res) {
    try {
      const { codigo } = req.params;

      if (!codigo || isNaN(codigo)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Código inválido'
        });
      }

      const ocorrencia = await this.repository.findByCodigo(parseInt(codigo));

      if (!ocorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Código de ocorrência não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Código de ocorrência encontrado',
        data: ocorrencia
      });
    } catch (error) {
      logger.error('Erro ao buscar código de ocorrência por código:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por tipo
  async getByTipo(req, res) {
    try {
      const { tipo } = req.params;

      if (!tipo) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Tipo é obrigatório'
        });
      }

      const ocorrencias = await this.repository.findByTipo(tipo);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Códigos de ocorrências encontrados',
        data: ocorrencias
      });
    } catch (error) {
      logger.error('Erro ao buscar códigos de ocorrências por tipo:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por processo
  async getByProcesso(req, res) {
    try {
      const { processo } = req.params;

      if (!processo) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Processo é obrigatório'
        });
      }

      const ocorrencias = await this.repository.findByProcesso(processo);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Códigos de ocorrências encontrados',
        data: ocorrencias
      });
    } catch (error) {
      logger.error('Erro ao buscar códigos de ocorrências por processo:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar finalizadoras
  async getFinalizadoras(req, res) {
    try {
      const ocorrencias = await this.repository.findFinalizadoras();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Códigos de ocorrências finalizadoras',
        data: ocorrencias
      });
    } catch (error) {
      logger.error('Erro ao buscar códigos finalizadores:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar ativas para API
  async getAtivasApi(req, res) {
    try {
      const ocorrencias = await this.repository.findAtivasApi();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Códigos de ocorrências ativas para API',
        data: ocorrencias
      });
    } catch (error) {
      logger.error('Erro ao buscar códigos ativos para API:', error);
      return this.handleError(res, error);
    }
  }

  // Estatísticas dos códigos de ocorrências
  async getStats(req, res) {
    try {
      const stats = await this.repository.getStats();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas dos códigos:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por descrição
  async search(req, res) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      const ocorrencias = await this.repository.searchByDescricao(q, limit);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: ocorrencias
      });
    } catch (error) {
      logger.error('Erro na busca por descrição:', error);
      return this.handleError(res, error);
    }
  }

  // Ativar/desativar para API
  async toggleApi(req, res) {
    try {
      const { id } = req.params;

      const ocorrencia = await this.repository.findById(id);
      if (!ocorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Código de ocorrência não encontrado'
        });
      }

      await this.repository.update(id, { 
        api: !ocorrencia.api 
      });

      logger.info('Status API atualizado:', {
        id,
        novo_status: !ocorrencia.api,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status da API atualizado com sucesso',
        data: { api: !ocorrencia.api }
      });
    } catch (error) {
      logger.error('Erro ao atualizar status da API:', error);
      return this.handleError(res, error);
    }
  }

  // Marcar/desmarcar como finalizadora
  async toggleFinalizadora(req, res) {
    try {
      const { id } = req.params;

      const ocorrencia = await this.repository.findById(id);
      if (!ocorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Código de ocorrência não encontrado'
        });
      }

      await this.repository.update(id, { 
        finalizadora: !ocorrencia.finalizadora 
      });

      logger.info('Status finalizadora atualizado:', {
        id,
        novo_status: !ocorrencia.finalizadora,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status finalizadora atualizado com sucesso',
        data: { finalizadora: !ocorrencia.finalizadora }
      });
    } catch (error) {
      logger.error('Erro ao atualizar status finalizadora:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar código único
    if (data.codigo) {
      const existingOcorrencia = await this.repository.findByCodigo(data.codigo);
      if (existingOcorrencia) {
        throw new Error('Já existe um código de ocorrência com este número');
      }
    }

    // Normalizar dados
    if (data.descricao) data.descricao = data.descricao.trim();
    if (data.tipo) data.tipo = data.tipo.trim().toLowerCase();
    if (data.processo) data.processo = data.processo.trim().toLowerCase();

    // Definir valores padrão
    if (data.finalizadora === undefined) data.finalizadora = false;
    if (data.api === undefined) data.api = true;

    // Validar valores de tipo
    const tiposValidos = ['entrega', 'coleta', 'ocorrencia', 'status', 'informativo'];
    if (data.tipo && !tiposValidos.includes(data.tipo)) {
      throw new Error(`Tipo deve ser um dos seguintes: ${tiposValidos.join(', ')}`);
    }

    // Validar valores de processo
    const processosValidos = ['transporte', 'entrega', 'coleta', 'finalizacao', 'cancelamento', 'informativo'];
    if (data.processo && !processosValidos.includes(data.processo)) {
      throw new Error(`Processo deve ser um dos seguintes: ${processosValidos.join(', ')}`);
    }

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar código único se fornecido (excluindo o registro atual)
    if (data.codigo) {
      const existingOcorrencia = await this.repository.findByCodigo(data.codigo);
      if (existingOcorrencia && existingOcorrencia.id !== parseInt(id)) {
        throw new Error('Já existe um código de ocorrência com este número');
      }
    }

    // Normalizar dados
    if (data.descricao) data.descricao = data.descricao.trim();
    if (data.tipo) data.tipo = data.tipo.trim().toLowerCase();
    if (data.processo) data.processo = data.processo.trim().toLowerCase();

    // Validar valores de tipo
    const tiposValidos = ['entrega', 'coleta', 'ocorrencia', 'status', 'informativo'];
    if (data.tipo && !tiposValidos.includes(data.tipo)) {
      throw new Error(`Tipo deve ser um dos seguintes: ${tiposValidos.join(', ')}`);
    }

    // Validar valores de processo
    const processosValidos = ['transporte', 'entrega', 'coleta', 'finalizacao', 'cancelamento', 'informativo'];
    if (data.processo && !processosValidos.includes(data.processo)) {
      throw new Error(`Processo deve ser um dos seguintes: ${processosValidos.join(', ')}`);
    }

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se código está sendo usado em transportadoras
    const transportadorasVinculadas = await this.repository.findTransportadorasVinculadas(id);
    if (transportadorasVinculadas.length > 0) {
      throw new Error('Não é possível deletar código que está vinculado a transportadoras');
    }

    return true;
  }

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Código de ocorrência criado:', {
      id: record.id,
      codigo: record.codigo,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(id, record, req) {
    logger.info('Código de ocorrência atualizado:', {
      id,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após deletar
  async afterDelete(id, req) {
    logger.info('Código de ocorrência deletado:', {
      id,
      user_id: req.user?.id
    });

    return true;
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    // Erros específicos de negócio
    if (error.message.includes('Já existe um código')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Código duplicado',
        error: error.message
      });
    }

    if (error.message.includes('Tipo deve ser um dos seguintes')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Tipo inválido',
        error: error.message
      });
    }

    if (error.message.includes('Processo deve ser um dos seguintes')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Processo inválido',
        error: error.message
      });
    }

    if (error.message.includes('vinculado a transportadoras')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Operação não permitida',
        error: 'Código está vinculado a transportadoras'
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = OcorrenciasController;