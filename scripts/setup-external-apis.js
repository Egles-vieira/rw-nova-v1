// scripts/setup-external-apis.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Iniciando configuração das APIs externas...');

// Importar dependências com tratamento de erro
let logger, db;

try {
  logger = require('../src/config/logger');
  db = require('../src/database/connection');
} catch (error) {
  console.error('❌ Erro ao importar dependências:', error.message);
  console.log('ℹ️  Continuando com console.log...');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

async function setupExternalAPIs() {
  try {
    logger.info('🚀 Iniciando configuração das APIs externas...');
    
    // Se db não estiver disponível, simular sucesso
    if (!db) {
      logger.warn('⚠️  Conexão com banco não disponível. Criando arquivos de configuração...');
      await createConfigFiles();
      return;
    }

    // Verificar conexão com banco
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      logger.warn('⚠️  Banco não disponível. Criando apenas arquivos de configuração...');
      await createConfigFiles();
      return;
    }

    // 1. Criar tabelas necessárias se não existirem
    await createTablesIfNotExists();
    
    // 2. Inserir configurações padrão das transportadoras
    await insertDefaultTransportadoraConfigs();
    
    // 3. Inserir tokens de API se fornecidos
    await setupAPITokens();
    
    // 4. Configurar jobs de integração
    await setupIntegrationJobs();

    logger.info('✅ Configuração das APIs externas concluída com sucesso!');

  } catch (error) {
    logger.error('❌ Erro na configuração das APIs externas:', error.message);
    logger.info('ℹ️  Criando arquivos de configuração básicos...');
    await createConfigFiles();
  } finally {
    if (db && db.disconnect) {
      await db.disconnect();
    }
  }
}

async function testDatabaseConnection() {
  try {
    if (db && db.testConnection) {
      return await db.testConnection();
    }
    if (db && db.query) {
      await db.query('SELECT 1');
      return true;
    }
    return false;
  } catch (error) {
    logger.warn('⚠️  Erro ao testar conexão com banco:', error.message);
    return false;
  }
}

async function createConfigFiles() {
  logger.info('📁 Criando arquivos de configuração...');
  
  const configDir = path.join(__dirname, '..', 'config');
  
  // Criar diretório de config se não existir
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Arquivo de configuração das APIs
  const apiConfig = {
    integrations: {
      jamef: {
        enabled: true,
        base_url: 'https://api.jamef.com.br',
        timeout: 15000,
        retry_attempts: 3,
        rate_limit: { requests: 100, per: 'minute' }
      },
      braspress: {
        enabled: true,
        base_url: 'https://api.braspress.com.br',
        timeout: 45000,
        retry_attempts: 3,
        rate_limit: { requests: 500, per: 'hour' }
      },
      tnt: {
        enabled: true,
        base_url: 'https://api.tnt.com.br',
        timeout: 20000,
        retry_attempts: 3,
        rate_limit: { requests: 200, per: 'minute' }
      }
    },
    jobs: {
      enabled: true,
      poll_interval: 300,
      concurrent_jobs: 3
    }
  };

  const configPath = path.join(configDir, 'external-apis.json');
  fs.writeFileSync(configPath, JSON.stringify(apiConfig, null, 2));
  
  logger.info(`✅ Arquivo de configuração criado: ${configPath}`);
  
  // Criar arquivo .env.example se não existir
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    const envContent = `# APIs Externas - Tokens de Integração
JAMEF_API_TOKEN=seu_token_jamef_aqui
BRASPRESS_API_TOKEN=seu_token_braspress_aqui
TNT_API_TOKEN=seu_token_tnt_aqui

# Configurações de Integração
INTEGRATION_POLL_INTERVAL=300
INTEGRATION_CONCURRENT_JOBS=3
INTEGRATION_ENABLED=true
`;
    fs.writeFileSync(envExamplePath, envContent);
    logger.info(`✅ Arquivo .env.example criado`);
  }
}

