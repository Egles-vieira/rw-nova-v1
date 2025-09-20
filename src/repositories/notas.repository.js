// ==========================================
// 1. USADO PELO JOB PARA VALIDAR NOTAS EM PROCESSO BUSCA
// ==========================================

// backend/src/repositories/notas.repository.js
const db = require('../database/connection');
const BaseRepository = require('./base.repository');
const logger = require('../config/logger');

class NotasRepository extends BaseRepository {
  constructor(database) {
    super(database, 'notas_fiscais');
  }

  // Buscar NFs pendentes por transportadora
  async findPendingByTransportadora(transportadoraId) {
    const query = `
      SELECT 
        nf.id,
        nf.nro_ctrc,
        nf.chave_nf,
        nf.chave_cte,
        nf.nro,
        nf.ser,
        nf.nome_rep,
        nf.cod_rep,
        nf.peso_calculo,
        nf.peso_real,
        nf.qtd_volumes,
        nf.status_nf,
        nf.status_api,
        nf.data_entrega,
        nf.previsao_entrega,
        nf.created_at,
        nf.updated_at,
        c.nome as cliente_nome,
        c.documento as cliente_documento,
        e.nome as embarcador_nome
      FROM notas_fiscais nf
      INNER JOIN clientes c ON nf.cliente_id = c.id
      INNER JOIN embarcadores e ON nf.embarcador_id = e.id
      WHERE nf.transportadora_id = $1
        AND nf.finalizada = false
        AND nf.status_nf NOT IN ('entregue', 'cancelada', 'devolvida')
      ORDER BY nf.previsao_entrega ASC, nf.created_at ASC
    `;
    
    const result = await this.database.query(query, [transportadoraId]);
    return result.rows;
  }

  // Outros métodos úteis para o sistema de jobs:
  async findByStatus(status) {
    const query = `
      SELECT * FROM notas_fiscais 
      WHERE status_nf = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.database.query(query, [status]);
    return result.rows;
  }

  async updateStatus(nfId, status, dataEntrega = null) {
    const query = `
      UPDATE notas_fiscais 
      SET status_nf = $1, 
          data_entrega = COALESCE($2, data_entrega),
          updated_at = NOW()
      WHERE id = $3 
      RETURNING *
    `;
    
    const result = await this.database.query(query, [status, dataEntrega, nfId]);
    return result.rows[0];
  }

  async findByChaveNF(chaveNf) {
    const query = `
      SELECT * FROM notas_fiscais 
      WHERE chave_nf = $1 
      LIMIT 1
    `;
    
    const result = await this.database.query(query, [chaveNf]);
    return result.rows[0];
  }


  async updateAPIStatus(notaId, status, dataIntegracao = null, observacoes = null) {
    const updateFields = ['status_api = $2'];
    const values = [notaId, status];
    let i = 2;

    if (dataIntegracao) {
      updateFields.push(`data_integracao = $${++i}`);
      values.push(dataIntegracao);
    }
    if (observacoes) {
      updateFields.push(`observacoes = $${++i}`);
      values.push(observacoes);
    }

    const query = `
      UPDATE notas_fiscais 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.database.query(query, values);
    return result.rows[0];
  }

  async finalizarNota(notaId, codigoFinalizador, observacoes = null) {
    const query = `
      UPDATE notas_fiscais 
      SET 
        finalizada = true,
        status_api = 'finalizada',
        data_integracao = NOW(),
        observacoes = COALESCE($3, observacoes),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.database.query(query, [notaId, codigoFinalizador, observacoes]);
    return result.rows[0];
  }

  async getIntegrationStats(transportadoraId = null, dias = 7) {
    const params = [dias];
    let where = '';

    if (transportadoraId) {
      where = 'AND nf.transportadora_id = $2';
      params.push(transportadoraId);
    }

    const query = `
      SELECT 
        COUNT(*) as total_nfs,
        COUNT(CASE WHEN nf.finalizada = true THEN 1 END) as finalizadas,
        COUNT(CASE WHEN nf.finalizada = false THEN 1 END) as pendentes,
        COUNT(CASE WHEN nf.status_api = 'erro' THEN 1 END) as com_erro,
        AVG(CASE 
          WHEN nf.finalizada = true AND nf.data_integracao IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (nf.data_integracao - nf.created_at)) / 3600 
        END) as tempo_medio_horas
      FROM notas_fiscais nf
      WHERE nf.created_at >= NOW() - make_interval(days => $1)
      ${where}
    `;
    const result = await this.database.query(query, params);
    return result.rows[0];
  }
}

module.exports = NotasRepository;
