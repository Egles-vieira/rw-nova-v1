// ==========================================
// 6. EXTENSÃO DO SETTINGS REPOSITORY
// ==========================================
// backend/src/repositories/settings.repository.js

const db = require('../database/connection');
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class SettingsRepository extends BaseRepository {
  constructor(database = db) {
     super(database, 'settings');
   }

  // Buscar configuração por slug
  async findBySlug(slug, env = 'production') {
    const query = `
      SELECT * FROM settings 
      WHERE slug = $1 AND env = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await this.database.query(query, [slug, env]);
    return result.rows[0];
  }

  // Buscar token ativo para integração
  async getActiveToken(integracao) {
    const query = `
      SELECT * FROM api_tokens 
      WHERE integracao = $1 
        AND active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await this.database.query(query, [integracao]);
    return result.rows[0];
  }

  // Atualizar ou criar configuração
  async upsertConfig(slug, settings, env = 'production') {
    const query = `
      INSERT INTO settings (slug, env, settings, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (slug, env) 
      DO UPDATE SET 
        settings = $3,
        updated_at = NOW()
      RETURNING *
    `;
    
    const values = [slug, env, JSON.stringify(settings)];
    const result = await this.database.query(query, values);
    
    return result.rows[0];
  }

  // Listar todas as configurações
  async getAllConfigs(env = 'production') {
    const query = `
      SELECT slug, settings, created_at, updated_at 
      FROM settings 
      WHERE env = $1
      ORDER BY slug ASC
    `;
    
    const result = await this.database.query(query, [env]);
    return result.rows;
  }
}

module.exports = SettingsRepository;