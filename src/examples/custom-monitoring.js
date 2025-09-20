// ==========================================
// 5. EXEMPLO DE MONITORAMENTO PERSONALIZADO
// ==========================================
// examples/custom-monitoring.js

/**
 * Exemplo: Sistema de alertas personalizado
 */

const nodemailer = require('nodemailer');

class CustomAlertService {
  constructor(config) {
    this.emailTransporter = nodemailer.createTransporter(config.email);
    this.webhookUrl = config.webhookUrl;
    this.thresholds = config.thresholds;
  }

  // Verificar alertas personalizados
  async checkCustomAlerts(monitoringRepository) {
    const alerts = [];

    // Alerta: Taxa de erro acima do limite
    const errorRate = await this.checkErrorRate(monitoringRepository);
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: `Taxa de erro: ${errorRate}% (limite: ${this.thresholds.errorRate}%)`,
        value: errorRate
      });
    }

    // Alerta: NFs paradas há muito tempo
    const stuckNFs = await this.checkStuckNFs(monitoringRepository);
    if (stuckNFs > this.thresholds.stuckNFs) {
      alerts.push({
        type: 'STUCK_NFS',
        severity: 'WARNING',
        message: `${stuckNFs} NFs paradas há mais de 24h`,
        value: stuckNFs
      });
    }

    // Enviar alertas
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }

    return alerts;
  }

  async checkErrorRate(repository) {
    const stats = await repository.getPerformanceStats({ periodo: 1 });
    const latest = stats[stats.length - 1];
    
    if (!latest || latest.total_logs === 0) return 0;
    
    return (latest.erros / latest.total_logs) * 100;
  }

  async checkStuckNFs(repository) {
    const query = `
      SELECT COUNT(*) as stuck_count
      FROM notas_fiscais 
      WHERE finalizada = false 
        AND created_at < NOW() - INTERVAL '24 hours'
        AND (status_api IS NULL OR status_api != 'consultado_hoje')
    `;
    
    const result = await repository.database.query(query);
    return parseInt(result.rows[0].stuck_count);
  }

  async sendAlert(alert) {
    // Email
    if (this.emailTransporter) {
      await this.emailTransporter.sendMail({
        from: 'alerts@roadrw.com',
        to: 'admin@roadrw.com',
        subject: `[ROAD-RW] Alerta: ${alert.type}`,
        html: `
          <h3>Alerta do Sistema de Integração</h3>
          <p><strong>Tipo:</strong> ${alert.type}</p>
          <p><strong>Severidade:</strong> ${alert.severity}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `
      });
    }

    // Webhook
    if (this.webhookUrl) {
      await axios.post(this.webhookUrl, {
        ...alert,
        timestamp: new Date().toISOString(),
        source: 'road-rw-jobs'
      });
    }
  }
}