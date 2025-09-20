// scripts/fix-all-endpoints.js
const fs = require('fs');
const path = require('path');

function fixJobManager() {
  console.log('🔧 Corrigindo JobManager...');
  
  const jobManagerPath = path.join(__dirname, '..', 'src', 'services', 'jobs', 'job-manager.service.js');
  
  if (!fs.existsSync(jobManagerPath)) {
    console.log('❌ Arquivo job-manager.service.js não encontrado');
    return false;
  }

  let content = fs.readFileSync(jobManagerPath, 'utf8');
  
  // Verificar se o método já existe
  if (content.includes('getHealthStatus')) {
    console.log('ℹ️ JobManager já possui método getHealthStatus');
    return true;
  }

  // Método para adicionar
  const healthStatusMethod = `
  // Métodos para status e saúde dos jobs
  async getHealthStatus() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized' };
      }

      return {
        status: 'running',
        initialized: this.isInitialized,
        scheduler: this.scheduler ? 'active' : 'inactive',
        repositories: Object.keys(this.repositories || {}),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getStatus() {
    return await this.getHealthStatus();
  }

  async getIntegrationsStatus() {
    try {
      if (!this.repositories || !this.repositories.monitoring) {
        return [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }`;

  // Encontrar o final da classe
  const classEndIndex = content.lastIndexOf('}');
  if (classEndIndex === -1) {
    console.log('❌ Não foi possível encontrar o final da classe JobManager');
    return false;
  }

  // Inserir os métodos
  const newContent = 
    content.slice(0, classEndIndex) + 
    healthStatusMethod + 
    '\n' + 
    content.slice(classEndIndex);

  // Fazer backup e salvar
  fs.writeFileSync(jobManagerPath + '.backup', content);
  fs.writeFileSync(jobManagerPath, newContent);
  
  console.log('✅ JobManager corrigido');
  return true;
}

function fixServerJs() {
  console.log('🔧 Corrigindo server.js...');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ Arquivo server.js não encontrado');
    return false;
  }

  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Verificar se o endpoint já existe
  if (content.includes('/api/system/status')) {
    console.log('ℹ️ Endpoint /api/system/status já existe');
    return true;
  }

  // Endpoint para adicionar
  const systemStatusEndpoint = `
// ========================================
// STATUS GERAL DO SISTEMA
// ========================================
app.get('/api/system/status', async (req, res) => {
  try {
    const status = {
      server: {
        status: 'running',
        port: config.port,
        environment: config.nodeEnv,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      database: await db.healthCheck(),
      jobs: { status: 'not_initialized' },
      integrations: []
    };

    // Verificar jobs se disponível
    if (jobManager && jobManager.isInitialized) {
      try {
        if (jobManager.getHealthStatus) {
          status.jobs = await jobManager.getHealthStatus();
        } else {
          status.jobs = { 
            status: 'active', 
            initialized: jobManager.isInitialized 
          };
        }

        if (jobManager.getIntegrationsStatus) {
          status.integrations = await jobManager.getIntegrationsStatus();
        }
      } catch (error) {
        status.jobs = { status: 'error', message: error.message };
      }
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Erro ao obter status do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do sistema',
      error: error.message
    });
  }
});
`;

  // Encontrar onde inserir (após o health check)
  const healthCheckIndex = content.indexOf("app.get('/health'");
  if (healthCheckIndex === -1) {
    console.log('❌ Não foi possível encontrar o endpoint /health');
    return false;
  }

  // Encontrar o final do health check
  const healthCheckEnd = content.indexOf('});', healthCheckIndex);
  if (healthCheckEnd === -1) {
    console.log('❌ Não foi possível encontrar o final do endpoint /health');
    return false;
  }

  const insertPoint = healthCheckEnd + 3; // após '});'

  // Inserir o novo endpoint
  const newContent = 
    content.slice(0, insertPoint) + 
    '\n' + 
    systemStatusEndpoint + 
    content.slice(insertPoint);

  // Fazer backup e salvar
  fs.writeFileSync(serverPath + '.backup', content);
  fs.writeFileSync(serverPath, newContent);
  
  console.log('✅ server.js corrigido');
  return true;
}

function main() {
  console.log('🚀 Corrigindo todos os endpoints...\n');
  
  const jobManagerFixed = fixJobManager();
  const serverFixed = fixServerJs();
  
  if (jobManagerFixed && serverFixed) {
    console.log('\n🎉 Todas as correções aplicadas!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Reinicie o servidor: npm run dev');
    console.log('2. Teste os endpoints:');
    console.log('   • http://localhost:3001/health');
    console.log('   • http://localhost:3001/api/system/status');
    console.log('   • http://localhost:3001/api/jobs/status');
    console.log('   • http://localhost:3001/api/monitoring/dashboard');
  } else {
    console.log('\n❌ Algumas correções falharam. Verifique os logs acima.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixJobManager, fixServerJs };