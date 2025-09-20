// scripts/add-api-config-column.js
require('dotenv').config();
const db = require('../src/database/connection');

console.log('🔧 Adicionando coluna api_config na tabela transportadoras...');

async function addApiConfigColumn() {
  try {
    // Verificar se a coluna já existe
    const columnExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transportadoras' 
        AND column_name = 'api_config'
        AND table_schema = 'public'
      )
    `);

    if (columnExists.rows[0].exists) {
      console.log('ℹ️  Coluna api_config já existe na tabela transportadoras');
      return;
    }

    // Adicionar a coluna
    await db.query(`
      ALTER TABLE transportadoras 
      ADD COLUMN api_config JSONB
    `);

    console.log('✅ Coluna api_config adicionada com sucesso!');

    // Atualizar transportadoras existentes com configurações padrão
    const transportadoras = await db.query('SELECT id, nome FROM transportadoras');
    
    for (const transportadora of transportadoras.rows) {
      let config = {};
      
      // Configurações baseadas no nome da transportadora
      if (transportadora.nome.toLowerCase().includes('jamef')) {
        config = {
          base_url: 'https://api.jamef.com.br',
          timeout: 15000,
          retry_attempts: 3,
          rate_limit: { requests: 100, per: 'minute' }
        };
      } else if (transportadora.nome.toLowerCase().includes('braspress')) {
        config = {
          base_url: 'https://api.braspress.com.br',
          timeout: 45000,
          retry_attempts: 3,
          rate_limit: { requests: 500, per: 'hour' }
        };
      } else if (transportadora.nome.toLowerCase().includes('tnt')) {
        config = {
          base_url: 'https://api.tnt.com.br',
          timeout: 20000,
          retry_attempts: 3,
          rate_limit: { requests: 200, per: 'minute' }
        };
      } else {
        config = {
          base_url: '',
          timeout: 30000,
          retry_attempts: 3,
          rate_limit: { requests: 100, per: 'hour' }
        };
      }

      await db.query(
        'UPDATE transportadoras SET api_config = $1 WHERE id = $2',
        [JSON.stringify(config), transportadora.id]
      );

      console.log(`✅ Configuração API atualizada para: ${transportadora.nome}`);
    }

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna api_config:', error.message);
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  addApiConfigColumn();
}

module.exports = { addApiConfigColumn };