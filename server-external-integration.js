// ==========================================
// 3. INTEGRAÇÃO NO SERVER.JS PRINCIPAL
// ==========================================
// backend/server-external-integration.js

/**
 * Adicionar estas linhas no server.js principal após a inicialização dos jobs
 */

const ExternalApiManagerService = require('./src/services/external/external-api-manager.service');
const { createExternalRateLimit } = require('./src/middlewares/external-rate-limit.middleware');

let externalApiManager;

async function initializeExternalAPIs() {
  try {
    logger.info('Inicializando APIs externas...');

    // Inicializar gerenciador de APIs externas
    externalApiManager = new ExternalApiManagerService(database, {
      clientes: new (require('./src/repositories/clientes.repository'))(database),
      embarcadores: new (require('./src/repositories/embarcadores.repository'))(database),
      transportadoras: new (require('./src/repositories/transportadoras.repository'))(database),
      notas: new (require('./src/repositories/notas.repository'))(database),
      ocorrencias: new (require('./src/repositories/ocorrencias.repository'))(database),
      codigoOcorrencias: new (require('./src/repositories/codigo-ocorrencias.repository'))(database),
      enderecoEntrega: new (require('./src/repositories/endereco-entrega.repository'))(database),
      transportadoraCodigoOcorrencia: new (require('./src/repositories/transportadora-codigo-ocorrencia.repository'))(database)
    });

    await externalApiManager.initialize();

    // Configurar rotas externas
    const externalRoutes = require('./src/routes/external.routes');
    const repositories = externalApiManager.getRepositories();
    
    // Rate limiting global para APIs externas
    app.use('/api/external', createExternalRateLimit());
    
    // Aplicar rotas externas
    app.use('/api/external', externalRoutes(repositories));

    logger.info('APIs externas inicializadas com sucesso');

  } catch (error) {
    logger.error('Erro ao inicializar APIs externas:', error);
    // Não parar o servidor, mas marcar como indisponível
  }
}

// Modificar a sequência de inicialização no server.js
database.connect()
  .then(() => {
    logger.info('Conexão com banco estabelecida');
    return initializeJobs(); // Sistema de jobs existente
  })
  .then(() => {
    return initializeExternalAPIs(); // Novo sistema de APIs externas
  })
  .then(() => {
    // Iniciar servidor
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      logger.info(`Servidor rodando na porta ${PORT}`);
      logger.info('APIs externas disponíveis em /api/external/*');
    });
  })
  .catch(error => {
    logger.error('Erro na inicialização:', error);
    process.exit(1);
  });

// Atualizar finalização graceful
async function gracefulShutdown() {
  logger.info('Iniciando finalização graceful...');
  
  if (jobManager) {
    await jobManager.shutdown();
  }
  
  if (externalApiManager) {
    // Limpar recursos se necessário
    logger.info('APIs externas finalizadas');
  }
  
  if (database) {
    await database.disconnect();
  }
  
  process.exit(0);
}