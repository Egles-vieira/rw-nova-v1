// scripts/add-routes-to-server.js
const fs = require('fs');
const path = require('path');

function addRoutesToServer() {
  console.log('🔧 Adicionando rotas ao server.js...');

  const serverPath = path.join(__dirname, '..', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ Arquivo server.js não encontrado');
    return false;
  }

  let content = fs.readFileSync(serverPath, 'utf8');

  // Importações das novas rotas
  const imports = `
// ========================================
// IMPORTAR ROTAS DAS APIs EXTERNAS
// ========================================
const integrationsRoutes = require('./src/routes/integrations.routes');
const externalApisRoutes = require('./src/routes/external-apis.routes');
const webhooksRoutes = require('./src/routes/webhooks.routes');
const logsRoutes = require('./src/routes/logs.routes');`;

  // Uso das rotas
  const routeUsage = `
// ========================================
// ROTAS DAS APIs EXTERNAS
// ========================================
app.use('/api/integrations', integrationsRoutes);
app.use('/api/external-apis', externalApisRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/logs', logsRoutes);`;

  // Verificar se as importações já existem
  if (content.includes('integrationsRoutes')) {
    console.log('ℹ️  Importações das rotas já existem');
  } else {
    // Adicionar importações após as outras importações de rotas
    const lastImportIndex = content.lastIndexOf('const tabelaOcorrenciasRoutes');
    if (lastImportIndex !== -1) {
      const lineEnd = content.indexOf('\n', lastImportIndex);
      content = 
        content.slice(0, lineEnd) + 
        imports + 
        content.slice(lineEnd);
      console.log('✅ Importações adicionadas');
    }
  }

  // Verificar se o uso das rotas já existe
  if (content.includes("app.use('/api/integrations'")) {
    console.log('ℹ️  Rotas já estão sendo usadas');
  } else {
    // Adicionar uso das rotas após as rotas existentes
    const lastRouteIndex = content.lastIndexOf("app.use('/api/tabelacodigosocorrencia'");
    if (lastRouteIndex !== -1) {
      const lineEnd = content.indexOf('\n', lastRouteIndex);
      content = 
        content.slice(0, lineEnd) + 
        routeUsage + 
        content.slice(lineEnd);
      console.log('✅ Uso das rotas adicionado');
    }
  }

  // Remover rotas comentadas se existirem
  content = content
    .replace(/\/\/ app\.use\('\/api\/integrations',.*?\);/g, '')
    .replace(/\/\/ app\.use\('\/api\/external-apis',.*?\);/g, '')
    .replace(/\/\/ app\.use\('\/api\/webhooks',.*?\);/g, '')
    .replace(/\/\/ app\.use\('\/api\/logs',.*?\);/g, '');

  // Salvar arquivo
  fs.writeFileSync(serverPath + '.backup', fs.readFileSync(serverPath, 'utf8'));
  fs.writeFileSync(serverPath, content);
  
  console.log('✅ server.js atualizado');
  return true;
}

if (require.main === module) {
  addRoutesToServer();
}

module.exports = { addRoutesToServer };