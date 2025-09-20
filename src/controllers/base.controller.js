const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class BaseController {
  constructor(repository) {
    this.repository = repository;
  }

  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAll(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Registros recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error(`Erro ao listar ${this.repository.tableName}:`, error);
      return this.handleError(res, error);
    }
  }

  async get(req, res) {
    try {
      const { id } = req.params;
      const record = await this.repository.findById(id);

      if (!record) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Registro não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Registro encontrado',
        data: record
      });
    } catch (error) {
      logger.error(`Erro ao buscar ${this.repository.tableName} por ID:`, error);
      return this.handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const data = this.sanitizeData(req.body);
      const record = await this.repository.create(data);

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Registro criado com sucesso',
        data: record
      });
    } catch (error) {
      logger.error(`Erro ao criar ${this.repository.tableName}:`, error);
      return this.handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = this.sanitizeData(req.body);

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Registro não encontrado'
        });
      }

      const record = await this.repository.update(id, data);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Registro atualizado com sucesso',
        data: record
      });
    } catch (error) {
      logger.error(`Erro ao atualizar ${this.repository.tableName}:`, error);
      return this.handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const existing = await this.repository.findById(id);
      if (!existing) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Registro não encontrado'
        });
      }

      await this.repository.delete(id);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Registro deletado com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao deletar ${this.repository.tableName}:`, error);
      return this.handleError(res, error);
    }
  }

  async restore(req, res) {
    try {
      const { id } = req.params;

      const record = await this.repository.restore(id);
      if (!record) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Registro não encontrado ou não pode ser restaurado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Registro restaurado com sucesso',
        data: record
      });
    } catch (error) {
      logger.error(`Erro ao restaurar ${this.repository.tableName}:`, error);
      return this.handleError(res, error);
    }
  }

  buildQueryOptions(req) {
    const {
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'desc',
      ...filters
    } = req.query;

    const excludeParams = ['page', 'limit', 'orderBy', 'orderDirection'];
    const cleanFilters = Object.keys(filters)
      .filter(key => !excludeParams.includes(key) && filters[key] !== '')
      .reduce((obj, key) => {
        obj[key] = filters[key];
        return obj;
      }, {});

    return {
      page: parseInt(page),
      limit: parseInt(limit),
      orderBy,
      orderDirection: orderDirection.toUpperCase(),
      filters: cleanFilters
    };
  }

  sanitizeData(data) {
    const excludeFields = ['id', 'created_at', 'updated_at', 'deleted_at'];
    
    return Object.keys(data)
      .filter(key => !excludeFields.includes(key))
      .reduce((obj, key) => {
        if (typeof data[key] === 'string') {
          obj[key] = data[key].trim();
        } else {
          obj[key] = data[key];
        }
        return obj;
      }, {});
  }

  handleError(res, error) {
    if (error.code === '23505') {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Registro duplicado'
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

module.exports = BaseController;