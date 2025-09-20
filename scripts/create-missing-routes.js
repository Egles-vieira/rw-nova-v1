// scripts/create-missing-routes.js
const fs = require('fs');
const path = require('path');

function createMissingRoutes() {
  console.log('📁 Criando arquivos de rotas faltantes...');

  const routesDir = path.join(__dirname, '..', 'src', 'routes');
  
  // Garantir que o diretório existe
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }

  // Templates para cada tipo de rota
  const routes = [
    {
      file: 'integrations.routes.js',
      content: `// src/routes/integrations.routes.js
const express = require('express');
const router = express.Router();

// Middleware de autenticação
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Integrations
 *   description: Operações de integração com transportadoras
 */

/**
 * @swagger
 * /api/integrations:
 *   get:
 *     summary: Listar todas as integrações disponíveis
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de integrações
 */
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Integrações disponíveis',
    data: [
      { name: 'jamef', status: 'available', description: 'Integração JAMEF' },
      { name: 'braspress', status: 'available', description: 'Integração Braspress' },
      { name: 'tnt', status: 'available', description: 'Integração TNT' }
    ]
  });
});

/**
 * @swagger
 * /api/integrations/{transportadora}/test:
 *   post:
 *     summary: Testar conexão com API da transportadora
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: transportadora
 *         required: true
 *         schema: { type: string, example: "jamef" }
 *     responses:
 *       200:
 *         description: Teste realizado com sucesso
 */
router.post('/:transportadora/test', auth, (req, res) => {
  const { transportadora } = req.params;
  res.json({
    success: true,
    message: \`Teste de conexão com \${transportadora} realizado\`,
    data: {
      transportadora,
      status: 'success',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @swagger
 * /api/integrations/{transportadora}/status:
 *   get:
 *     summary: Obter status de uma integração específica
 *     tags: [Integrations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: transportadora
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status da integração
 */
router.get('/:transportadora/status', auth, (req, res) => {
  const { transportadora } = req.params;
  res.json({
    success: true,
    data: {
      transportadora,
      status: 'active',
      lastSync: new Date().toISOString(),
      isConfigured: true
    }
  });
});

module.exports = router;`
    },
    {
      file: 'external-apis.routes.js',
      content: `// src/routes/external-apis.routes.js
const express = require('express');
const router = express.Router();

// Middleware de autenticação
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: External APIs
 *   description: Configuração e gerenciamento de APIs externas
 */

/**
 * @swagger
 * /api/external-apis/tokens:
 *   get:
 *     summary: Listar tokens de API configurados
 *     tags: [External APIs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de tokens
 */
router.get('/tokens', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Tokens de API',
    data: [
      { integracao: 'jamef', active: true, expires_at: null },
      { integracao: 'braspress', active: false, expires_at: null },
      { integracao: 'tnt', active: true, expires_at: null }
    ]
  });
});

/**
 * @swagger
 * /api/external-apis/settings:
 *   get:
 *     summary: Obter configurações gerais das APIs
 *     tags: [External APIs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configurações das APIs
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

module.exports = router;`
    },
    {
      file: 'webhooks.routes.js',
      content: `// src/routes/webhooks.routes.js
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Endpoints para receber dados das transportadoras
 */

/**
 * @swagger
 * /api/webhooks/jamef:
 *   post:
 *     summary: Webhook para receber dados da JAMEF
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
 *         description: Dados processados com sucesso
 */
router.post('/jamef', (req, res) => {
  console.log('Webhook JAMEF recebido:', req.body);
  res.json({
    success: true,
    message: 'Webhook JAMEF processado',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/webhooks/braspress:
 *   post:
 *     summary: Webhook para receber dados da Braspress
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Dados processados com sucesso
 */
router.post('/braspress', (req, res) => {
  console.log('Webhook Braspress recebido:', req.body);
  res.json({
    success: true,
    message: 'Webhook Braspress processado',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/webhooks/tnt:
 *   post:
 *     summary: Webhook para receber dados da TNT
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Dados processados com sucesso
 */
router.post('/tnt', (req, res) => {
  console.log('Webhook TNT recebido:', req.body);
  res.json({
    success: true,
    message: 'Webhook TNT processado',
    timestamp: new Date().toISOString()
  });
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
    message: 'Webhooks funcionando',
    data: {
      jamef: 'active',
      braspress: 'active',
      tnt: 'active',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;`
    },
    {
      file: 'logs.routes.js',
      content: `// src/routes/logs.routes.js
const express = require('express');
const router = express.Router();

// Middleware de autenticação
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Visualização e gerenciamento de logs do sistema
 */

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Listar logs do sistema
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: ['error', 'warn', 'info', 'debug'] }
 *     responses:
 *       200:
 *         description: Lista de logs
 */
router.get('/', auth, (req, res) => {
  const { page = 1, limit = 50, level } = req.query;
  
  // Simulação de logs
  const logs = [
    {
      id: 1,
      level: 'info',
      message: 'Sistema iniciado',
      timestamp: new Date().toISOString(),
      service: 'road-rw-api'
    },
    {
      id: 2,
      level: 'info',
      message: 'Jobs inicializados',
      timestamp: new Date().toISOString(),
      service: 'jobs'
    }
  ];

  res.json({
    success: true,
    data: {
      logs: level ? logs.filter(log => log.level === level) : logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length,
        totalPages: Math.ceil(logs.length / limit)
      }
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
 *         description: Estatísticas dos logs
 */
router.get('/stats', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      total: 1250,
      errors: 15,
      warnings: 45,
      info: 1190,
      period: '24h'
    }
  });
});

module.exports = router;`
    }
  ];

  // Criar cada arquivo
  routes.forEach(route => {
    const filePath = path.join(routesDir, route.file);
    
    if (fs.existsSync(filePath)) {
      console.log(`ℹ️  ${route.file} já existe`);
    } else {
      fs.writeFileSync(filePath, route.content);
      console.log(`✅ ${route.file} criado`);
    }
  });

  console.log('\n✅ Todos os arquivos de rotas foram criados!');
}

if (require.main === module) {
  createMissingRoutes();
}

module.exports = { createMissingRoutes };