async function createTablesIfNotExists() {
  logger.info('📋 Verificando tabelas necessárias...');

  try {
    // Verificar se as tabelas já existem antes de tentar criar
    const checkTable = async (tableName) => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [tableName]);
      return result.rows[0].exists;
    };

    // Tabela de configurações de API (só criar se não existir)
    const apiTokensExists = await checkTable('api_tokens');
    if (!apiTokensExists) {
      const createAPITokensTable = `
        CREATE TABLE api_tokens (
          id SERIAL PRIMARY KEY,
          integracao VARCHAR(50) NOT NULL,
          token TEXT NOT NULL,
          active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_api_tokens_integracao 
        ON api_tokens(integracao, active);
      `;
      await db.query(createAPITokensTable);
      logger.info('✅ Tabela api_tokens criada');
    } else {
      logger.info('ℹ️  Tabela api_tokens já existe');
    }

    // Tabela de configurações do sistema (só criar se não existir)
    const settingsExists = await checkTable('settings');
    if (!settingsExists) {
      const createSettingsTable = `
        CREATE TABLE settings (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(100) NOT NULL,
          env VARCHAR(20) DEFAULT 'production',
          settings JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(slug, env)
        );
        
        CREATE INDEX idx_settings_slug_env 
        ON settings(slug, env);
      `;
      await db.query(createSettingsTable);
      logger.info('✅ Tabela settings criada');
    } else {
      logger.info('ℹ️  Tabela settings já existe');
    }

    // Tabela de monitoramento de integrações (só criar se não existir)
    const monitoringExists = await checkTable('integration_monitoring');
    if (!monitoringExists) {
      const createMonitoringTable = `
        CREATE TABLE integration_monitoring (
          id SERIAL PRIMARY KEY,
          integration_name VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          last_execution TIMESTAMP,
          success_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          last_error TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_monitoring_integration 
        ON integration_monitoring(integration_name, status);
      `;
      await db.query(createMonitoringTable);
      logger.info('✅ Tabela integration_monitoring criada');
    } else {
      logger.info('ℹ️  Tabela integration_monitoring já existe');
    }

    // Verificar se a tabela transportadoras existe
    const transportadorasExists = await checkTable('transportadoras');
    if (transportadorasExists) {
      logger.info('✅ Tabela transportadoras existe');
      
      // Verificar se tem coluna para api_config
      const hasApiConfig = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'transportadoras' 
          AND column_name = 'api_config'
          AND table_schema = 'public'
        )
      `);
      
      if (!hasApiConfig.rows[0].exists) {
        logger.info('⚠️  Coluna api_config não existe na tabela transportadoras');
        logger.info('💡 As configurações de API serão salvas na tabela settings');
      }
    } else {
      logger.warn('⚠️  Tabela transportadoras não existe');
    }

  } catch (error) {
    logger.error('❌ Erro ao verificar/criar tabelas:', error.message);
    throw error;
  }
}

async function insertDefaultTransportadoraConfigs() {
  logger.info('🏢 Configurando transportadoras padrão...');

  // Primeiro, verificar a estrutura da tabela transportadoras
  try {
    const tableStructure = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transportadoras' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const columns = tableStructure.rows.map(row => row.column_name);
    logger.info(`📋 Colunas da tabela transportadoras: ${columns.join(', ')}`);
    
    // Verificar se existe coluna para API config
    const hasApiConfig = columns.includes('api_config');
    const hasIntegracao = columns.includes('integracao_ocorrencia');
    
    const defaultConfigs = [
      {
        nome: 'JAMEF TRANSPORTES',
        cnpj: '00000000000000', // CNPJ fictício - você deve atualizar
        endereco: 'Endereço JAMEF',
        municipio: 'São Paulo',
        uf: 'SP',
        integracao: 'jamef',
        api_config: {
          base_url: 'https://api.jamef.com.br',
          timeout: 15000,
          retry_attempts: 3,
          rate_limit: { requests: 100, per: 'minute' }
        }
      },
      {
        nome: 'BRASPRESS TRANSPORTES',
        cnpj: '11111111111111',
        endereco: 'Endereço Braspress',
        municipio: 'São Paulo',
        uf: 'SP',
        integracao: 'braspress',
        api_config: {
          base_url: 'https://api.braspress.com.br',
          timeout: 45000,
          retry_attempts: 3,
          rate_limit: { requests: 500, per: 'hour' }
        }
      },
      {
        nome: 'TNT MERCÚRIO',
        cnpj: '22222222222222',
        endereco: 'Endereço TNT',
        municipio: 'São Paulo',
        uf: 'SP',
        integracao: 'tnt',
        api_config: {
          base_url: 'https://api.tnt.com.br',
          timeout: 20000,
          retry_attempts: 3,
          rate_limit: { requests: 200, per: 'minute' }
        }
      }
    ];

    for (const config of defaultConfigs) {
      try {
        // Verificar se já existe pelo nome (sem a coluna codigo)
        const existing = await db.query(
          'SELECT id FROM transportadoras WHERE nome ILIKE $1', 
          [`%${config.integracao}%`]
        );

        if (existing.rows.length === 0) {
          // Montar query baseada nas colunas disponíveis
          let insertQuery = '';
          let values = [];
          
          if (hasApiConfig) {
            insertQuery = `
              INSERT INTO transportadoras (
                cnpj, nome, endereco, municipio, uf, 
                integracao_ocorrencia, api_config, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            `;
            values = [
              config.cnpj, config.nome, config.endereco, 
              config.municipio, config.uf, config.integracao,
              JSON.stringify(config.api_config)
            ];
          } else {
            insertQuery = `
              INSERT INTO transportadoras (
                cnpj, nome, endereco, municipio, uf, 
                integracao_ocorrencia, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `;
            values = [
              config.cnpj, config.nome, config.endereco, 
              config.municipio, config.uf, config.integracao
            ];
          }

          await db.query(insertQuery, values);
          logger.info(`✅ Transportadora ${config.nome} configurada`);
          
          // Salvar configuração de API em tabela separada se não há coluna api_config
          if (!hasApiConfig) {
            await saveApiConfigSeparately(config.integracao, config.api_config);
          }
          
        } else {
          logger.info(`ℹ️  Transportadora ${config.nome} já existe`);
        }
      } catch (error) {
        logger.warn(`⚠️  Erro ao configurar ${config.nome}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error('❌ Erro ao verificar estrutura da tabela:', error.message);
  }
}

