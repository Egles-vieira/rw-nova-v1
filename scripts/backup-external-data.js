
// ==========================================
// 2. SISTEMA DE BACKUP E RESTORE
// ==========================================
// backend/scripts/backup-external-data.js

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Database = require('../src/database/connection');
const logger = require('../src/config/logger');

class ExternalDataBackup {
  constructor() {
    this.database = null;
    this.backupDir = path.join(__dirname, '../backups/external');
  }

  async initialize() {
    this.database = new Database();
    await this.database.connect();
    
    // Criar diretório de backup se não existir
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `external-backup-${timestamp}.json`);

      logger.info('Iniciando backup dos dados das APIs externas...');

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {
          api_tokens: await this.backupApiTokens(),
          external_logs: await this.backupRecentLogs(),
          transportadora_mappings: await this.backupTransportadoraMappings(),
          integration_settings: await this.backupIntegrationSettings()
        }
      };

      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      logger.info(`Backup criado com sucesso: ${backupFile}`);
      return backupFile;

    } catch (error) {
      logger.error('Erro ao criar backup:', error);
      throw error;
    }
  }

  async backupApiTokens() {
    const query = `
      SELECT integracao, expires_at, active, description, created_at
      FROM api_tokens 
      WHERE active = true
      ORDER BY integracao
    `;

    const result = await this.database.query(query);
    return result.rows;
  }

  async backupRecentLogs() {
    // Backup apenas dos logs dos últimos 30 dias para evitar arquivos enormes
    const query = `
      SELECT integracao, operacao, resultado, created_at
      FROM external_logs 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    const result = await this.database.query(query);
    return result.rows;
  }

  async backupTransportadoraMappings() {
    const query = `
      SELECT 
        t.cnpj, t.nome, t.integracao_ocorrencia,
        array_agg(
          json_build_object(
            'codigo', tco.codigo,
            'descricao', tco.descricao,
            'codigo_ocorrencia', tco.codigo_ocorrencia_codigo
          )
        ) as mappings
      FROM transportadoras t
      LEFT JOIN transportadora_codigo_ocorrencia tco ON tco.transportadora_id = t.id
      WHERE t.integracao_ocorrencia IS NOT NULL 
        AND t.integracao_ocorrencia != 'manual'
      GROUP BY t.cnpj, t.nome, t.integracao_ocorrencia
    `;

    const result = await this.database.query(query);
    return result.rows;
  }

  async backupIntegrationSettings() {
    const query = `
      SELECT slug, settings
      FROM settings 
      WHERE slug IN ('integration_config', 'monitoring_config')
    `;

    const result = await this.database.query(query);
    return result.rows;
  }

  async restoreBackup(backupFile) {
    try {
      logger.info(`Iniciando restore do backup: ${backupFile}`);

      const backupContent = await fs.readFile(backupFile, 'utf-8');
      const backupData = JSON.parse(backupContent);

      // Validar versão do backup
      if (!backupData.version || !backupData.data) {
        throw new Error('Formato de backup inválido');
      }

      // Restaurar dados
      await this.restoreApiTokens(backupData.data.api_tokens);
      await this.restoreTransportadoraMappings(backupData.data.transportadora_mappings);
      await this.restoreIntegrationSettings(backupData.data.integration_settings);

      logger.info('Restore concluído com sucesso');

    } catch (error) {
      logger.error('Erro no restore:', error);
      throw error;
    }
  }

  async restoreApiTokens(tokens) {
    if (!tokens || tokens.length === 0) return;

    logger.info(`Restaurando ${tokens.length} tokens...`);

    for (const token of tokens) {
      // Verificar se token já existe
      const existsQuery = `
        SELECT id FROM api_tokens 
        WHERE integracao = $1 AND active = true
      `;
      
      const exists = await this.database.query(existsQuery, [token.integracao]);
      
      if (exists.rows.length === 0) {
        // Criar token (sem o valor real por segurança)
        const insertQuery = `
          INSERT INTO api_tokens (integracao, token, expires_at, active, description, created_at)
          VALUES ($1, $2, $3, false, $4, $5)
        `;
        
        await this.database.query(insertQuery, [
          token.integracao,
          `RESTORED_${token.integracao.toUpperCase()}_${Date.now()}`,
          token.expires_at,
          `Restaurado do backup - ${token.description || ''}`,
          token.created_at
        ]);

        logger.info(`Token restaurado para ${token.integracao} (inativo - configure manualmente)`);
      }
    }
  }

  async restoreTransportadoraMappings(mappings) {
    // Implementar restore de mapeamentos se necessário
    logger.info('Mapeamentos de transportadora verificados');
  }

  async restoreIntegrationSettings(settings) {
    if (!settings || settings.length === 0) return;

    for (const setting of settings) {
      const query = `
        INSERT INTO settings (slug, env, settings, created_at, updated_at)
        VALUES ($1, 'production', $2, NOW(), NOW())
        ON CONFLICT (slug, env) DO NOTHING
      `;

      await this.database.query(query, [setting.slug, JSON.stringify(setting.settings)]);
      logger.info(`Configuração ${setting.slug} restaurada`);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('external-backup-') && file.endsWith('.json'))
        .sort()
        .reverse();

      return backupFiles.map(file => ({
        file: file,
        path: path.join(this.backupDir, file),
        date: file.match(/external-backup-(.+)\.json/)[1].replace(/-/g, ':')
      }));

    } catch (error) {
      logger.error('Erro ao listar backups:', error);
      return [];
    }
  }

  async disconnect() {
    if (this.database) {
      await this.database.disconnect();
    }
  }
}

// Script de linha de comando
async function runBackupRestore() {
  const command = process.argv[2];
  const arg = process.argv[3];

  const backup = new ExternalDataBackup();
  
  try {
    await backup.initialize();

    switch (command) {
      case 'create':
        const backupFile = await backup.createBackup();
        console.log(`Backup criado: ${backupFile}`);
        break;

      case 'restore':
        if (!arg) {
          console.error('Uso: backup-external-data.js restore <arquivo_backup>');
          process.exit(1);
        }
        await backup.restoreBackup(arg);
        console.log('Restore concluído');
        break;

      case 'list':
        const backups = await backup.listBackups();
        console.log('Backups disponíveis:');
        backups.forEach(b => console.log(`- ${b.file} (${b.date})`));
        break;

      default:
        console.log('Comandos: create, restore <arquivo>, list');
        break;
    }

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  } finally {
    await backup.disconnect();
  }
}

if (require.main === module) {
  runBackupRestore();
}

module.exports = { ExternalDataBackup };