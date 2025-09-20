// scripts/fix-swagger-endpoints.js
const { createMissingRoutes } = require('./create-missing-routes');
const { addRoutesToServer } = require('./add-routes-to-server');

async function fixSwaggerEndpoints() {
  console.log('🚀 Corrigindo endpoints do Swagger...\n');

  try {
    // Passo 1: Criar arquivos de rotas
    console.log('1️⃣ Criando arquivos de rotas...');
    createMissingRoutes();

    // Passo 2: Adicionar rotas ao server.js
    console.log('\n2️⃣ Adicionando rotas ao server.js...');
    addRoutesToServer();

    console.log('\n🎉 CORREÇÃO CONCLUÍDA!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Reinicie o servidor: npm run dev');
    console.log('2. Acesse o Swagger: http://localhost:3001/api-docs');
    console.log('3. Teste os endpoints:');
    console.log('   • GET /api/integrations (requer auth)');
    console.log('   • GET /api/webhooks/status (sem auth)');
    console.log('   • GET /api/external-apis/tokens (requer auth)');
    console.log('   • GET /api/logs (requer auth)');
    
    console.log('\n🔑 Para testar endpoints com autenticação:');
    console.log('   • Primeiro faça login em /api/auth/login');
    console.log('   • Copie o token JWT');
    console.log('   • No Swagger, clique em "Authorize" e cole o token');
    
    console.log('\n📁 ARQUIVOS CRIADOS:');
    console.log('   • src/routes/integrations.routes.js');
    console.log('   • src/routes/external-apis.routes.js');
    console.log('   • src/routes/webhooks.routes.js');
    console.log('   • src/routes/logs.routes.js');
    
    console.log('\n📄 BACKUPS:');
    console.log('   • server.js.backup');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    return false;
  }

  return true;
}

// Lista de endpoints que devem funcionar após a correção
function listExpectedEndpoints() {
  console.log('\n📋 ENDPOINTS DISPONÍVEIS APÓS CORREÇÃO:');
  
  const endpoints = [
    { method: 'GET', path: '/api/integrations', auth: '🔐', description: 'Listar integrações' },
    { method: 'POST', path: '/api/integrations/{transportadora}/test', auth: '🔐', description: 'Testar integração' },
    { method: 'GET', path: '/api/integrations/{transportadora}/status', auth: '🔐', description: 'Status da integração' },
    { method: 'GET', path: '/api/external-apis/tokens', auth: '🔐', description: 'Listar tokens' },
    { method: 'GET', path: '/api/external-apis/settings', auth: '🔐', description: 'Configurações' },
    { method: 'POST', path: '/api/webhooks/jamef', auth: '❌', description: 'Webhook JAMEF' },
    { method: 'POST', path: '/api/webhooks/braspress', auth: '❌', description: 'Webhook Braspress' },
    { method: 'POST', path: '/api/webhooks/tnt', auth: '❌', description: 'Webhook TNT' },
    { method: 'GET', path: '/api/webhooks/status', auth: '❌', description: 'Status webhooks' },
    { method: 'GET', path: '/api/logs', auth: '🔐', description: 'Listar logs' },
    { method: 'GET', path: '/api/logs/stats', auth: '🔐', description: 'Estatísticas logs' }
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`   ${endpoint.auth} ${endpoint.method.padEnd(4)} ${endpoint.path.padEnd(40)} - ${endpoint.description}`);
  });
  
  console.log('\n🔐 = Requer autenticação JWT');
  console.log('❌ = Sem autenticação');
}

if (require.main === module) {
  fixSwaggerEndpoints().then(success => {
    if (success) {
      listExpectedEndpoints();
    }
  });
}

module.exports = { fixSwaggerEndpoints };