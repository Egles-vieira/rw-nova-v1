// controllers/nota-fiscal-ocorrencias.controller.js
const BaseController = require('./base.controller');
const OcorrenciasRepository = require('../repositories/ocorrencias.repository');
const NotasFiscaisRepository = require('../repositories/notas-fiscais.repository');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class NotaFiscalOcorrenciasController extends BaseController {
  constructor() {
    const repository = new OcorrenciasRepository();
    super(repository);
    this.notasRepository = new NotasFiscaisRepository();
  }

  // Listar todas as ocorrências de uma nota fiscal
  async getOcorrenciasByNotaFiscal(req, res) {
    try {
      const { nroNf } = req.params;
      const options = this.buildQueryOptions(req);

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Buscar ocorrências da nota fiscal
      const ocorrencias = await this.repository.findByNumeroNF(nroNf);

      // Aplicar paginação se necessário
      const page = parseInt(options.page || 1);
      const limit = parseInt(options.limit || 20);
      const offset = (page - 1) * limit;
      
      const total = ocorrencias.length;
      const paginatedOcorrencias = ocorrencias.slice(offset, offset + limit);

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      };

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Ocorrências da nota fiscal recuperadas com sucesso',
        data: {
          nota_fiscal: {
            numero: nroNf,
            info: notaFiscal[0]
          },
          ocorrencias: paginatedOcorrencias,
          total_ocorrencias: total
        },
        pagination
      });
    } catch (error) {
      logger.error('Erro ao buscar ocorrências por nota fiscal:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar última ocorrência de uma nota fiscal
  async getLastOcorrenciaByNotaFiscal(req, res) {
    try {
      const { nroNf } = req.params;

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Buscar última ocorrência
      const ultimaOcorrencia = await this.repository.getLastOcorrencia(nroNf);

      if (!ultimaOcorrencia) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nenhuma ocorrência encontrada para a nota fiscal ${nroNf}`
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Última ocorrência encontrada',
        data: {
          nota_fiscal: {
            numero: nroNf,
            info: notaFiscal[0]
          },
          ultima_ocorrencia: ultimaOcorrencia
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar última ocorrência por nota fiscal:', error);
      return this.handleError(res, error);
    }
  }

  // Buscar ocorrências de uma nota fiscal por código
  async getOcorrenciasByNotaFiscalAndCodigo(req, res) {
    try {
      const { nroNf, codigo } = req.params;

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Buscar ocorrências específicas
      const ocorrencias = await this.repository.findByNumeroNF(nroNf);
      const ocorrenciasFiltradas = ocorrencias.filter(o => o.codigo == codigo);

      if (ocorrenciasFiltradas.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nenhuma ocorrência encontrada para a nota fiscal ${nroNf} com código ${codigo}`
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Ocorrências encontradas',
        data: {
          nota_fiscal: {
            numero: nroNf,
            info: notaFiscal[0]
          },
          codigo: parseInt(codigo),
          ocorrencias: ocorrenciasFiltradas,
          total: ocorrenciasFiltradas.length
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar ocorrências por nota fiscal e código:', error);
      return this.handleError(res, error);
    }
  }

  // Estatísticas de ocorrências de uma nota fiscal
  async getOcorrenciasStats(req, res) {
    try {
      const { nroNf } = req.params;

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Buscar todas as ocorrências
      const ocorrencias = await this.repository.findByNumeroNF(nroNf);

      if (ocorrencias.length === 0) {
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'Estatísticas calculadas',
          data: {
            nota_fiscal: {
              numero: nroNf,
              info: notaFiscal[0]
            },
            stats: {
              total_ocorrencias: 0,
              primeira_ocorrencia: null,
              ultima_ocorrencia: null,
              status_atual: 'Sem ocorrências',
              finalizadora: false,
              por_codigo: [],
              timeline: []
            }
          }
        });
      }

      // Calcular estatísticas
      const primeiraOcorrencia = ocorrencias[ocorrencias.length - 1]; // Array já vem ordenado DESC
      const ultimaOcorrencia = ocorrencias[0];
      
      // Agrupar por código
      const porCodigo = {};
      ocorrencias.forEach(oc => {
        if (!porCodigo[oc.codigo]) {
          porCodigo[oc.codigo] = {
            codigo: oc.codigo,
            descricao: oc.codigo_descricao || oc.descricao,
            quantidade: 0,
            finalizadora: oc.finalizadora || false
          };
        }
        porCodigo[oc.codigo].quantidade++;
      });

      // Timeline ordenada
      const timeline = ocorrencias.map(oc => ({
        id: oc.id,
        codigo: oc.codigo,
        descricao: oc.descricao,
        dataHoraEvento: oc.dataHoraEvento,
        dataHoraEnvio: oc.dataHoraEnvio,
        finalizadora: oc.finalizadora || false
      })).reverse(); // Inverter para ordem cronológica

      const stats = {
        total_ocorrencias: ocorrencias.length,
        primeira_ocorrencia: {
          data: primeiraOcorrencia.dataHoraEvento || primeiraOcorrencia.dataHoraEnvio,
          codigo: primeiraOcorrencia.codigo,
          descricao: primeiraOcorrencia.descricao
        },
        ultima_ocorrencia: {
          data: ultimaOcorrencia.dataHoraEvento || ultimaOcorrencia.dataHoraEnvio,
          codigo: ultimaOcorrencia.codigo,
          descricao: ultimaOcorrencia.descricao
        },
        status_atual: ultimaOcorrencia.descricao,
        finalizadora: ultimaOcorrencia.finalizadora || false,
        por_codigo: Object.values(porCodigo),
        timeline
      };

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas calculadas com sucesso',
        data: {
          nota_fiscal: {
            numero: nroNf,
            info: notaFiscal[0]
          },
          stats
        }
      });
    } catch (error) {
      logger.error('Erro ao calcular estatísticas de ocorrências:', error);
      return this.handleError(res, error);
    }
  }

  // Criar nova ocorrência para uma nota fiscal
  async createOcorrenciaForNotaFiscal(req, res) {
    try {
      const { nroNf } = req.params;
      const data = req.body;

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Adicionar o número da NF aos dados
      data.nro_nf = parseInt(nroNf);

      // Validar se ocorrência já existe
      if (data.dataHoraEvento) {
        const existente = await this.repository.findOcorrenciaExistente(
          nroNf, 
          data.codigo, 
          data.dataHoraEvento
        );
        
        if (existente) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: 'Ocorrência já existe para esta nota fiscal, código e data/hora'
          });
        }
      }

      // Criar ocorrência
      const ocorrencia = await this.repository.create(data);

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Ocorrência criada com sucesso',
        data: {
          nota_fiscal: {
            numero: nroNf,
            info: notaFiscal[0]
          },
          ocorrencia
        }
      });
    } catch (error) {
      logger.error('Erro ao criar ocorrência para nota fiscal:', error);
      return this.handleError(res, error);
    }
  }

  // Atualizar ocorrência específica
  async updateOcorrencia(req, res) {
    try {
      const { nroNf, ocorrenciaId } = req.params;
      const data = req.body;

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Verificar se a ocorrência existe e pertence à nota fiscal
      const ocorrenciaExistente = await this.repository.findById(ocorrenciaId);
      if (!ocorrenciaExistente) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Ocorrência não encontrada'
        });
      }

      if (ocorrenciaExistente.nro_nf != nroNf) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Ocorrência não pertence à nota fiscal informada'
        });
      }

      // Atualizar dados
      data.updated_at = new Date();
      const ocorrenciaAtualizada = await this.repository.update(ocorrenciaId, data);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Ocorrência atualizada com sucesso',
        data: {
          nota_fiscal: {
            numero: nroNf,
            info: notaFiscal[0]
          },
          ocorrencia: ocorrenciaAtualizada
        }
      });
    } catch (error) {
      logger.error('Erro ao atualizar ocorrência:', error);
      return this.handleError(res, error);
    }
  }

  // Excluir ocorrência específica
  async deleteOcorrencia(req, res) {
    try {
      const { nroNf, ocorrenciaId } = req.params;

      // Verificar se a nota fiscal existe
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: `Nota fiscal ${nroNf} não encontrada`
        });
      }

      // Verificar se a ocorrência existe e pertence à nota fiscal
      const ocorrenciaExistente = await this.repository.findById(ocorrenciaId);
      if (!ocorrenciaExistente) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Ocorrência não encontrada'
        });
      }

      if (ocorrenciaExistente.nro_nf != nroNf) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Ocorrência não pertence à nota fiscal informada'
        });
      }

      // Excluir ocorrência
      await this.repository.delete(ocorrenciaId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Ocorrência excluída com sucesso',
        data: {
          nota_fiscal: {
            numero: nroNf
          },
          ocorrencia_id: ocorrenciaId
        }
      });
    } catch (error) {
      logger.error('Erro ao excluir ocorrência:', error);
      return this.handleError(res, error);
    }
  }
}

module.exports = NotaFiscalOcorrenciasController;