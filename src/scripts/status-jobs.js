
// ==========================================
// 3. STATUS JOBS SCRIPT
// ==========================================
// backend/scripts/status-jobs.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const axios = require('axios');
const logger = require('../src/config/logger');

async function getJobsStatus() {
  try {
    logger.info('=== STATUS DO SISTEMA DE JOBS ===');

    const baseURL = process.env.BASE_URL || 'http://localhost:3001';
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      logger.error('❌ Token de admin não configurado (ADMIN_TOKEN)');
      process.exit(1);
    }

    // 1. Obter status geral
    try {
      const statusResponse = await axios.get(`${baseURL}/api/jobs/status`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        timeout: 10000
      });

      const { scheduler, statistics } = statusResponse.data.data;

      logger.info('📊 STATUS GERAL:');
      logger.info(`  • Sistema: ${scheduler.running ? '✅ RODANDO' : '❌ PARADO'}`);
      logger.info(`  • Configuração: ${scheduler.config?.enabled ? 'Habilitada' : 'Desabilitada'}`);
      logger.info(`  • Intervalo: ${scheduler.config?.poll_interval || 'N/A'}s`);
      logger.info(`  • Jobs agendados: ${scheduler.scheduledJobs?.length || 0}`);

      logger.info('📈 ESTATÍSTICAS (24h):');
      logger.info(`  • Total integrações: ${statistics.total_integracoes || 0}`);
      logger.info(`  • Concluídas: ${statistics.concluidas || 0}`);
      logger.info(`  • Em andamento: ${statistics.em_andamento || 0}`);
      logger.info(`  • NFs processadas: ${statistics.total_nfs_processadas || 0}`);
      logger.info(`  • Taxa de sucesso: ${statistics.taxa_sucesso || 0}%`);
      logger.info(`  • Tempo médio: ${Math.round(statistics.tempo_medio_segundos || 0)}s`);

      if (scheduler.queueStatus) {
        const queues = Object.keys(scheduler.queueStatus);
        if (queues.length > 0) {
          logger.info('🔄 FILAS ATIVAS:');
          queues.forEach(queueName => {
            const queue = scheduler.queueStatus[queueName];
            logger.info(`  • ${queueName}: ${queue.size} jobs (${queue.processing ? 'processando' : 'parado'})`);
          });
        }
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.info('❌ SISTEMA PARADO (servidor não responde)');
        return;
      }
      
      if (error.response?.status === 401) {
        logger.error('❌ Token inválido ou expirado');
        return;
      }

      throw error;
    }

    // 2. Obter saúde das integrações
    try {
      const healthResponse = await axios.get(`${baseURL}/api/monitoring/health`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        timeout: 10000
      });

      const healthData = healthResponse.data.data;

      if (healthData && healthData.length > 0) {
        logger.info('🏥 SAÚDE DAS INTEGRAÇÕES:');
        healthData.forEach(item => {
          const icon = {
            'SAUDAVEL': '✅',
            'ALERTA': '⚠️',
            'CRITICO': '❌',
            'INATIVO': '⏸️'
          }[item.status_saude] || '❓';

          logger.info(`  • ${item.nome} (${item.integracao_ocorrencia}): ${icon} ${item.status_saude}`);
          if (item.nfs_pendentes > 0) {
            logger.info(`    - NFs pendentes: ${item.nfs_pendentes}`);
          }
          if (item.erros_recentes > 0) {
            logger.info(`    - Erros recentes: ${item.erros_recentes}`);
          }
        });
      }

    } catch (error) {
      logger.warn('⚠️ Erro ao obter saúde das integrações:', error.response?.data?.message || error.message);
    }

    // 3. Obter alertas ativos
    try {
      const alertsResponse = await axios.get(`${baseURL}/api/monitoring/alerts`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        timeout: 10000
      });

      const alerts = alertsResponse.data.data;

      if (alerts && alerts.length > 0) {
        logger.info('🚨 ALERTAS ATIVOS:');
        alerts.forEach(alert => {
          const icon = alert.severidade === 'ALTO' ? '❌' : '⚠️';
          logger.info(`  ${icon} ${alert.titulo}`);
          logger.info(`    - ${alert.descricao}`);
        });
      } else {
        logger.info('✅ Nenhum alerta ativo');
      }

    } catch (error) {
      logger.warn('⚠️ Erro ao obter alertas:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    logger.error('❌ Erro ao obter status:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  getJobsStatus();
}

module.exports = { getJobsStatus };