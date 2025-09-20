// scripts/check-swagger-config.js
const fs = require('fs');
const path = require('path');

function checkSwaggerConfig() {
  console.log('🔍 Verificando configuração do Swagger...');

  // Verificar swaggerDef.js
  const swaggerDefPath = path.join(__dirname, '..', 'swaggerDef.js');
  
  if (fs.existsSync(swaggerDefPath)) {
    console.log('📄 Arquivo swaggerDef.js encontrado');
    
    const content = fs.readFileSync(swaggerDefPath, 'utf8');
    
    // Verificar se há basePath ou servers configurados incorretamente
    if (content.includes('basePath')) {
      console.log('⚠️  Configuração basePath encontrada no swaggerDef.js');
      console.log('   Isso pode causar duplicação de paths (/api/api/)');
    }
    
    if (content.includes('servers')) {
      console.log('⚠️  Configuração servers encontrada no swaggerDef.js');
      if (content.includes('url') && content.includes('/api')) {
        console.log('   ❌ URL do servidor inclui /api - isso causa duplicação!');
        console.log('   💡 Remova /api da URL do servidor ou dos paths das rotas');
      }
    }
    
    // Procurar por configurações problemáticas
    const problematicPatterns = [
      { pattern: /basePath.*\/api/i, message: 'basePath inclui /api' },
      { pattern: /url.*\/api/i, message: 'URL do servidor inclui /api' }
    ];
    
    problematicPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        console.log(`   ❌ Problema encontrado: ${message}`);
      }
    });
    
  } else {
    console.log('❌ Arquivo swaggerDef.js não encontrado');
    console.log('💡 Criando arquivo swaggerDef.js básico...');
    createBasicSwaggerDef();
  }
}

function createBasicSwaggerDef() {
  const swaggerDefContent = `// swaggerDef.js
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Road-RW API',
    version: '1.0.0',
    description: 'Sistema de Gestão Logística - API Documentation',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor de Desenvolvimento'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};`;

  const swaggerDefPath = path.join(__dirname, '..', 'swaggerDef.js');
  fs.writeFileSync(swaggerDefPath, swaggerDefContent);
  console.log('✅ Arquivo swaggerDef.js criado');
}

function fixSwaggerConfig() {
  console.log('🔧 Corrigindo configuração do Swagger...');
  
  const swaggerDefPath = path.join(__dirname, '..', 'swaggerDef.js');
  
  if (!fs.existsSync(swaggerDefPath)) {
    createBasicSwaggerDef();
    return;
  }
  
  let content = fs.readFileSync(swaggerDefPath, 'utf8');
  let modified = false;
  
  // Corrigir URLs problemáticas
  if (content.includes('http://localhost:3001/api')) {
    content = content.replace(/http:\/\/localhost:3001\/api/g, 'http://localhost:3001');
    modified = true;
    console.log('✅ URL do servidor corrigida (removido /api)');
  }
  
  // Remover basePath se existir
  if (content.includes('basePath')) {
    content = content.replace(/basePath:.*,?\n/g, '');
    modified = true;
    console.log('✅ basePath removido');
  }
  
  if (modified) {
    fs.writeFileSync(swaggerDefPath + '.backup', fs.readFileSync(swaggerDefPath, 'utf8'));
    fs.writeFileSync(swaggerDefPath, content);
    console.log('✅ Configuração do Swagger corrigida');
  } else {
    console.log('ℹ️  Configuração do Swagger parece estar correta');
  }
}

if (require.main === module) {
  checkSwaggerConfig();
  fixSwaggerConfig();
}

module.exports = { checkSwaggerConfig, fixSwaggerConfig };