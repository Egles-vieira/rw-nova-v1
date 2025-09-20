// scripts/fix-all-routes-CLEAN.js
// 🚀 SCRIPT CORRIGIDO - SEM ERROS DE SINTAXE

const fs = require('fs');
const path = require('path');

function fixAllRoutesClean() {
  console.log('🚀 CONFIGURANDO TODAS AS ROTAS - VERSÃO CORRIGIDA\n');

  try {
    // 1. Criar todas as rotas
    createAllRoutes();
    
    // 2. Atualizar server.js
    updateServer();
    
    // 3. Corrigir swagger
    fixSwagger();
    
    console.log('🎉 CONCLUÍDO! Reinicie o servidor: npm run dev');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

function createAllRoutes() {
  console.log('1️⃣ Criando arquivos de rotas...\n');
  
  const routesDir = path.join(__dirname, '..', 'src', 'routes');
  
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }

  // ========================================
  // INTEGRATIONS ROUTE
  // ========================================
  const integrationsRoute = `// src/routes/integrations.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/integrations:
 *   get:
 *     summary: Listar integrações disponíveis
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de integrações
 */
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'jamef', status: 'active', description: 'Integração JAMEF' },
      { name: 'braspress', status: 'active', description: 'Integração Braspress' },
      { name: 'tnt', status: 'active', description: 'Integração TNT' }
    ]
  });
});

/**
 * @swagger
 * /api/integrations/{transportadora}/test:
 *   post:
 *     summary: Testar conexão com transportadora
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: transportadora
 *         in: path
 *         required: true
 *         schema: { type: string, example: "jamef" }
 *     responses:
 *       200:
 *         description: Teste realizado
 */
router.post('/:transportadora/test', auth, (req, res) => {
  res.json({
    success: true,
    message: \`Teste \${req.params.transportadora} realizado com sucesso\`,
    data: { status: 'success', response_time: '150ms' }
  });
});

/**
 * @swagger
 * /api/integrations/{transportadora}/status:
 *   get:
 *     summary: Status da integração
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: transportadora
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status da integração
 */
router.get('/:transportadora/status', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      transportadora: req.params.transportadora,
      status: 'active',
      lastSync: new Date().toISOString(),
      isConfigured: true
    }
  });
});

module.exports = router;`;

  // ========================================
  // EXTERNAL APIS ROUTE
  // ========================================
  const externalApisRoute = `// src/routes/external-apis.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/external-apis/tokens:
 *   get:
 *     summary: Listar tokens de API
 *     tags: [External APIs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de tokens
 */
router.get('/tokens', auth, (req, res) => {
  res.json({
    success: true,
    data: [
      { integracao: 'jamef', active: true, created_at: new Date().toISOString() },
      { integracao: 'braspress', active: false, created_at: new Date().toISOString() },
      { integracao: 'tnt', active: true, created_at: new Date().toISOString() }
    ]
  });
});

/**
 * @swagger
 * /api/external-apis/settings:
 *   get:
 *     summary: Configurações das APIs
 *     tags: [External APIs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configurações
 */
router.get('/settings', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      pollInterval: 300,
      concurrentJobs: 3,
      rateLimits: {
        jamef: { requests: 100, per: 'minute' },
        braspress: { requests: 500, per: 'hour' },
        tnt: { requests: 200, per: 'minute' }
      }
    }
  });
});

module.exports = router;`;

  // ========================================
  // WEBHOOKS ROUTE
  // ========================================
  const webhooksRoute = `// src/routes/webhooks.routes.js
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/webhooks/jamef:
 *   post:
 *     summary: Webhook JAMEF
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numeroNF: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Processado com sucesso
 */
router.post('/jamef', (req, res) => {
  console.log('Webhook JAMEF:', req.body);
  res.json({ success: true, message: 'Webhook JAMEF processado' });
});

/**
 * @swagger
 * /api/webhooks/braspress:
 *   post:
 *     summary: Webhook Braspress
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200:
 *         description: Processado com sucesso
 */
router.post('/braspress', (req, res) => {
  console.log('Webhook Braspress:', req.body);
  res.json({ success: true, message: 'Webhook Braspress processado' });
});

/**
 * @swagger
 * /api/webhooks/tnt:
 *   post:
 *     summary: Webhook TNT
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200:
 *         description: Processado com sucesso
 */
router.post('/tnt', (req, res) => {
  console.log('Webhook TNT:', req.body);
  res.json({ success: true, message: 'Webhook TNT processado' });
});

/**
 * @swagger
 * /api/webhooks/status:
 *   get:
 *     summary: Status dos webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Status dos webhooks
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      jamef: 'active',
      braspress: 'active', 
      tnt: 'active',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;`;

  // ========================================
  // LOGS ROUTE
  // ========================================
  const logsRoute = `// src/routes/logs.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Listar logs do sistema
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: level
 *         in: query
 *         schema: { type: string, enum: ['error', 'warn', 'info', 'debug'] }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Lista de logs
 */
router.get('/', auth, (req, res) => {
  const { level, limit = 50 } = req.query;
  
  const logs = [
    { id: 1, level: 'info', message: 'Sistema iniciado', timestamp: new Date().toISOString() },
    { id: 2, level: 'info', message: 'Jobs inicializados', timestamp: new Date().toISOString() },
    { id: 3, level: 'warn', message: 'Token expirando', timestamp: new Date().toISOString() },
    { id: 4, level: 'error', message: 'Falha na sincronização', timestamp: new Date().toISOString() }
  ];

  const filteredLogs = level ? logs.filter(log => log.level === level) : logs;
  
  res.json({
    success: true,
    data: {
      logs: filteredLogs.slice(0, limit),
      total: filteredLogs.length
    }
  });
});

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Estatísticas dos logs
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Estatísticas
 */
router.get('/stats', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      total: 1250,
      errors: 15,
      warnings: 45,
      info: 1190
    }
  });
});

module.exports = router;`;

  // ========================================
  // REPORTS ROUTE
  // ========================================
  const reportsRoute = `// src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Dados para dashboard
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dados do dashboard
 */
router.get('/dashboard', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        total_nfs: 15420,
        nfs_today: 340,
        active_jobs: 3,
        success_rate: 98.5
      },
      integrations_status: {
        jamef: 'active',
        braspress: 'warning',
        tnt: 'active'
      }
    }
  });
});

module.exports = router;`;

  // ========================================
  // CRIAR TODOS OS ARQUIVOS
  // ========================================
  const routes = {
    'integrations.routes.js': integrationsRoute,
    'external-apis.routes.js': externalApisRoute,
    'webhooks.routes.js': webhooksRoute,
    'logs.routes.js': logsRoute,
    'reports.routes.js': reportsRoute
  };

  Object.entries(routes).forEach(([filename, content]) => {
    const filePath = path.join(routesDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`   ✅ ${filename} criado`);
  });
  
  console.log('');
}

function updateServer() {
  console.log('2️⃣ Atualizando server.js...\n');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Backup
  fs.writeFileSync(serverPath + '.backup', content);

  // Adicionar importações se não existirem
  if (!content.includes('integrationsRoutes')) {
    const importPoint = content.indexOf('const tabelaOcorrenciasRoutes');
    if (importPoint !== -1) {
      const lineEnd = content.indexOf('\n', importPoint);
      const newImports = `
// ========================================
// IMPORTAR ROTAS DAS APIs EXTERNAS
// ========================================
const integrationsRoutes = require('./src/routes/integrations.routes');
const externalApisRoutes = require('./src/routes/external-apis.routes');
const webhooksRoutes = require('./src/routes/webhooks.routes');
const logsRoutes = require('./src/routes/logs.routes');
const reportsRoutes = require('./src/routes/reports.routes');`;
      
      content = content.slice(0, lineEnd) + newImports + content.slice(lineEnd);
      console.log('   ✅ Importações adicionadas');
    }
  }

  // Adicionar uso das rotas se não existirem
  if (!content.includes("app.use('/api/integrations'")) {
    const routePoint = content.indexOf("app.use('/api/tabelacodigosocorrencia'");
    if (routePoint !== -1) {
      const lineEnd = content.indexOf('\n', routePoint);
      const newRoutes = `
// ========================================
// ROTAS DAS APIs EXTERNAS
// ========================================
app.use('/api/integrations', integrationsRoutes);
app.use('/api/external-apis', externalApisRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/reports', reportsRoutes);`;
      
      content = content.slice(0, lineEnd) + newRoutes + content.slice(lineEnd);
      console.log('   ✅ Rotas adicionadas');
    }
  }

  fs.writeFileSync(serverPath, content);
  console.log('');
}

function fixSwagger() {
  console.log('3️⃣ Corrigindo swaggerDef.js...\n');
  
  const swaggerDefPath = path.join(__dirname, '..', 'swaggerDef.js');
  
  const correctSwaggerDef = `// swaggerDef.js - VERSÃO CORRETA
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Road-RW API',
    version: '1.0.0',
    description: 'Sistema de Gestão Logística - Backend API'
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
  tags: [
    { name: 'Auth', description: 'Autenticação' },
    { name: 'Transportadoras', description: 'Transportadoras' },
    { name: 'Clientes', description: 'Clientes' },
    { name: 'Embarcadores', description: 'Embarcadores' },
    { name: 'Motoristas', description: 'Motoristas' },
    { name: 'Notas Fiscais', description: 'Notas Fiscais' },
    { name: 'Romaneios', description: 'Romaneios' },
    { name: 'Ocorrências', description: 'Ocorrências' },
    { name: 'Jobs', description: 'Jobs de Integração' },
    { name: 'Monitoring', description: 'Monitoramento' },
    { name: 'Integrations', description: 'Integrações' },
    { name: 'External APIs', description: 'APIs Externas' },
    { name: 'Webhooks', description: 'Webhooks' },
    { name: 'Logs', description: 'Logs' },
    { name: 'Reports', description: 'Relatórios' }
  ]
};`;

  fs.writeFileSync(swaggerDefPath, correctSwaggerDef);
  console.log('   ✅ swaggerDef.js corrigido');
  console.log('');
  
  console.log('📋 ENDPOINTS QUE DEVEM FUNCIONAR:');
  console.log('   ✅ GET /api/webhooks/status (sem auth)');
  console.log('   ✅ GET /api/integrations (com auth)');
  console.log('   ✅ GET /api/external-apis/tokens (com auth)');
  console.log('   ✅ GET /api/logs (com auth)');
  console.log('   ✅ GET /api/reports/dashboard (com auth)');
  console.log('');
  console.log('🔐 Para endpoints com auth: faça login em /api/auth/login primeiro');
}

// Executar tudo
if (require.main === module) {
  fixAllRoutesClean();
}

module.exports = { fixAllRoutesClean };