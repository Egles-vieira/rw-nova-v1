// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./src/config/env');
const logger = require('./src/config/logger');
const db = require('./src/database/connection');

// ==============================
// Rotas de domínio
// ==============================
const authRoutes = require('./src/routes/auth.routes');
const transportadorasRoutes = require('./src/routes/transportadoras.routes');
const clientesRoutes = require('./src/routes/clientes.routes');
const embarcadoresRoutes = require('./src/routes/embarcadores.routes');
const motoristasRoutes = require('./src/routes/motoristas.routes');
const notasFiscaisRoutes = require('./src/routes/notas-fiscais.routes');
const enderecoEntregaRoutes = require('./src/routes/endereco-entrega.routes');
const romaneiosRoutes = require('./src/routes/romaneios.routes');
const ocorrenciasRoutes = require('./src/routes/ocorrencias.routes');
const transportadoraCodigoRoutes = require('./src/routes/transportadora-codigo-ocorrencia.routes');
const codigoOcorrenciasRoutes = require('./src/routes/codigo-ocorrencias.routes');
const reportsRoutes = require('./src/routes/reports.routes');
// No início do arquivo, junto com as outras importações de rotas:
const webhookRoutes = require('./src/routes/webhook.routes');
const notaFiscalOcorrenciasRoutes = require('./src/routes/nota-fiscal-ocorrencias.routes');

// ==============================
// Rotas de integrações/monitoramento/logs
// ==============================
const integrationsRoutes = require('./src/routes/integrations.routes');
const externalApisRoutes = require('./src/routes/external-apis.routes');
const webhooksRoutes = require('./src/routes/webhooks.routes');
const logsRoutes = require('./src/routes/logs.routes');

// ==============================
// Jobs & Monitoring (fábricas)
// ==============================
const JobManagerService = require('./src/services/jobs/job-manager.service');
const createJobsRouter = require('./src/routes/jobs.routes');
const createMonitoringRouter = require('./src/routes/monitoring.routes');

// ==============================
// Swagger
// ==============================
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./swaggerDef');

const app = express();

// ----------------------------------------------------------------------------
// Swagger (gera spec a partir das anotações JSDoc nas rotas)
// ----------------------------------------------------------------------------
const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    // opcional: './src/controllers/*.js'
  ],
});

const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #fafafa; border: 1px solid #d3d3d3; }
  `,
  customSiteTitle: 'Road-RW API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

// ==============================
// Middlewares de segurança e parsing
// ==============================
app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: config?.cors?.origin ?? '*',
    credentials: config?.cors?.credentials ?? true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(compression());

// Rate limit global
const globalLimiter = rateLimit({
  windowMs: config?.rateLimit?.windowMs ?? 15 * 60 * 1000,
  max: config?.rateLimit?.max ?? 300,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Rate limit específico de auth
const authLimiter = rateLimit({
  windowMs: config?.rateLimit?.windowMs ?? 15 * 60 * 1000,
  max: config?.rateLimit?.authMax ?? 50,
  message: { success: false, message: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log simples de requisição com duração
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    try {
      logger.info(`${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    } catch {
      // noop
    }
  });
  next();
});

// ==============================
// Swagger UI
// ==============================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ==============================
// Jobs: inicialização (não bloqueante)
// ==============================
let jobManager = null;
try {
  jobManager = new JobManagerService(db);
} catch (e) {
  logger?.warn?.('JobManager não pôde ser criado agora. Endpoints de /api/jobs responderão como não inicializados.');
}

// ==============================
// Health & System Status
// ==============================
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    let jobsHealth = { status: 'unknown' };

    if (jobManager && jobManager.isInitialized) {
      try {
        jobsHealth = (await jobManager.getHealthStatus?.()) ?? { status: 'active' };
      } catch (err) {
        jobsHealth = { status: 'error', message: err.message };
      }
    }

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config?.nodeEnv ?? process.env.NODE_ENV ?? 'development',
      database: dbHealth,
      jobs: jobsHealth,
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

app.get('/api/system/status', async (req, res) => {
  try {
    const status = {
      system: {
        port: config?.port ?? process.env.PORT ?? 3001,
        environment: config?.nodeEnv ?? process.env.NODE_ENV ?? 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      database: await db.healthCheck(),
      jobs: { status: 'not_initialized' },
      integrations: [],
    };

    if (jobManager && jobManager.isInitialized) {
      try {
        if (typeof jobManager.getHealthStatus === 'function') {
          status.jobs = await jobManager.getHealthStatus();
        } else if (typeof jobManager.getStatus === 'function') {
          status.jobs = await jobManager.getStatus();
        } else {
          status.jobs = { status: 'active', initialized: jobManager.isInitialized };
        }

        if (typeof jobManager.getIntegrationsStatus === 'function') {
          status.integrations = await jobManager.getIntegrationsStatus();
        }
      } catch (error) {
        status.jobs = { status: 'error', message: error.message };
      }
    }

    res.json({ success: true, data: status });
  } catch (error) {
    logger?.error?.('Erro ao obter status do sistema:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter status do sistema', error: error.message });
  }
});

// ==============================
// Rotas da API (ordem importa!)
// ==============================

// Auth com rate limit dedicado
app.use('/api/auth', authLimiter, authRoutes);

// Domínio
app.use('/api/transportadoras', transportadorasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/embarcadores', embarcadoresRoutes);
app.use('/api/motoristas', motoristasRoutes);
app.use('/api/notas-fiscais', notasFiscaisRoutes);
app.use('/api/enderecos-entrega', enderecoEntregaRoutes);
app.use('/api/romaneios', romaneiosRoutes);
app.use('/api/ocorrencias', ocorrenciasRoutes);
app.use('/api/codigos-ocorrencia', codigoOcorrenciasRoutes);
app.use('/api/notas-fiscais', notaFiscalOcorrenciasRoutes);

// Prefixo CORRETO para os vínculos de códigos/transportadoras
app.use('/api/transportadora-codigo-ocorrencia', transportadoraCodigoRoutes);

// Integrações / Webhooks / Logs / Reports
app.use('/api/integrations', integrationsRoutes);
app.use('/api/external-apis', externalApisRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/reports', reportsRoutes);

// Jobs & Monitoring (fábricas recebem o jobManager)
app.use('/api/jobs', createJobsRouter(jobManager));
app.use('/api/monitoring', createMonitoringRouter(jobManager));

// ==============================
// 404 — manter por ÚLTIMO
// ==============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    method: req.method,
    path: req.originalUrl,
  });
});

module.exports = app;

// ==============================
// BOOTSTRAP: inicia servidor quando chamado diretamente
// ==============================
if (require.main === module) {
  const PORT = Number(process.env.PORT) || Number(config?.port) || 3001;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    try {
      logger.info(`HTTP server listening on http://${HOST}:${PORT}`);
    } catch {
      console.log(`HTTP server listening on http://${HOST}:${PORT}`);
    }
  });

  // Hardening: logs e shutdown limpo
  process.on('unhandledRejection', (err) => {
    try { logger.error('unhandledRejection', { message: err?.message, stack: err?.stack }); } catch {}
  });
  process.on('uncaughtException', (err) => {
    try { logger.error('uncaughtException', { message: err?.message, stack: err?.stack }); } catch {}
    // opcional: process.exit(1);
  });
  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
