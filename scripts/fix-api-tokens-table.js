// scripts/fix-api-tokens-table.js
require('dotenv').config();
const db = require('../src/database/connection');
const logger = require('../src/config/logger');

async function fixApiTokensTable() {
  try {
    logger.info('🔧 Verificando e corrigindo tabela api_tokens...');

    // 1. Verificar estrutura atual da tabela
    const currentColumns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'api_tokens' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    logger.info(`📋 Colunas atuais: ${currentColumns.rows.map(r => r.column_name).join(', ')}`);

    const existingColumns = currentColumns.rows.map(row => row.column_name);
    const requiredColumns = ['active', 'expires_at', 'created_at', 'updated_at'];
    
    // 2. Adicionar colunas faltantes
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column)) {
        let columnDefinition = '';
        
        switch (column) {
          case 'active':
            columnDefinition = 'BOOLEAN DEFAULT true';
            break;
          case 'expires_at':
            columnDefinition = 'TIMESTAMP';
            break;
          case 'created_at':
          case 'updated_at':
            columnDefinition = 'TIMESTAMP DEFAULT NOW()';
            break;
        }

        await db.query(`ALTER TABLE api_tokens ADD COLUMN ${column} ${columnDefinition}`);
        logger.info(`✅ Coluna ${column} adicionada`);
      } else {
        logger.info(`ℹ️  Coluna ${column} já existe`);
      }
    }

    // 3. Atualizar registros existentes que podem não ter valores para as novas colunas
    await db.query(`
      UPDATE api_tokens 
      SET 
        active = COALESCE(active, true),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
      WHERE active IS NULL OR created_at IS NULL OR updated_at IS NULL
    `);

    logger.info('✅ Tabela api_tokens corrigida com sucesso!');

    // 4. Mostrar estrutura final
    const finalColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'api_tokens' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    logger.info('📋 Estrutura final da tabela api_tokens:');
    finalColumns.rows.forEach(row => {
      logger.info(`   • ${row.column_name} (${row.data_type}) ${row.column_default ? '- default: ' + row.column_default : ''}`);
    });

  } catch (error) {
    logger.error('❌ Erro ao corrigir tabela api_tokens:', error);
    throw error;
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  fixApiTokensTable();
}

module.exports = { fixApiTokensTable };