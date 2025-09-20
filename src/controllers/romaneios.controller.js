const BaseController = require('./base.controller');
const RomaneiosRepository = require('../repositories/romaneios.repository');
const MotoristasRepository = require('../repositories/motoristas.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class RomaneiosController extends BaseController {
  constructor() {
    const repository = new RomaneiosRepository();
    super(repository);
    this.motoristasRepository = new MotoristasRepository();
  }

  // Sobrescrever list para incluir relacionamentos
  async list(req, res) {
    try {
      const options = this.buildQueryOptions(req);
      const result = await this.repository.findAllWithRelations(options);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Romaneios recuperados com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Erro ao listar romaneios:', error);
      return this.handleError(res, error);
    }
  }

  // Sobrescrever get para incluir relacionamentos
  async get(req, res) {
    try {
      const { id } = req.params;
      const romaneio = await this.repository.findWithRelations(id);

      if (!romaneio) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Romaneio encontrado',
        data: romaneio
      });
    } catch (error) {
      logger.error('Erro ao buscar romaneio por ID:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por número
  async getByNumero(req, res) {
    try {
      const { numero } = req.params;

      if (!numero || isNaN(numero)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Número do romaneio inválido'
        });
      }

      const romaneio = await this.repository.findByNumero(parseInt(numero));

      if (!romaneio) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Romaneio encontrado',
        data: romaneio
      });
    } catch (error) {
      logger.error('Erro ao buscar romaneio por número:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por placa do cavalo
  async getByPlacaCavalo(req, res) {
    try {
      const { placa } = req.params;

      if (!placa || placa.length < 7) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Placa inválida'
        });
      }

      const romaneios = await this.repository.findByPlacaCavalo(placa.toUpperCase());

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Romaneios encontrados',
        data: romaneios
      });
    } catch (error) {
      logger.error('Erro ao buscar romaneios por placa do cavalo:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por motorista
  async getByMotorista(req, res) {
    try {
      const { motorista_id } = req.params;

      if (!motorista_id || isNaN(motorista_id)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID do motorista inválido'
        });
      }

      const romaneios = await this.repository.findByMotorista(parseInt(motorista_id));

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Romaneios do motorista encontrados',
        data: romaneios
      });
    } catch (error) {
      logger.error('Erro ao buscar romaneios por motorista:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar por status de roteirização
  async getByRoteirizacao(req, res) {
    try {
      const { status } = req.params;
      
      const validStatus = ['manual', 'automatica', 'otimizada'];
      if (!validStatus.includes(status)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Status de roteirização inválido',
          validValues: validStatus
        });
      }

      const romaneios = await this.repository.findByRoteirizacao(status);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Romaneios encontrados',
        data: romaneios
      });
    } catch (error) {
      logger.error('Erro ao buscar romaneios por roteirização:', error);
      return this.handleError(res, error);
    }
  }

  // Estatísticas dos romaneios
  async getStats(req, res) {
    try {
      const stats = await this.repository.getStats();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas dos romaneios:', error);
      return this.handleError(res, error);
    }
  }

  // Notas fiscais do romaneio
  async getNotasFiscais(req, res) {
    try {
      const { id } = req.params;

      const notasFiscais = await this.repository.findNotasFiscais(id);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notas fiscais do romaneio obtidas com sucesso',
        data: notasFiscais
      });
    } catch (error) {
      logger.error('Erro ao obter notas fiscais do romaneio:', error);
      return this.handleError(res, error);
    }
  }

  // Atualizar rotas do romaneio
  async updateRotas(req, res) {
    try {
      const { id } = req.params;
      const { rotas, markers, maplink_info } = req.body;

      const romaneio = await this.repository.findById(id);
      if (!romaneio) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }

      const updateData = {};
      if (rotas !== undefined) updateData.rotas = rotas;
      if (markers !== undefined) updateData.markers = markers;
      if (maplink_info !== undefined) updateData.maplink_info = maplink_info;

      await this.repository.update(id, updateData);

      logger.info('Rotas do romaneio atualizadas:', {
        id,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Rotas atualizadas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao atualizar rotas do romaneio:', error);
      return this.handleError(res, error);
    }
  }

  // Marcar/desmarcar para roteirizar
  async toggleRoteirizar(req, res) {
    try {
      const { id } = req.params;

      const romaneio = await this.repository.findById(id);
      if (!romaneio) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }

      await this.repository.update(id, { 
        roteirizar: !romaneio.roteirizar 
      });

      logger.info('Status de roteirização atualizado:', {
        id,
        novo_status: !romaneio.roteirizar,
        user_id: req.user?.id
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status de roteirização atualizado com sucesso',
        data: { roteirizar: !romaneio.roteirizar }
      });
    } catch (error) {
      logger.error('Erro ao atualizar status de roteirização:', error);
      return this.handleError(res, error);
    }
  }

  // Validações antes de criar
  async beforeCreate(data, req) {
    // Validar se motorista existe
    if (data.motorista_id) {
      const motorista = await this.motoristasRepository.findById(data.motorista_id);
      if (!motorista) {
        throw new Error('Motorista não encontrado');
      }
    }

    // Validar número único se fornecido
    if (data.numero) {
      const existingRomaneio = await this.repository.findByNumero(data.numero);
      if (existingRomaneio) {
        throw new Error('Já existe um romaneio com este número');
      }
    }

    // Normalizar dados
    if (data.placa_cavalo) {
      data.placa_cavalo = data.placa_cavalo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    if (data.placa_carreta) {
      data.placa_carreta = data.placa_carreta.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    if (data.unidade) data.unidade = data.unidade.trim();
    if (data.doca) data.doca = data.doca.trim();

    // Definir valores padrão
    if (!data.roteirizacao) data.roteirizacao = 'manual';
    if (data.roteirizar === undefined) data.roteirizar = false;

    return data;
  }

  // Validações antes de atualizar
  async beforeUpdate(id, data, req) {
    // Validar motorista se fornecido
    if (data.motorista_id) {
      const motorista = await this.motoristasRepository.findById(data.motorista_id);
      if (!motorista) {
        throw new Error('Motorista não encontrado');
      }
    }

    // Validar número único se fornecido (excluindo o registro atual)
    if (data.numero) {
      const existingRomaneio = await this.repository.findByNumero(data.numero);
      if (existingRomaneio && existingRomaneio.id !== parseInt(id)) {
        throw new Error('Já existe um romaneio com este número');
      }
    }

    // Normalizar dados
    if (data.placa_cavalo) {
      data.placa_cavalo = data.placa_cavalo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    if (data.placa_carreta) {
      data.placa_carreta = data.placa_carreta.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    if (data.unidade) data.unidade = data.unidade.trim();
    if (data.doca) data.doca = data.doca.trim();

    return data;
  }

  // Validações antes de deletar
  async beforeDelete(id, req) {
    // Verificar se há notas fiscais associadas
    const notasFiscais = await this.repository.findNotasFiscais(id);
    if (notasFiscais.length > 0) {
      throw new Error('Não é possível deletar romaneio com notas fiscais associadas');
    }

    return true;
  }

  // Ações após criar
  async afterCreate(record, req) {
    logger.info('Romaneio criado:', {
      id: record.id,
      numero: record.numero,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após atualizar
  async afterUpdate(id, record, req) {
    logger.info('Romaneio atualizado:', {
      id,
      user_id: req.user?.id
    });

    return record;
  }

  // Ações após deletar
  async afterDelete(id, req) {
    logger.info('Romaneio deletado:', {
      id,
      user_id: req.user?.id
    });

    return true;
  }

  // Tratamento de erros específicos
  handleError(res, error) {
    // Erros específicos de negócio
    if (error.message.includes('Motorista não encontrado')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Motorista inválido',
        error: 'Motorista não encontrado no sistema'
      });
    }

    if (error.message.includes('Já existe um romaneio')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Romaneio duplicado',
        error: error.message
      });
    }

    if (error.message.includes('notas fiscais associadas')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Operação não permitida',
        error: 'Romaneio possui notas fiscais associadas'
      });
    }

    // Usar tratamento padrão para outros erros
    return super.handleError(res, error);
  }
}

module.exports = RomaneiosController;