const BaseController = require('./base.controller');
const CodigoOcorrenciasRepository = require('../repositories/codigo-ocorrencias.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class CodigoOcorrenciasController extends BaseController {
  constructor() {
    const repository = new CodigoOcorrenciasRepository();
    super(repository);
  }

  // Buscar por código numérico
  async getByCodigo(req, res) {
    try {
      const { codigo } = req.params;

      const codigoOcorrencia = await this.repository.findByCodigo(parseInt(codigo));

      if (!codigoOcorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Código de ocorrência não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Código de ocorrência encontrado',
        data: codigoOcorrencia
      });
    } catch (error) {
      logger.error('Erro ao buscar código de ocorrência por código:', error);
      return this.handleError(res, error);
    }
  }

  // Listar tipos disponíveis
  async getTipos(req, res) {
    try {
      const tipos = await this.repository.getTipos();
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Tipos de ocorrência recuperados',
        data: tipos
      });
    } catch (error) {
      logger.error('Erro ao buscar tipos de ocorrência:', error);
      return this.handleError(res, error);
    }
  }

  // Listar processos disponíveis
  async getProcessos(req, res) {
    try {
      const processos = await this.repository.getProcessos();
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Processos recuperados',
        data: processos
      });
    } catch (error) {
      logger.error('Erro ao buscar processos:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar se código já existe
    if (data.codigo) {
      const isUnique = await this.repository.validateUniqueCodigo(data.codigo);
      if (!isUnique) {
        throw new Error('Já existe um código de ocorrência com este número');
      }
    }

    // Normalizar dados
    if (data.descricao) {
      data.descricao = data.descricao.trim();
    }

    if (data.tipo) {
      data.tipo = data.tipo.toLowerCase();
    }

    if (data.processo) {
      data.processo = data.processo.toLowerCase();
    }

    // Valores padrão
    data.finalizadora = data.finalizadora || false;
    data.api = data.api !== undefined ? data.api : true;

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar se código já existe (se fornecida)
    if (data.codigo) {
      const isUnique = await this.repository.validateUniqueCodigo(data.codigo, id);
      if (!isUnique) {
        throw new Error('Já existe um código de ocorrência com este número');
      }
    }

    // Normalizar dados
    if (data.descricao) {
      data.descricao = data.descricao.trim();
    }

    if (data.tipo) {
      data.tipo = data.tipo.toLowerCase();
    }

    if (data.processo) {
      data.processo = data.processo.toLowerCase();
    }

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se o código está sendo usado em ocorrências
    const isUsed = await this.repository.isUsedInOcorrencias(id);
    
    if (isUsed) {
      throw new Error('Código de ocorrência está em uso e não pode ser deletado');
    }

    return true;
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    if (error.message.includes('Já existe um código de ocorrência')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Código duplicado',
        error: error.message
      });
    }

    if (error.message.includes('está em uso')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Operação não permitida',
        error: error.message
      });
    }

    return super.handleError(res, error);
  }
}

module.exports = CodigoOcorrenciasController;