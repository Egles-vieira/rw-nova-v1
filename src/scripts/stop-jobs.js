// ==========================================
// 2. STOP JOBS SCRIPT
// ==========================================
// backend/scripts/stop-jobs.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const axios = require('axios');
const logger = require('../src/config/logger');

async function stopJobs() {
  try {
    logger.info('=== PARANDO SISTEMA DE JOBS ===');

    const baseURL = process.env.BASE_URL || 'http://localhost:3001';
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      logger.error('❌ Token de admin não configurado (ADMIN_TOKEN)');
      logger.info('Configure a variável ADMIN_TOKEN no .env ou execute:');
      logger.info('ADMIN_TOKEN=seu_jwt_token npm run jobs:stop');
      process.exit(1);
    }

    // 1. Verificar status atual
    logger.info('Verificando status atual...');
    
    try {
      const statusResponse = await axios.get(`${baseURL}/api/jobs/status`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        timeout: 10000
      });

      const status = statusResponse.data.data;
      
      if (!status.scheduler.running) {
        logger.info('✓ Sistema já está parado');
        return;
      }

      logger.info('Sistema está rodando, enviando comando de parada...');

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.info('✓ Servidor não está rodando');
        return;
      }
      
      logger.warn('Erro ao verificar status, tentando parar mesmo assim...');
    }

    // 2. Enviar comando de parada
    try {
      const stopResponse = await axios.post(`${baseURL}/api/jobs/stop`, {}, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        timeout: 30000
      });

      if (stopResponse.data.success) {
        logger.info('✓ Comando de parada enviado com sucesso');
      } else {
        logger.warn('⚠️ Resposta inesperada:', stopResponse.data.message);
      }

    } catch (error) {
      if (error.response?.status === 401) {
        logger.error('❌ Token inválido ou expirado');
      } else {
        logger.error('❌ Erro ao enviar comando de parada:', error.message);
      }
      throw error;
    }

    // 3. Aguardar confirmação
    logger.info('Aguardando sistema parar...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      try {
        const checkResponse = await axios.get(`${baseURL}/api/jobs/status`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          timeout: 5000
        });

        const status = checkResponse.data.data;
        
        if (!status.scheduler.running) {
          logger.info('✓ Sistema parado com sucesso');
          break;
        }

        logger.info(`Tentativa ${attempts}/${maxAttempts}: Sistema ainda está rodando...`);

      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          logger.info('✓ Sistema parado (servidor não responde)');
          break;
        }
        
        logger.warn(`Tentativa ${attempts}/${maxAttempts}: Erro ao verificar status`);
      }
    }

    if (attempts >= maxAttempts) {
      logger.warn('⚠️ Sistema pode ainda estar rodando após timeout');
      logger.info('Verifique manualmente ou force a parada');
    }

    logger.info('=== COMANDO DE PARADA CONCLUÍDO ===');

  } catch (error) {
    logger.error('❌ Erro ao parar sistema:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  stopJobs();
}

module.exports = { stopJobs };
