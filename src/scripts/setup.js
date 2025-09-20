#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs');

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Função para criar diretórios necessários
const createDirectories = () => {
  const directories = [
    'logs',
    'uploads',
    'uploads/images',
    'uploads/documents',
    'uploads/temp'
  ];

  log('📁 Criando diretórios necessários...', 'blue');
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`  ✓ Criado: ${dir}`, 'green');
    } else {
      log(`  - Já existe: ${dir}`, 'yellow');
    }
  });
};

// Função para verificar arquivo .env
const checkEnvFile = () => {
  log('🔧 Verificando arquivo .env...', 'blue');
  
  if (!fs.existsSync('.env')) {
    log('  ⚠️  Arquivo .env não encontrado', 'yellow');
    
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
      log('  ✓ Arquivo .env criado a partir do .env.example', 'green');
      log('  ⚠️  CONFIGURE as variáveis no arquivo .env antes de continuar!', 'yellow');
    } else {
      log('  ❌ Arquivo .env.example não encontrado', 'red');
      return false;
    }
  } else {
    log('  ✓ Arquivo .env encontrado', 'green');
  }
  
  return true;
};

// Função para testar conexão com banco
const testDatabase = () => {
  return new Promise((resolve, reject) => {
    log('🗄️  Testando conexão com banco de dados...', 'blue');
    
    try {
      const db = require('../src/database/connection');
      
      db.testConnection()
        .then((connected) => {
          if (connected) {
            log('  ✓ Conexão com banco estabelecida', 'green');
            resolve(true);
          } else {
            log('  ❌ Falha na conexão com banco', 'red');
            resolve(false);
          }
        })
        .catch((error) => {
          log(`  ❌ Erro na conexão: ${error.message}`, 'red');
          resolve(false);
        });
    } catch (error) {
      log(`  ❌ Erro ao testar conexão: ${error.message}`, 'red');
      resolve(false);
    }
  });
};

// Função para criar usuário administrador inicial
const createAdminUser = async () => {
  log('👤 Criando usuário administrador...', 'blue');
  
  try {
    const UsersRepository = require('../src/repositories/users.repository');
    const repository = new UsersRepository();
    
    // Verificar se já existe admin
    const existingAdmin = await repository.findByEmail('admin@roadrw.com');
    
    if (existingAdmin) {
      log('  - Usuário admin já existe', 'yellow');
      return true;
    }
    
    // Criar usuário admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await repository.create({
      name: 'Administrador',
      email: 'admin@roadrw.com',
      password: hashedPassword
    });
    
    log('  ✓ Usuário administrador criado:', 'green');
    log(`    Email: admin@roadrw.com`, 'green');
    log(`    Senha: admin123`, 'green');
    log(`    ⚠️  ALTERE a senha após o primeiro login!`, 'yellow');
    
    return true;
  } catch (error) {
    log(`  ❌ Erro ao criar usuário: ${error.message}`, 'red');
    return false;
  }
};

// Função para instalar dependências
const installDependencies = () => {
  return new Promise((resolve) => {
    log('📦 Verificando dependências...', 'blue');
    
    if (!fs.existsSync('node_modules')) {
      log('  📥 Instalando dependências...', 'blue');
      
      exec('npm install', (error, stdout, stderr) => {
        if (error) {
          log(`  ❌ Erro na instalação: ${error.message}`, 'red');
          resolve(false);
        } else {
          log('  ✓ Dependências instaladas', 'green');
          resolve(true);
        }
      });
    } else {
      log('  ✓ Dependências já instaladas', 'green');
      resolve(true);
    }
  });
};

// Função para verificar se PostgreSQL está rodando
const checkPostgreSQL = () => {
  return new Promise((resolve) => {
    log('🐘 Verificando PostgreSQL...', 'blue');
    
    exec('pg_isready', (error, stdout, stderr) => {
      if (error) {
        log('  ⚠️  PostgreSQL pode não estar rodando', 'yellow');
        log('    Certifique-se de que o PostgreSQL está instalado e ativo', 'yellow');
        resolve(false);
      } else {
        log('  ✓ PostgreSQL está rodando', 'green');
        resolve(true);
      }
    });
  });
};

// Função para criar banco de dados se não existir
const createDatabase = () => {
  return new Promise((resolve) => {
    log('🏗️  Verificando banco de dados...', 'blue');
    
    const dbName = process.env.DB_NAME || 'road_rw';
    const dbUser = process.env.DB_USER || 'postgres';
    
    exec(`psql -U ${dbUser} -lqt | cut -d \\| -f 1 | grep -qw ${dbName}`, (error) => {
      if (error) {
        log(`  📊 Criando banco ${dbName}...`, 'blue');
        
        exec(`createdb -U ${dbUser} ${dbName}`, (createError) => {
          if (createError) {
            log(`  ❌ Erro ao criar banco: ${createError.message}`, 'red');
            resolve(false);
          } else {
            log(`  ✓ Banco ${dbName} criado`, 'green');
            resolve(true);
          }
        });
      } else {
        log(`  ✓ Banco ${dbName} já existe`, 'green');
        resolve(true);
      }
    });
  });
};

// Função principal
const main = async () => {
  console.log('');
  log('🚀 ROAD-RW Backend Setup', 'blue');
  log('================================', 'blue');
  console.log('');
  
  // Verificar e instalar dependências
  const depsInstalled = await installDependencies();
  if (!depsInstalled) {
    log('❌ Falha na instalação de dependências', 'red');
    process.exit(1);
  }
  
  // Criar diretórios
  createDirectories();
  
  // Verificar arquivo .env
  const envExists = checkEnvFile();
  if (!envExists) {
    log('❌ Configure o arquivo .env antes de continuar', 'red');
    process.exit(1);
  }
  
  // Carregar variáveis de ambiente
  require('dotenv').config();
  
  // Verificar PostgreSQL
  const pgRunning = await checkPostgreSQL();
  
  // Criar banco se necessário
  if (pgRunning) {
    await createDatabase();
  }
  
  // Testar conexão com banco
  const dbConnected = await testDatabase();
  
  // Criar usuário admin
  if (dbConnected) {
    await createAdminUser();
  }
  
  console.log('');
  log('✅ Setup concluído!', 'green');
  log('================', 'green');
  console.log('');
  
  if (dbConnected) {
    log('Para iniciar o servidor:', 'blue');
    log('  npm run dev    # Desenvolvimento', 'blue');
    log('  npm start      # Produção', 'blue');
    console.log('');
    log('Health check: http://localhost:3001/health', 'blue');
    log('API Base: http://localhost:3001/api', 'blue');
  } else {
    log('⚠️  Configure o banco de dados antes de iniciar', 'yellow');
  }
  
  console.log('');
};

// Executar setup
if (require.main === module) {
  main().catch((error) => {
    log(`❌ Erro no setup: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };