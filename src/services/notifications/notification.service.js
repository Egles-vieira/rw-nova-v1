// ==========================================
// 1. SISTEMA DE NOTIFICAÇÕES AVANÇADO
// ==========================================
// backend/src/services/notifications/notification.service.js

const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../../config/logger');

class NotificationService {
  constructor() {
    this.emailTransporter = this.setupEmailTransporter();
    this.webhookConfig = this.loadWebhookConfig();
  }

  setupEmailTransporter() {
    if (!process.env.EMAIL_HOST) {
      return null;
    }

    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  loadWebhookConfig() {
    return {
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL,
      teams: process.env.TEAMS_WEBHOOK_URL,
      custom: process.env.CUSTOM_WEBHOOK_URL
    };
  }

  // Notificar sobre erro crítico nas APIs externas
  async notifyError(error, context = {}) {
    const message = {
      type: 'error',
      title: 'Erro Crítico - APIs Externas',
      description: error.message,
      context: {
        timestamp: new Date().toISOString(),
        integracao: context.integracao,
        operacao: context.operacao,
        ip: context.ip,
        ...context
      }
    };

    await Promise.allSettled([
      this.sendEmail(message),
      this.sendSlackNotification(message),
      this.sendCustomWebhook(message)
    ]);
  }

  // Notificar sobre sucesso em operações importantes
  async notifySuccess(data, context = {}) {
    const message = {
      type: 'success',
      title: 'Operação Bem-Sucedida - APIs Externas',
      description: data.message,
      context: {
        timestamp: new Date().toISOString(),
        processed: data.processed,
        created: data.created,
        updated: data.updated,
        ...context
      }
    };

    // Só notificar sucessos para operações grandes (>50 itens)
    if (data.processed >= 50) {
      await this.sendSlackNotification(message);
    }
  }

  // Notificar sobre token expirando
  async notifyTokenExpiring(token) {
    const message = {
      type: 'warning',
      title: 'Token Expirando - APIs Externas',
      description: `Token da integração ${token.integracao} expira em breve`,
      context: {
        integracao: token.integracao,
        expires_at: token.expires_at,
        days_remaining: Math.ceil((new Date(token.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
      }
    };

    await Promise.allSettled([
      this.sendEmail(message),
      this.sendSlackNotification(message)
    ]);
  }

  // Relatório diário de atividade
  async sendDailyReport(stats) {
    const message = {
      type: 'info',
      title: 'Relatório Diário - APIs Externas',
      description: 'Resumo das atividades das últimas 24 horas',
      context: stats
    };

    await Promise.allSettled([
      this.sendEmail(message),
      this.sendSlackNotification(message)
    ]);
  }

  async sendEmail(message) {
    if (!this.emailTransporter) {
      return;
    }

    try {
      const html = this.generateEmailHTML(message);
      
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'alerts@roadrw.com',
        to: process.env.ADMIN_EMAIL || 'admin@roadrw.com',
        subject: message.title,
        html: html
      });

      logger.info('Email de notificação enviado:', { type: message.type });

    } catch (error) {
      logger.error('Erro ao enviar email:', error);
    }
  }

  async sendSlackNotification(message) {
    if (!this.webhookConfig.slack) {
      return;
    }

    try {
      const color = {
        'error': '#FF0000',
        'warning': '#FFA500',
        'success': '#00FF00',
        'info': '#0000FF'
      }[message.type] || '#808080';

      const payload = {
        text: message.title,
        attachments: [{
          color: color,
          fields: [
            {
              title: 'Descrição',
              value: message.description,
              short: false
            },
            {
              title: 'Timestamp',
              value: message.context.timestamp,
              short: true
            },
            {
              title: 'Integração',
              value: message.context.integracao || 'N/A',
              short: true
            }
          ]
        }]
      };

      await axios.post(this.webhookConfig.slack, payload);
      logger.info('Notificação Slack enviada:', { type: message.type });

    } catch (error) {
      logger.error('Erro ao enviar notificação Slack:', error);
    }
  }

  async sendCustomWebhook(message) {
    if (!this.webhookConfig.custom) {
      return;
    }

    try {
      await axios.post(this.webhookConfig.custom, {
        service: 'roadrw-external-api',
        ...message
      }, {
        timeout: 10000
      });

      logger.info('Webhook customizado enviado:', { type: message.type });

    } catch (error) {
      logger.error('Erro ao enviar webhook customizado:', error);
    }
  }

  generateEmailHTML(message) {
    const contextItems = Object.entries(message.context)
      .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
      .join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <h2 style="color: #333;">${message.title}</h2>
          <p style="color: #666; font-size: 16px;">${message.description}</p>
          
          <h3>Detalhes:</h3>
          <ul style="color: #555;">
            ${contextItems}
          </ul>
          
          <hr style="margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Este é um email automático do sistema Road-RW.
            <br>Para configurar notificações, acesse o painel administrativo.
          </p>
        </body>
      </html>
    `;
  }
}

module.exports = NotificationService;