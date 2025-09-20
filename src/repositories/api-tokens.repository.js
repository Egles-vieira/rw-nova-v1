// ==========================================
// 2. API TOKENS REPOSITORY EXTENSION
// ==========================================
// backend/src/repositories/api-tokens.repository.js

const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class ApiTokensRepository extends BaseRepository {
  constructor(database) {
    super(database, 'api_tokens');
  }

  // Buscar token ativo
  async findActiveToken(token) {
    const query = `
      SELECT * FROM api_tokens 
      WHERE token = $1 
        AND active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;

    const result = await this.database.query(query, [token]);
    return result.rows[0];
  }

  // Buscar por integração
  async findByIntegracao(integracao) {
    const query = `
      SELECT * FROM api_tokens 
      WHERE integracao = $1 
        AND active = true
      ORDER BY created_at DESC
    `;

    const result = await this.database.query(query, [integracao]);
    return result.rows;
  }

  // Desativar tokens por integração
  async deactivateByIntegracao(integracao) {
    const query = `
      UPDATE api_tokens 
      SET active = false, updated_at = NOW()
      WHERE integracao = $1 AND active = true
    `;

    const result = await this.database.query(query, [integracao]);
    return result.rowCount;
  }

  // Buscar tokens ativos
  async findActiveTokens() {
    const query = `
      SELECT 
        id, integracao, expires_at, last_used_at, created_at,
        CASE 
          WHEN expires_at IS NULL THEN 'never'
          WHEN expires_at > NOW() THEN 'valid'
          ELSE 'expired'
        END as status
      FROM api_tokens 
      WHERE active = true
      ORDER BY integracao, created_at DESC
    `;

    const result = await this.database.query(query);
    return result.rows;
  }

  // Atualizar último uso
  async updateLastUsed(tokenId) {
    const query = `
      UPDATE api_tokens 
      SET last_used_at = NOW()
      WHERE id = $1
    `;

    const result = await this.database.query(query, [tokenId]);
    return result.rowCount;
  }

  // Buscar por token
  async findByToken(token) {
    const query = `
      SELECT * FROM api_tokens 
      WHERE token = $1
      LIMIT 1
    `;

    const result = await this.database.query(query, [token]);
    return result.rows[0];
  }
}

module.exports = ApiTokensRepository;
