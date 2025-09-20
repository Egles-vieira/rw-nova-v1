// ==========================================
// 2. MONITORING CONTROLLER
// ==========================================
// backend/src/controllers/monitoring.controller.js

const BaseController = require('./base.controller');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');

class MonitoringController extends BaseController {
  constructor(repository) {
    super(repository);
  }

  // Dashboard principal
  async getDashboard(req, res) {
    try {
      const { periodo = 7 } = req.query; // dias

      const dashboard = await this.repository.getDashboardData({
        periodo: parseInt(periodo)
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Dashboard recuperado com sucesso',
        data: dashboard
      });
    } catch (error) {
      logger.error('Erro ao carregar dashboard:', error);
      return this.handleError(res, error);
    }
  }

  // Métricas por transportadora
  async getTransportadoraMetrics(req, res) {
    try {
      const { transportadoraId } = req.params;
      const { periodo = 30 } = req.query;

      if (!transportadoraId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID da transportadora é obrigatório'
        });
      }

      const metrics = await this.repository.getTransportadoraMetrics({
        transportadoraId: parseInt(transportadoraId),
        periodo: parseInt(periodo)
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Métricas recuperadas com sucesso',
        data: metrics
      });
    } catch (error) {
      logger.error('Erro ao buscar métricas da transportadora:', error);
      return this.handleError(res, error);
    }
  }

  // Estatísticas de performance
  async getPerformanceStats(req, res) {
    try {
      const { periodo = 7, agrupamento = 'dia' } = req.query;

      const stats = await this.repository.getPerformanceStats({
        periodo: parseInt(periodo),
        agrupamento
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Estatísticas de performance recuperadas',
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de performance:', error);
      return this.handleError(res, error);
    }
  }

  // Relatório de saúde das integrações
  async getHealthReport(req, res) {
    try {
      const health = await this.repository.getIntegrationsHealth();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Relatório de saúde recuperado',
        data: health
      });
    } catch (error) {
      logger.error('Erro ao gerar relatório de saúde:', error);
      return this.handleError(res, error);
    }
  }

  // Logs com filtros avançados
  async getLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        integracao,
        nivel,
        dataInicio,
        dataFim,
        nro,
        busca
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        integracao,
        nivel,
        dataInicio: dataInicio ? new Date(dataInicio) : null,
        dataFim: dataFim ? new Date(dataFim) : null,
        nro: nro ? parseInt(nro) : null,
        busca
      };

      const logs = await this.repository.getLogsWithFilters(filters);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logs recuperados com sucesso',
        data: logs
      });
    } catch (error) {
      logger.error('Erro ao buscar logs:', error);
      return this.handleError(res, error);
    }
  }

  // Alertas ativos
  async getActiveAlerts(req, res) {
    try {
      const alerts = await this.repository.getActiveAlerts();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Alertas ativos recuperados',
        data: alerts
      });
    } catch (error) {
      logger.error('Erro ao buscar alertas:', error);
      return this.handleError(res, error);
    }
  }

  // Resumo de NFs por status
  async getNFStatusSummary(req, res) {
    try {
      const { transportadoraId, periodo = 30 } = req.query;

      const summary = await this.repository.getNFStatusSummary({
        transportadoraId: transportadoraId ? parseInt(transportadoraId) : null,
        periodo: parseInt(periodo)
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Resumo de status recuperado',
        data: summary
      });
    } catch (error) {
      logger.error('Erro ao buscar resumo de status:', error);
      return this.handleError(res, error);
    }
  }

  // Exportar relatório
  async exportReport(req, res) {
    try {
      const {
        tipo = 'performance',
        formato = 'json',
        periodo = 30,
        transportadoraId
      } = req.query;

      const reportData = await this.repository.generateReport({
        tipo,
        periodo: parseInt(periodo),
        transportadoraId: transportadoraId ? parseInt(transportadoraId) : null
      });

      // Definir headers baseado no formato
      if (formato === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo}_${Date.now()}.csv`);
        
        // Converter para CSV (implementação básica)
        const csv = this.convertToCSV(reportData);
        return res.send(csv);
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Relatório gerado com sucesso',
        data: reportData
      });
    } catch (error) {
      logger.error('Erro ao exportar relatório:', error);
      return this.handleError(res, error);
    }
  }

  // Configurações de monitoramento
  async getMonitoringConfig(req, res) {
    try {
      const config = await this.repository.getMonitoringConfig();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Configurações recuperadas',
        data: config
      });
    } catch (error) {
      logger.error('Erro ao buscar configurações:', error);
      return this.handleError(res, error);
    }
  }

  // Atualizar configurações de monitoramento
  async updateMonitoringConfig(req, res) {
    try {
      const config = req.body;

      const updated = await this.repository.updateMonitoringConfig(config);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        data: updated
      });
    } catch (error) {
      logger.error('Erro ao atualizar configurações:', error);
      return this.handleError(res, error);
    }
  }

  // Helper para converter dados para CSV
  convertToCSV(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escapar aspas e vírgulas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }
}

module.exports = MonitoringController;