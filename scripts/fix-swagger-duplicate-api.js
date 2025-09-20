// scripts/fix-swagger-duplicate-api.js
const fs = require('fs');
const path = require('path');

function fixSwaggerDuplicateAPI() {
  console.log('🔧 Corrigindo duplicação /api/api/ no Swagger...');

  const swaggerDefPath = path.join(__dirname, '..', 'swaggerDef.js');
  
  if (!fs.existsSync(swaggerDefPath)) {
    console.log('❌ Arquivo swaggerDef.js não encontrado. Criando...');
    createCorrectSwaggerDef();
    return;
  }

  // Ler arquivo atual
  let content = fs.readFileSync(swaggerDefPath, 'utf8');
  console.log('📄 Conteúdo atual do swaggerDef.js:');
  console.log(content.substring(0, 300) + '...');

  // Fazer backup
  fs.writeFileSync(swaggerDefPath + '.backup', content);

  // Criar versão corrigida
  createCorrectSwaggerDef();
  
  console.log('✅ swaggerDef.js corrigido!');
}

function createCorrectSwaggerDef() {
  const swaggerDefPath = path.join(__dirname, '..', 'swaggerDef.js');
  
  // Configuração CORRETA sem duplicação
  const correctSwaggerDef = `// swaggerDef.js - Configuração CORRETA
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Road-RW API',
    version: '1.0.0',
    description: 'Sistema de Gestão Logística - Backend API',
    contact: {
      name: 'Road-RW Team',
      email: 'suporte@road-rw.com'
    }
  },
  // IMPORTANTE: NÃO incluir /api na URL do servidor
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor de Desenvolvimento'
    },
    {
      url: 'http://localhost:3000',
      description: 'Servidor Alternativo'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtido através do endpoint /api/auth/login'
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Token de acesso não fornecido ou inválido',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Token inválido' }
              }
            }
          }
        }
      },
      NotFound: {
        description: 'Recurso não encontrado',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Recurso não encontrado' }
              }
            }
          }
        }
      }
    }
  },
  // Não definir security global - deixar cada rota definir individualmente
  tags: [
    { name: 'Auth', description: 'Autenticação e autorização' },
    { name: 'Transportadoras', description: 'Gerenciamento de transportadoras' },
    { name: 'Clientes', description: 'Gerenciamento de clientes' },
    { name: 'Notas Fiscais', description: 'Gerenciamento de notas fiscais' },
    { name: 'Jobs', description: 'Gerenciamento de jobs de integração' },
    { name: 'Monitoring', description: 'Monitoramento do sistema' },
    { name: 'Integrations', description: 'Operações de integração com transportadoras' },
    { name: 'External APIs', description: 'Configuração de APIs externas' },
    { name: 'Webhooks', description: 'Endpoints para receber dados externos' },
    { name: 'Logs', description: 'Visualização de logs do sistema' }
  ]
};`;

  fs.writeFileSync(swaggerDefPath, correctSwaggerDef);
  console.log('✅ Arquivo swaggerDef.js criado/atualizado corretamente');
}

function checkServerJsSwaggerConfig() {
  console.log('🔍 Verificando configuração do Swagger no server.js...');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.js não encontrado');
    return;
  }

  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Verificar se há configurações problemáticas
  const problems = [];
  
  if (content.includes('basePath')) {
    problems.push('basePath encontrado no server.js (deve estar no swaggerDef.js)');
  }
  
  if (content.match(/servers.*\/api/)) {
    problems.push('URL do servidor inclui /api (remove /api da URL)');
  }
  
  if (problems.length > 0) {
    console.log('⚠️  Problemas encontrados no server.js:');
    problems.forEach(problem => console.log(`   • ${problem}`));
  } else {
    console.log('✅ Configuração do Swagger no server.js parece correta');
  }
}

function testSwaggerEndpoints() {
  console.log('\n🧪 URLs que devem funcionar após a correção:');
  
  const endpoints = [
    'http://localhost:3001/api/auth/login',
    'http://localhost:3001/api/webhooks/status', 
    'http://localhost:3001/api/integrations',
    'http://localhost:3001/api/external-apis/tokens',
    'http://localhost:3001/health',
    'http://localhost:3001/api-docs'
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`   ✅ ${endpoint}`);
  });
  
  console.log('\n❌ URLs que NÃO devem mais aparecer:');
  console.log('   ❌ http://localhost:3001/api/api/auth/login');
  console.log('   ❌ http://localhost:3001/api/api/webhooks/status');
}

function main() {
  console.log('🚀 CORRIGINDO DUPLICAÇÃO /api/api/ NO SWAGGER\n');
  
  fixSwaggerDuplicateAPI();
  checkServerJsSwaggerConfig();
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Reinicie o servidor: npm run dev');
  console.log('2. Acesse o Swagger: http://localhost:3001/api-docs');
  console.log('3. Verifique se as URLs estão corretas (sem /api/api/)');
  console.log('4. Teste um endpoint sem auth: GET /api/webhooks/status');
  
  testSwaggerEndpoints();
  
  console.log('\n💾 BACKUP:');
  console.log('   • swaggerDef.js.backup (arquivo original salvo)');
}

if (require.main === module) {
  main();
}

module.exports = { fixSwaggerDuplicateAPI };