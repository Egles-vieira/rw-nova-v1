// ==========================================
// 4. CONTROL JOBS SCRIPT (GERAL)
// ==========================================
// backend/scripts/control-jobs.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { startJobs } = require('./start-jobs');
const { stopJobs } = require('./stop-jobs');
const { getJobsStatus } = require('./status-jobs');
const logger = require('../src/config/logger');

async function controlJobs() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'start':
      await startJobs();
      break;

    case 'stop':
      await stopJobs();
      break;

    case 'restart':
      logger.info('=== REINICIANDO SISTEMA DE JOBS ===');
      await stopJobs();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3s
      await startJobs();
      break;

    case 'status':
      await getJobsStatus();
      break;

    case 'run':
      await runManualJob();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

async function runManualJob() {
  try {
    logger.info('=== EXECUTANDO JOB MANUAL ===');

    const axios = require('axios');
    const baseURL = process.env.BASE_URL || 'http://localhost:3001';
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      logger.error('❌ Token de admin não configurado (ADMIN_TOKEN)');
      process.exit(1);
    }

    const response = await axios.post(`${baseURL}/api/jobs/run`, {}, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      timeout: 30000
    });

    if (response.data.success) {
      logger.info('✅ Job manual iniciado com sucesso');
    } else {
      logger.error('❌ Erro ao executar job:', response.data.message);
    }

  } catch (error) {
    logger.error('❌ Erro ao executar job manual:', error.message);
  }
}

function showHelp() {
  console.log(`
🚀 CONTROLE DO SISTEMA DE JOBS - ROAD-RW

Uso: npm run jobs <comando>

Comandos disponíveis:
  start     - Iniciar sistema de jobs
  stop      - Parar sistema de jobs
  restart   - Reiniciar sistema de jobs
  status    - Mostrar status atual
  run       - Executar job manual
  help      - Mostrar esta ajuda

Exemplos:
  npm run jobs start
  npm run jobs:status
  ADMIN_TOKEN=seu_token npm run jobs stop

Variáveis de ambiente:
  BASE_URL      - URL do servidor (padrão: http://localhost:3001)
  ADMIN_TOKEN   - Token JWT de administrador (obrigatório)
  NODE_ENV      - Ambiente de execução
  LOG_LEVEL     - Nível de log (info, debug, error)

Para mais informações, consulte a documentação.
`);
}

// Executar se chamado diretamente
if (require.main === module) {
  controlJobs().catch(error => {
    logger.error('Erro no controle de jobs:', error);
    process.exit(1);
  });
}

module.exports = {
  controlJobs,
  runManualJob,
  showHelp
};