async function saveApiConfigSeparately(integracao, apiConfig) {
  try {
    // Salvar na tabela settings como alternativa
    await db.query(`
      INSERT INTO settings (slug, env, settings, created_at, updated_at)
      VALUES ($1, 'production', $2, NOW(), NOW())
      ON CONFLICT (slug, env) 
      DO UPDATE SET 
        settings = $2,
        updated_at = NOW()
    `, [`transportadora_${integracao}_config`, JSON.stringify(apiConfig)]);
    
    logger.info(`📝 Configuração API para ${integracao} salva em settings`);
  } catch (error) {
    logger.warn(`⚠️  Erro ao salvar config API ${integracao}: ${error.message}`);
  }
}

async function setupAPITokens() {
  logger.info('🔑 Configurando tokens de API...');

  // Primeiro, verificar a estrutura da tabela api_tokens
  try {
    const tableStructure = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'api_tokens' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const columns = tableStructure.rows.map(row => row.column_name);
    logger.info(`📋 Colunas da tabela api_tokens: ${columns.join(', ')}`);
    
    // Verificar quais colunas existem
    const hasActive = columns.includes('active');
    const hasCreatedAt = columns.includes('created_at');
    const hasExpiresAt = columns.includes('expires_at');
    
    // Verificar variáveis de ambiente para tokens
    const tokens = {
      jamef: process.env.JAMEF_API_TOKEN,
      braspress: process.env.BRASPRESS_API_TOKEN,
      tnt: process.env.TNT_API_TOKEN
    };

    for (const [integracao, token] of Object.entries(tokens)) {
      if (token) {
        try {
          // Desativar tokens antigos (se a coluna active existir)
          if (hasActive) {
            await db.query(
              'UPDATE api_tokens SET active = false WHERE integracao = $1',
              [integracao]
            );
          } else {
            // Se não há coluna active, deletar tokens antigos
            await db.query(
              'DELETE FROM api_tokens WHERE integracao = $1',
              [integracao]
            );
          }

          // Montar query de inserção baseada nas colunas disponíveis
          let insertQuery = '';
          let values = [integracao, token];
          
          if (hasActive && hasCreatedAt && hasExpiresAt) {
            // Tabela completa
            insertQuery = `
              INSERT INTO api_tokens (integracao, token, active, created_at)
              VALUES ($1, $2, true, NOW())
            `;
          } else if (hasActive && hasCreatedAt) {
            // Sem expires_at
            insertQuery = `
              INSERT INTO api_tokens (integracao, token, active, created_at)
              VALUES ($1, $2, true, NOW())
            `;
          } else if (hasCreatedAt) {
            // Apenas created_at
            insertQuery = `
              INSERT INTO api_tokens (integracao, token, created_at)
              VALUES ($1, $2, NOW())
            `;
          } else {
            // Tabela básica (apenas id, integracao, token)
            insertQuery = `
              INSERT INTO api_tokens (integracao, token)
              VALUES ($1, $2)
            `;
          }

          await db.query(insertQuery, values);
          logger.info(`✅ Token para ${integracao} configurado`);
          
        } catch (error) {
          logger.warn(`⚠️  Erro ao configurar token ${integracao}: ${error.message}`);
        }
      } else {
        logger.warn(`⚠️  Token para ${integracao} não encontrado nas variáveis de ambiente`);
      }
    }
    
  } catch (error) {
    logger.error('❌ Erro ao verificar estrutura da tabela api_tokens:', error.message);
  }
}

