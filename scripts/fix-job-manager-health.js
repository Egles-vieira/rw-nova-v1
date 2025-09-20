// scripts/fix-job-manager-health.js
// Patch temporário para adicionar método getHealthStatus ao JobManager

const fs = require('fs');
const path = require('path');

function fixJobManagerHealth() {
  const jobManagerPath = path.join(__dirname, '..', 'src', 'services', 'jobs', 'job-manager.service.js');
  
  if (!fs.existsSync(jobManagerPath)) {
    console.log('❌ Arquivo job-manager.service.js não encontrado');
    return;
  }

  let content = fs.readFileSync(jobManagerPath, 'utf8');
  
  // Verificar se o método já existe
  if (content.includes('getHealthStatus')) {
    console.log('ℹ️ Método getHealthStatus já existe');
    return;
  }

  // Método para adicionar
  const healthStatusMethod = `
  // Método para verificar saúde dos jobs
  async getHealthStatus() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized' };
      }

      const status = {
        status: 'running',
        initialized: this.isInitialized,
        scheduler: this.scheduler ? 'active' : 'inactive',
        repositories: Object.keys(this.repositories || {}),
        timestamp: new Date().toISOString()
      };

      // Verificar se há jobs rodando
      if (this.scheduler && this.scheduler.getStatus) {
        status.jobs = await this.scheduler.getStatus();
      }

      return status;
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Método para obter status geral
  async getStatus() {
    try {
      return await this.getHealthStatus();
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Método para obter status das integrações
  async getIntegrationsStatus() {
    try {
      if (!this.repositories || !this.repositories.monitoring) {
        return [];
      }

      // Buscar status das integrações do banco
      const integrations = await this.repositories.monitoring.getIntegrationsStatus();
      return integrations || [];
    } catch (error) {
      console.error('Erro ao obter status das integrações:', error);
      return [];
    }
  }`;

  // Encontrar o final da classe e adicionar os métodos antes
  const classEndIndex = content.lastIndexOf('}');
  if (classEndIndex === -1) {
    console.log('❌ Não foi possível encontrar o final da classe');
    return;
  }

  // Inserir os métodos antes do fechamento da classe
  const newContent = 
    content.slice(0, classEndIndex) + 
    healthStatusMethod + 
    '\n' + 
    content.slice(classEndIndex);

  // Fazer backup do arquivo original
  fs.writeFileSync(jobManagerPath + '.backup', content);
  
  // Escrever o novo conteúdo
  fs.writeFileSync(jobManagerPath, newContent);
  
  console.log('✅ Métodos getHealthStatus, getStatus e getIntegrationsStatus adicionados');
  console.log('📁 Backup criado: job-manager.service.js.backup');
}

if (require.main === module) {
  fixJobManagerHealth();
}

module.exports = { fixJobManagerHealth };