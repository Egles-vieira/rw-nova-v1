// controllers/transportadora-codigo-ocorrencia.controller.js
const BaseController = require('./base.controller');
const TransportadoraCodigoOcorrenciaRepository = require('../repositories/transportadora-codigo-ocorrencia.repository');
const TransportadorasRepository = require('../repositories/transportadoras.repository');
const OcorrenciasRepository = require('../repositories/ocorrencias.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class TransportadoraCodigoOcorrenciaController extends BaseController {
  constructor() {
    const repository = new TransportadoraCodigoOcorrenciaRepository();
    super(repository);
    this.transportadorasRepository = new TransportadorasRepository();
    this.ocorrenciasRepository = new OcorrenciasRepository();
  }

  // Sobrescrever list para incluir relacionamentos
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithRelations(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Vínculos transportadora-código recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar vínculos:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por transportadora
  async getByTransportadora(req, res) {
    try {
      const { transportadoraId } = req.params;
      const options = this.buildQueryOptions(req);

      const result = await this.repository.findByTransportadora(transportadoraId, options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Códigos da transportadora recuperados',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao buscar códigos por transportadora:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por código de ocorrência
  async getByCodigoOcorrencia(req, res) {
    try {
      const { codigoOcorrencia } = req.params;
      const options = this.buildQueryOptions(req);

      const result = await this.repository.findByCodigoOcorrencia(codigoOcorrencia, options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Transportadoras do código recuperadas',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao buscar transportadoras por código:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar vínculo específico
  async getVinculo(req, res) {
    try {
      const { transportadoraId, codigoOcorrencia } = req.params;

      const vinculo = await this.repository.findVinculo(transportadoraId, codigoOcorrencia);

      if (!vinculo) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Vínculo não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Vínculo encontrado',
        data: vinculo
      });
    } catch (error) {
      logger.error('Erro ao buscar vínculo específico:', error);
      return this.handleError(res, error);
    }
  }

  // Criar múltiplos vínculos
  async createMultiple(req, res) {
    try {
      const { vinculos } = req.body;

      if (!Array.isArray(vinculos) || vinculos.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Lista de vínculos é obrigatória'
        });
      }

      // Validar cada vínculo
      for (const vinculo of vinculos) {
        await this.beforeCreate(vinculo, req);
      }

      const result = await this.repository.createMultiple(vinculos);

      logger.info('Múltiplos vínculos criados:', {
        quantidade: result.length,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Vínculos criados com sucesso',
        data: result
      });
    } catch (error) {
      logger.error('Erro ao criar múltiplos vínculos:', error);
      return this.handleError(res, error);
    }
  }

  // Deletar vínculos por transportadora
  async deleteByTransportadora(req, res) {
    try {
      const { transportadoraId } = req.params;

      const transportadora = await this.transportadorasRepository.findById(transportadoraId);
      if (!transportadora) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Transportadora não encontrada'
        });
      }

      const result = await this.repository.deleteByTransportadora(transportadoraId);

      logger.info('Vínculos deletados por transportadora:', {
        transportadora_id: transportadoraId,
        quantidade: result.length,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Vínculos deletados com sucesso',
        data: { deletados: result.length }
      });
    } catch (error) {
      logger.error('Erro ao deletar vínculos por transportadora:', error);
      return this.handleError(res, error);
    }
  }

  // Deletar vínculos por código
  async deleteByCodigoOcorrencia(req, res) {
    try {
      const { codigoOcorrencia } = req.params;

      const ocorrencia = await this.ocorrenciasRepository.findByCodigo(codigoOcorrencia);
      if (!ocorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Código de ocorrência não encontrado'
        });
      }

      const result = await this.repository.deleteByCodigoOcorrencia(codigoOcorrencia);

      logger.info('Vínculos deletados por código:', {
        codigo_ocorrencia: codigoOcorrencia,
        quantidade: result.length,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Vínculos deletados com sucesso',
        data: { deletados: result.length }
      });
    } catch (error) {
      logger.error('Erro ao deletar vínculos por código:', error);
      return this.handleError(res, error);
    }
  }

  // Estatísticas
  async getStats(req, res) {
    try {
      const stats = await this.repository.getStats();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar se transportadora existe
    if (data.transportadora_id) {
      const transportadora = await this.transportadorasRepository.findById(data.transportadora_id);
      if (!transportadora) {
        throw new Error('Transportadora não encontrada');
      }
    }

    // Validar se código de ocorrência existe
    if (data.codigo_ocorrencia_codigo) {
      const ocorrencia = await this.ocorrenciasRepository.findByCodigo(data.codigo_ocorrencia_codigo);
      if (!ocorrencia) {
        throw new Error('Código de ocorrência não encontrado');
      }
    }

    // Validar se vínculo já existe
    if (data.transportadora_id && data.codigo_ocorrencia_codigo) {
      const exists = await this.repository.existsVinculo(data.transportadora_id, data.codigo_ocorrencia_codigo);
      if (exists) {
        throw new Error('Vínculo já existe');
      }
    }

    // Validar código
    if (!data.codigo) {
      throw new Error('Código é obrigatório');
    }

    // Normalizar dados
    if (data.descricao) {
      data.descricao = data.descricao.trim();
    }

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Vínculo não encontrado');
    }

    // Validar se transportadora existe (se fornecida)
    if (data.transportadora_id && data.transportadora_id !== existing.transportadora_id) {
      const transportadora = await this.transportadorasRepository.findById(data.transportadora_id);
      if (!transportadora) {
        throw new Error('Transportadora não encontrada');
      }
    }

    // Validar se código de ocorrência existe (se fornecido)
    if (data.codigo_ocorrencia_codigo && data.codigo_ocorrencia_codigo !== existing.codigo_ocorrencia_codigo) {
      const ocorrencia = await this.ocorrenciasRepository.findByCodigo(data.codigo_ocorrencia_codigo);
      if (!ocorrencia) {
        throw new Error('Código de ocorrência não encontrado');
      }

      // Validar se novo vínculo já existe
      const transportadoraId = data.transportadora_id || existing.transportadora_id;
      const exists = await this.repository.existsVinculo(transportadoraId, data.codigo_ocorrencia_codigo);
      if (exists) {
        throw new Error('Vínculo já existe');
      }
    }

    // Normalizar dados
    if (data.descricao) {
      data.descricao = data.descricao.trim();
    }

    return data;
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    if (error.message.includes('Transportadora não encontrada')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Transportadora inválida',
        error: error.message
      });
    }

    if (error.message.includes('Código de ocorrência não encontrado')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Código de ocorrência inválido',
        error: error.message
      });
    }

    if (error.message.includes('Vínculo já existe')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Vínculo duplicado',
        error: error.message
      });
    }

    return super.handleError(res, error);
  }
}

module.exports = TransportadoraCodigoOcorrenciaController;