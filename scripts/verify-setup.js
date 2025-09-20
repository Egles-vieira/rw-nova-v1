// scripts/verify-setup.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 Verificando configuração das APIs externas...');

// Importar dependências com tratamento de erro
let logger, db;

try {
  logger = require('../src/config/logger');
  db = require('../src/database/connection');
} catch (error) {
  console.log('ℹ️  Usando console.log para logs...');
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

async function verifySetup() {
  try {
    logger.info('🔍 Verificando configuração das APIs externas...');

    // 1. Verificar arquivos de configuração
    await checkConfigFiles();

    // 2. Verificar variáveis de ambiente
    checkEnvironmentVariables();

    // 3. Verificar banco de dados (se disponível)
    if (db) {
      await checkDatabase();
    } else {
      logger.warn('⚠️  Verificação de banco não disponível');
    }

    logger.info('✅ Verificação concluída!');

  } catch (error) {
    logger.error('❌ Erro na verificação:', error.message);
  } finally {
    if (db && db.disconnect) {
      try {
        await db.disconnect();
      } catch (error) {
        // Ignorar erro de desconexão
      }
    }
  }
}

async function checkConfigFiles() {
  logger.info('📁 Verificando arquivos de configuração...');

  const files = [
    { path: '../src/config/env.js', name: 'Configuração de ambiente' },
    { path: '../src/config/logger.js', name: 'Configuração de logs' },
    { path: '../config/external-apis.json', name: 'Configuração de APIs externas' },
    { path: '../.env.example', name: 'Exemplo de variáveis de ambiente' },
    { path: '../package.json', name: 'Package.json' }
  ];

  for (const file of files) {
    const fullPath = path.join(__dirname, file.path);
    if (fs.existsSync(fullPath)) {
      logger.info(`   ✅ ${file.name}`);
    } else {
      logger.warn(`   ⚠️  ${file.name} não encontrado: ${fullPath}`);
    }
  }

  // Verificar se o diretório src existe
  const srcPath = path.join(__dirname, '..', 'src');
  if (fs.existsSync(srcPath)) {
    logger.info('   ✅ Diretório src/ existe');
    
    // Verificar subdiretórios importantes
    const subDirs = ['config', 'database', 'services', 'routes', 'controllers'];
    for (const dir of subDirs) {
      const dirPath = path.join(srcPath, dir);
      if (fs.existsSync(dirPath)) {
        logger.info(`   ✅ Diretório src/${dir}/ existe`);
      } else {
        logger.warn(`   ⚠️  Diretório src/${dir}/ não encontrado`);
      }
    }
  } else {
    logger.error('   ❌ Diretório src/ não encontrado');
  }
}

function checkEnvironmentVariables() {
  logger.info('🌍 Verificando variáveis de ambiente...');

  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_NAME', 
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET'
  ];

  const optionalEnvVars = [
    'JAMEF_API_TOKEN',
    'BRASPRESS_API_TOKEN', 
    'TNT_API_TOKEN',
    'INTEGRATION_POLL_INTERVAL',
    'INTEGRATION_CONCURRENT_JOBS'
  ];
  
  let missingRequired = [];
  let foundOptional = [];

  // Verificar variáveis obrigatórias
  requiredEnvVars.forEach(env => {
    if (process.env[env]) {
      logger.info(`   ✅ ${env} definida`);
    } else {
      logger.error(`   ❌ ${env} não definida (obrigatória)`);
      missingRequired.push(env);
    }
  });

  // Verificar variáveis opcionais
  optionalEnvVars.forEach(env => {
    if (process.env[env]) {
      logger.info(`   ✅ ${env} definida`);
      foundOptional.push(env);
    } else {
      logger.warn(`   ⚠️  ${env} não definida (opcional)`);
    }
  });

  // Resumo
  if (missingRequired.length > 0) {
    logger.error(`❌ ${missingRequired.length} variáveis obrigatórias faltando: ${missingRequired.join(', ')}`);
    logger.info('💡 Crie um arquivo .env baseado no .env.example');
  } else {
    logger.info('✅ Todas as variáveis obrigatórias estão definidas');
  }

  if (foundOptional.length > 0) {
    logger.info(`✅ ${foundOptional.length} tokens de API configurados`);
  } else {
    logger.warn('⚠️  Nenhum token de API configurado. Configure os tokens para usar as integrações.');
  }
}

async function checkDatabase() {
  try {
    logger.info('🗄️  Verificando banco de dados...');

    // Verificar conexão
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      logger.error('❌ Falha na conexão com o banco de dados');
      return;
    }
    logger.info('✅ Conexão com banco de dados OK');

    // Verificar tabelas
    const tables = [
      'users', 
      'transportadoras', 
      'notas_fiscais', 
      'clientes',
      'embarcadores',
      'motoristas',
      'romaneios',
      'api_tokens', 
      'settings', 
      'integration_monitoring'
    ];
    const existingTables = [];
    
    for (const table of tables) {
      try {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (result.rows[0].exists) {
          logger.info(`   ✅ Tabela ${table} existe`);
          existingTables.push(table);
        } else {
          logger.warn(`   ⚠️  Tabela ${table} não encontrada`);
        }
      } catch (error) {
        logger.warn(`   ⚠️  Erro ao verificar tabela ${table}: ${error.message}`);
      }
    }

    // Verificar dados se as tabelas existem
    if (existingTables.includes('transportadoras')) {
      try {
        // Verificar estrutura da tabela transportadoras
        const structure = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'transportadoras' AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        const columns = structure.rows.map(row => row.column_name);
        logger.info(`📋 Colunas da tabela transportadoras: ${columns.join(', ')}`);
        
        const transportadoras = await db.query('SELECT nome, integracao_ocorrencia FROM transportadoras');
        logger.info(`📊 ${transportadoras.rows.length} transportadoras configuradas:`);
        transportadoras.rows.forEach(t => {
          const integracao = t.integracao_ocorrencia || 'sem integração';
          logger.info(`   • ${t.nome} (${integracao})`);
        });
      } catch (error) {
        logger.warn(`   ⚠️  Erro ao consultar transportadoras: ${error.message}`);
      }
    }

    if (existingTables.includes('api_tokens')) {
      try {
        const tokens = await db.query('SELECT integracao, active FROM api_tokens WHERE active = true');
        logger.info(`🔑 ${tokens.rows.length} tokens ativos:`);
        tokens.rows.forEach(t => {
          logger.info(`   • ${t.integracao}`);
        });
      } catch (error) {
        logger.warn(`   ⚠️  Erro ao consultar tokens: ${error.message}`);
      }
    }

    if (existingTables.includes('settings')) {
      try {
        const configs = await db.query('SELECT slug FROM settings');
        logger.info(`⚙️  ${configs.rows.length} configurações:`);
        configs.rows.forEach(c => {
          logger.info(`   • ${c.slug}`);
        });
      } catch (error) {
        logger.warn(`   ⚠️  Erro ao consultar configurações: ${error.message}`);
      }
    }

    if (existingTables.includes('integration_monitoring')) {
      try {
        const monitoring = await db.query('SELECT integration_name, status FROM integration_monitoring');
        logger.info(`📈 ${monitoring.rows.length} integrações monitoradas:`);
        monitoring.rows.forEach(m => {
          logger.info(`   • ${m.integration_name} (${m.status})`);
        });
      } catch (error) {
        logger.warn(`   ⚠️  Erro ao consultar monitoramento: ${error.message}`);
      }
    }

  } catch (error) {
    logger.error('❌ Erro na verificação do banco:', error.message);
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
    return false;
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  verifySetup();
}

module.exports = { verifySetup };