
// ==========================================
// 2. EXTERNAL API MANAGER (INTEGRAÇÃO PRINCIPAL)
// ==========================================
// backend/src/services/external/external-api-manager.service.js

const ExternalAuthMiddleware = require('../../middlewares/external-auth.middleware');
const ExternalLogsRepository = require('../../repositories/external-logs.repository');
const ApiTokensRepository = require('../../repositories/api-tokens.repository');
const logger = require('../../config/logger');

class ExternalApiManagerService {
  constructor(database, repositories) {
    this.database = database;
    this.repositories = {
      ...repositories,
      externalLogs: new ExternalLogsRepository(database),
      apiTokens: new ApiTokensRepository(database)
    };
    
    this.authMiddleware = new ExternalAuthMiddleware(this.repositories);
    this.isInitialized = false;
  }

  // Inicializar sistema de APIs externas
  async initialize() {
    try {
      logger.info('Inicializando sistema de APIs externas...');

      // Verificar se as tabelas existem
      await this.checkTables();

      // Configurar tokens iniciais se não existirem
      await this.setupInitialTokens();

      // Configurar códigos de ocorrência padrão
      await this.setupCodigosOcorrencia();

      this.isInitialized = true;
      logger.info('Sistema de APIs externas inicializado com sucesso');

    } catch (error) {
      logger.error('Erro ao inicializar APIs externas:', error);
      throw error;
    }
  }

  // Verificar se tabelas necessárias existem
  async checkTables() {
    const tables = [
      'external_logs',
      'api_tokens',
      'notas_fiscais',
      'transportadoras',
      'clientes',
      'embarcadores',
      'ocorrencias',
      'codigo_ocorrencias'
    ];

    for (const table of tables) {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        )
      `;
      
      const result = await this.database.query(query, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Tabela obrigatória não encontrada: ${table}`);
      }
    }

    logger.info('Todas as tabelas necessárias estão presentes');
  }

  // Configurar tokens iniciais para transportadoras existentes
  async setupInitialTokens() {
    try {
      // Buscar transportadoras ativas sem tokens
      const query = `
        SELECT t.* FROM transportadoras t
        WHERE t.ativo = true 
          AND t.integracao_ocorrencia IS NOT NULL 
          AND t.integracao_ocorrencia != 'manual'
          AND NOT EXISTS (
            SELECT 1 FROM api_tokens at 
            WHERE at.integracao = t.integracao_ocorrencia AND at.active = true
          )
      `;

      const transportadoras = await this.database.query(query);

      if (transportadoras.rows.length > 0) {
        logger.info(`Configurando tokens para ${transportadoras.rows.length} transportadoras`);

        for (const transportadora of transportadoras.rows) {
          // Criar token placeholder (deve ser atualizado manualmente)
          await this.repositories.apiTokens.create({
            integracao: transportadora.integracao_ocorrencia,
            token: `PLACEHOLDER_${transportadora.integracao_ocorrencia.toUpperCase()}_${Date.now()}`,
            active: false, // Inativo até ser configurado manualmente
            description: `Token automático para ${transportadora.nome}`,
            created_at: new Date()
          });

          logger.info(`Token placeholder criado para ${transportadora.nome}`);
        }
      }

    } catch (error) {
      logger.warn('Erro ao configurar tokens iniciais:', error.message);
    }
  }

  // Configurar códigos de ocorrência padrão
  async setupCodigosOcorrencia() {
    try {
      // Códigos padrão para APIs externas
      const codigosPadrao = [
        { codigo: 1, descricao: 'Coleta realizada', tipo: 'coleta', processo: 'pickup', finalizadora: false, api: true },
        { codigo: 2, descricao: 'Em trânsito', tipo: 'transporte', processo: 'transport', finalizadora: false, api: true },
        { codigo: 3, descricao: 'Saiu para entrega', tipo: 'entrega', processo: 'delivery', finalizadora: false, api: true },
        { codigo: 4, descricao: 'Entregue', tipo: 'entrega', processo: 'delivered', finalizadora: true, api: true },
        { codigo: 5, descricao: 'Tentativa de entrega', tipo: 'entrega', processo: 'delivery_attempt', finalizadora: false, api: true },
        { codigo: 6, descricao: 'Devolvido', tipo: 'devolucao', processo: 'returned', finalizadora: true, api: true },
        { codigo: 7, descricao: 'Extraviado', tipo: 'problema', processo: 'lost', finalizadora: true, api: true },
        { codigo: 8, descricao: 'Avariado', tipo: 'problema', processo: 'damaged', finalizadora: false, api: true },
        { codigo: 9, descricao: 'Aguardando retirada', tipo: 'entrega', processo: 'waiting_pickup', finalizadora: false, api: true },
        { codigo: 99, descricao: 'Outros eventos', tipo: 'outros', processo: 'other', finalizadora: false, api: true }
      ];

      for (const codigo of codigosPadrao) {
        const existsQuery = `
          SELECT EXISTS (
            SELECT 1 FROM codigo_ocorrencias 
            WHERE codigo = $1 AND api = true
          )
        `;
        
        const exists = await this.database.query(existsQuery, [codigo.codigo]);
        
        if (!exists.rows[0].exists) {
          const insertQuery = `
            INSERT INTO codigo_ocorrencias (
              codigo, descricao, tipo, processo, finalizadora, api, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `;
          
          await this.database.query(insertQuery, [
            codigo.codigo,
            codigo.descricao,
            codigo.tipo,
            codigo.processo,
            codigo.finalizadora,
            codigo.api
          ]);
        }
      }

      logger.info('Códigos de ocorrência configurados');

    } catch (error) {
      logger.warn('Erro ao configurar códigos de ocorrência:', error.message);
    }
  }

  // Obter repositories configurados
  getRepositories() {
    if (!this.isInitialized) {
      throw new Error('Sistema de APIs externas não foi inicializado');
    }
    return this.repositories;
  }

  // Obter middleware de autenticação
  getAuthMiddleware() {
    if (!this.isInitialized) {
      throw new Error('Sistema de APIs externas não foi inicializado');
    }
    return this.authMiddleware;
  }

  // Obter estatísticas de uso
  async getUsageStats(integracao = null, dias = 7) {
    try {
      const stats = await this.repositories.externalLogs.getApiStats(integracao, dias);
      return stats;
    } catch (error) {
      logger.error('Erro ao obter estatísticas de uso:', error);
      throw error;
    }
  }

  // Limpar logs antigos
  async cleanOldLogs(diasRetencao = 30) {
    try {
      const query = `
        DELETE FROM external_logs 
        WHERE created_at < NOW() - INTERVAL '${diasRetencao} days'
      `;

      const result = await this.database.query(query);
      
      logger.info(`${result.rowCount} logs antigos removidos`);
      return result.rowCount;

    } catch (error) {
      logger.error('Erro ao limpar logs antigos:', error);
      throw error;
    }
  }

  // Status do sistema
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      repositories: Object.keys(this.repositories),
      authMiddleware: !!this.authMiddleware
    };
  }
}

module.exports = ExternalApiManagerService;