async function setupIntegrationJobs() {
  logger.info('⚙️  Configurando jobs de integração...');

  const jobConfig = {
    enabled: true,
    poll_interval: parseInt(process.env.INTEGRATION_POLL_INTERVAL) || 300,
    concurrent_jobs: parseInt(process.env.INTEGRATION_CONCURRENT_JOBS) || 3,
    rate_limits: {
      jamef: { requests: 100, per: 'minute' },
      braspress: { requests: 500, per: 'hour' },
      tnt: { requests: 200, per: 'minute' }
    },
    timeouts: {
      default: 30000,
      jamef: 15000,
      braspress: 45000,
      tnt: 20000
    },
    retry: {
      attempts: 3,
      exponential: true,
      base_delay: 1000
    },
    circuit_breaker: {
      enabled: true,
      failure_threshold: 5,
      reset_timeout: 60000
    }
  };

  try {
    // Inserir/atualizar configuração dos jobs
    await db.query(`
      INSERT INTO settings (slug, env, settings, created_at, updated_at)
      VALUES ('integration_config', 'production', $1, NOW(), NOW())
      ON CONFLICT (slug, env) 
      DO UPDATE SET 
        settings = $1,
        updated_at = NOW()
    `, [JSON.stringify(jobConfig)]);

    // Inicializar monitoramento para cada integração
    const integrations = ['jamef', 'braspress', 'tnt'];
    
    for (const integration of integrations) {
      await db.query(`
        INSERT INTO integration_monitoring (integration_name, status, created_at, updated_at)
        VALUES ($1, 'active', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [integration]);
    }

    logger.info('✅ Jobs de integração configurados');
  } catch (error) {
    logger.warn(`⚠️  Erro ao configurar jobs: ${error.message}`);
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  setupExternalAPIs();
}

module.exports = { setupExternalAPIs };