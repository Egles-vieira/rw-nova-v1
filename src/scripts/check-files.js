#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Lista de arquivos obrigatórios
const requiredFiles = [
  // Configuração
  'src/config/env.js',
  'src/config/logger.js',
  
  // Database
  'src/database/connection.js',
  
  // Repositories
  'src/repositories/base.repository.js',
  'src/repositories/users.repository.js',
  'src/repositories/transportadoras.repository.js',
  
  // Controllers
  'src/controllers/base.controller.js',
  'src/controllers/auth.controller.js',
  'src/controllers/transportadoras.controller.js',
  
  // Middlewares
  'src/middlewares/auth.middleware.js',
  'src/middlewares/validate.middleware.js',
  'src/middlewares/error.middleware.js',
  
  // Routes
  'src/routes/auth.routes.js',
  'src/routes/transportadoras.routes.js',
  
  // Validations
  'src/validations/auth.validation.js',
  'src/validations/transportadoras.validation.js',
  
  // Utils
  'src/utils/constants.js',
  'src/utils/validators.js',
  
  // Principais
  'server.js',
  'package.json',
  '.env'
];

console.log('Verificando arquivos necessários...\n');

let missingFiles = [];
let existingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file}`);
    existingFiles.push(file);
  } else {
    console.log(`✗ ${file} - FALTANDO`);
    missingFiles.push(file);
  }
});

console.log('\n=== RESUMO ===');
console.log(`Arquivos encontrados: ${existingFiles.length}`);
console.log(`Arquivos faltando: ${missingFiles.length}`);

if (missingFiles.length > 0) {
  console.log('\nArquivos faltando:');
  missingFiles.forEach(file => {
    console.log(`- ${file}`);
  });
  
  console.log('\nCrie os arquivos faltando antes de continuar.');
  process.exit(1);
} else {
  console.log('\nTodos os arquivos necessários estão presentes!');
  
  // Verificar .env
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !envContent.includes(envVar));
    
    if (missingEnvVars.length > 0) {
      console.log('\nVariáveis faltando no .env:');
      missingEnvVars.forEach(envVar => {
        console.log(`- ${envVar}`);
      });
    } else {
      console.log('\nTodas as variáveis de ambiente estão configuradas!');
    }
  }
}