// ==========================================
// 5. SCRIPT DE GERENCIAMENTO DE TOKENS
// ==========================================
// backend/scripts/manage-external-tokens.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Database = require('../src/database/connection');
const ExternalAuthService = require('../src/services/external/external-auth.service');
const ApiTokensRepository = require('../src/repositories/api-tokens.repository');
const TransportadorasRepository = require('../src/repositories/transportadoras.repository');
const logger = require('../src/config/logger');

async function manageTokens() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  let database;
  
  try {
    database = new Database();
    await database.connect();

    const repositories = {
      apiTokens: new ApiTokensRepository(database),
      transportadoras: new TransportadorasRepository(database)
    };

    const authService = new ExternalAuthService(repositories);

    switch (command) {
      case 'create':
        await createToken(authService, args);
        break;
      case 'list':
        await listTokens(repositories.apiTokens);
        break;
      case 'revoke':
        await revokeToken(authService, args);
        break;
      case 'test':
        await testToken(authService, args);
        break;
      default:
        showHelp();
        break;
    }

  } catch (error) {
    logger.error('Erro no gerenciamento de tokens:', error);
    process.exit(1);
  } finally {
    if (database) {
      await database.disconnect();
    }
  }
}

async function createToken(authService, args) {
  const [integracao, diasExpiracao = '365'] = args;

  if (!integracao) {
    logger.error('Integração é obrigatória: create <integracao> [dias_expiracao]');
    return;
  }

  try {
    const token = await authService.generateApiToken(integracao, parseInt(diasExpiracao));
    
    logger.info(`Token criado com sucesso para ${integracao}:`);
    logger.info(`ID: ${token.id}`);
    logger.info(`Token: ${token.token}`);
    logger.info(`Expira em: ${token.expires_at}`);
    logger.info('');
    logger.info('IMPORTANTE: Guarde este token em local seguro!');
    
  } catch (error) {
    logger.error('Erro ao criar token:', error.message);
  }
}

async function listTokens(apiTokensRepo) {
  try {
    const tokens = await apiTokensRepo.findActiveTokens();
    
    if (tokens.length === 0) {
      logger.info('Nenhum token ativo encontrado');
      return;
    }

    logger.info('=== TOKENS ATIVOS ===');
    tokens.forEach(token => {
      logger.info(`${token.integracao}:`);
      logger.info(`  ID: ${token.id}`);
      logger.info(`  Status: ${token.status}`);
      logger.info(`  Expira: ${token.expires_at || 'Nunca'}`);
      logger.info(`  Último uso: ${token.last_used_at || 'Nunca'}`);
      logger.info('');
    });
    
  } catch (error) {
    logger.error('Erro ao listar tokens:', error.message);
  }
}

async function revokeToken(authService, args) {
  const [token] = args;

  if (!token) {
    logger.error('Token é obrigatório: revoke <token>');
    return;
  }

  try {
    const revoked = await authService.revokeToken(token);
    
    if (revoked) {
      logger.info('Token revogado com sucesso');
    } else {
      logger.error('Token não encontrado');
    }
    
  } catch (error) {
    logger.error('Erro ao revogar token:', error.message);
  }
}

async function testToken(authService, args) {
  const [token] = args;

  if (!token) {
    logger.error('Token é obrigatório: test <token>');
    return;
  }

  try {
    const result = await authService.validateExternalToken(token);
    
    if (result.valid) {
      logger.info('Token válido!');
      logger.info(`Integração: ${result.token.integracao}`);
      logger.info(`Transportadora: ${result.transportadora.nome}`);
      logger.info(`Expira: ${result.token.expires_at || 'Nunca'}`);
    } else {
      logger.error('Token inválido:', result.error);
    }
    
  } catch (error) {
    logger.error('Erro ao testar token:', error.message);
  }
}

function showHelp() {
  console.log(`
🔑 GERENCIAMENTO DE TOKENS - APIS EXTERNAS

Uso: npm run external:tokens <comando> [argumentos]

Comandos:
  create <integracao> [dias]  - Criar token para integração
  list                        - Listar tokens ativos
  revoke <token>             - Revogar token específico
  test <token>               - Testar validade de token

Exemplos:
  npm run external:tokens create jamef 365
  npm run external:tokens list
  npm run external:tokens test EXEMPLO_TOKEN_JAMEF_123
  npm run external:tokens revoke EXEMPLO_TOKEN_JAMEF_123

Integrações disponíveis:
  - jamef
  - braspress
  - tnt
  - correios
`);
}

// Executar se chamado diretamente
if (require.main === module) {
  manageTokens();
}

module.exports = { manageTokens };