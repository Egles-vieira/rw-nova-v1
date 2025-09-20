// scripts/setup-apis-complete.js
require('dotenv').config();
const { fixApiTokensTable } = require('./fix-api-tokens-table');
const { setupExternalAPIs } = require('./setup-external-apis');
const { verifySetup } = require('./verify-setup');

console.log('🚀 Configuração completa das APIs externas...\n');

async function setupAPIsComplete() {
  try {
    console.log('1️⃣ Fase 1: Corrigindo estrutura da tabela api_tokens...');
    await fixApiTokensTable();
    
    console.log('\n2️⃣ Fase 2: Configurando APIs externas...');
    await setupExternalAPIs();
    
    console.log('\n3️⃣ Fase 3: Verificando configuração...');
    await verifySetup();
    
    console.log('\n🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Configure os tokens no .env:');
    console.log('   JAMEF_API_TOKEN=seu_token_aqui');
    console.log('   BRASPRESS_API_TOKEN=seu_token_aqui');
    console.log('   TNT_API_TOKEN=seu_token_aqui');
    console.log('');
    console.log('2. Execute novamente para configurar os tokens:');
    console.log('   npm run setup:apis:complete');
    console.log('');
    console.log('3. Inicie o servidor:');
    console.log('   npm run dev');
    console.log('');
    console.log('4. Teste os endpoints:');
    console.log('   npm run test:endpoints');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupAPIsComplete();
}

module.exports = { setupAPIsComplete };