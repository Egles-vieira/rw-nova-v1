// ==========================================
// 5. DAEMON SCRIPT (PRODUÇÃO)
// ==========================================
// backend/scripts/jobs-daemon.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../src/config/logger');

class JobsDaemon {
  constructor() {
    this.pidFile = path.join(__dirname, '../jobs.pid');
    this.logFile = path.join(__dirname, '../logs/jobs-daemon.log');
    this.child = null;
    this.isRunning = false;
  }

  async start() {
    try {
      // Verificar se já está rodando
      if (this.isAlreadyRunning()) {
        logger.info('Jobs daemon já está rodando');
        return;
      }

      logger.info('Iniciando jobs daemon...');

      // Criar processo filho
      this.child = spawn('node', [path.join(__dirname, 'start-jobs.js')], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });

      // Salvar PID
      fs.writeFileSync(this.pidFile, this.child.pid.toString());

      // Desanexar do processo pai
      this.child.unref();

      this.isRunning = true;
      logger.info(`Jobs daemon iniciado com PID ${this.child.pid}`);

    } catch (error) {
      logger.error('Erro ao iniciar daemon:', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (!this.isAlreadyRunning()) {
        logger.info('Jobs daemon não está rodando');
        return;
      }

      const pid = this.getPid();
      
      if (pid) {
        process.kill(pid, 'SIGTERM');
        
        // Aguardar processo parar
        let attempts = 0;
        while (attempts < 10 && this.isProcessRunning(pid)) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        // Forçar parada se necessário
        if (this.isProcessRunning(pid)) {
          process.kill(pid, 'SIGKILL');
        }

        // Remover arquivo PID
        if (fs.existsSync(this.pidFile)) {
          fs.unlinkSync(this.pidFile);
        }

        logger.info('Jobs daemon parado');
      }

    } catch (error) {
      logger.error('Erro ao parar daemon:', error);
      throw error;
    }
  }

  getStatus() {
    const isRunning = this.isAlreadyRunning();
    const pid = this.getPid();

    return {
      running: isRunning,
      pid: pid,
      pidFile: this.pidFile,
      logFile: this.logFile
    };
  }

  isAlreadyRunning() {
    try {
      if (!fs.existsSync(this.pidFile)) {
        return false;
      }

      const pid = this.getPid();
      return pid && this.isProcessRunning(pid);

    } catch (error) {
      return false;
    }
  }

  getPid() {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));
        return isNaN(pid) ? null : pid;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Controle do daemon
async function daemonControl() {
  const daemon = new JobsDaemon();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      await daemon.start();
      break;

    case 'stop':
      await daemon.stop();
      break;

    case 'restart':
      await daemon.stop();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await daemon.start();
      break;

    case 'status':
      const status = daemon.getStatus();
      console.log('Daemon Status:', status);
      break;

    default:
      console.log(`
Uso: node jobs-daemon.js <comando>

Comandos:
  start   - Iniciar daemon
  stop    - Parar daemon
  restart - Reiniciar daemon
  status  - Status do daemon
`);
      break;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  daemonControl().catch(error => {
    logger.error('Erro no daemon:', error);
    process.exit(1);
  });
}

module.exports = { JobsDaemon, daemonControl };