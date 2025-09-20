
// ==========================================
// 2. NOTA FISCAL PROCESSOR SERVICE
// ==========================================
// backend/src/services/external/nota-fiscal-processor.service.js

const UpsertManagerService = require('./upsert-manager.service');
const logger = require('../../config/logger');

class NotaFiscalProcessorService {
  constructor(repositories) {
    this.repositories = repositories;
    this.upsertManager = new UpsertManagerService(repositories);
    this.notasRepo = repositories.notas;
  }

  // Processar array de notas fiscais
  async processNotasFiscais(notfisData, transportadoraToken) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    if (!Array.isArray(notfisData)) {
      throw new Error('Dados das notas fiscais devem ser um array');
    }

    logger.info(`Processando ${notfisData.length} notas fiscais`);

    // Processar cada nota fiscal
    for (const [index, notfisItem] of notfisData.entries()) {
      try {
        const result = await this.processSingleNotaFiscal(notfisItem, transportadoraToken);
        
        results.details.push({
          index: index,
          nro: notfisItem.nro,
          chave_nf: notfisItem.chave_nf,
          status: 'success',
          action: result.action,
          message: result.message
        });

        results.processed++;
        if (result.action === 'created') {
          results.created++;
        } else if (result.action === 'updated') {
          results.updated++;
        }

      } catch (error) {
        logger.error(`Erro ao processar NF índice ${index}:`, error);
        
        results.details.push({
          index: index,
          nro: notfisItem?.nro,
          chave_nf: notfisItem?.chave_nf,
          status: 'error',
          message: error.message
        });

        results.errors++;
      }
    }

    logger.info('Processamento concluído:', {
      processed: results.processed,
      created: results.created,
      updated: results.updated,
      errors: results.errors
    });

    return results;
  }

  // Processar uma única nota fiscal
  async processSingleNotaFiscal(notfisData, transportadoraToken) {
    try {
      // 1. Validar dados obrigatórios
      this.validateNotaFiscalData(notfisData);

      // 2. Buscar/criar entidades relacionadas
      const entities = await this.processRelatedEntities(notfisData);

      // 3. Processar nota fiscal principal
      const notaFiscalResult = await this.upsertNotaFiscal(notfisData, entities);

      // 4. Log da operação
      await this.logOperation(notfisData, notaFiscalResult, transportadoraToken);

      return {
        action: notaFiscalResult.action,
        message: `Nota fiscal processada com sucesso`,
        notaFiscal: notaFiscalResult.notaFiscal
      };

    } catch (error) {
      // Log do erro
      await this.logOperation(notfisData, { error: error.message }, transportadoraToken);
      throw error;
    }
  }

  // Validar dados da nota fiscal
  validateNotaFiscalData(data) {
    const requiredFields = ['nro', 'chave_nf', 'emi_nf'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Campo obrigatório ausente: ${field}`);
      }
    }

    if (!data.recebedor || !data.recebedor[0]) {
      throw new Error('Dados do recebedor são obrigatórios');
    }

    if (!data.remetente || !data.remetente[0]) {
      throw new Error('Dados do remetente são obrigatórios');
    }

    if (!data.transportadora || !data.transportadora[0]) {
      throw new Error('Dados da transportadora são obrigatórios');
    }

    // Validar chave da NF (44 caracteres)
    if (data.chave_nf && data.chave_nf.length !== 44) {
      throw new Error('Chave da nota fiscal inválida');
    }
  }

  // Processar entidades relacionadas
  async processRelatedEntities(notfisData) {
    const entities = {};

    try {
      // Processar transportadora
      const transportadoraResult = await this.upsertManager.upsertTransportadora(
        notfisData.transportadora[0]
      );
      entities.transportadora = transportadoraResult.transportadora;

      // Processar cliente (recebedor)
      const clienteResult = await this.upsertManager.upsertCliente(
        notfisData.recebedor[0]
      );
      entities.cliente = clienteResult.cliente;

      // Processar embarcador (remetente)  
      const embarcadorResult = await this.upsertManager.upsertEmbarcador(
        notfisData.remetente[0]
      );
      entities.embarcador = embarcadorResult.embarcador;

      // Processar endereço de entrega
      if (notfisData.endereco_entrega && notfisData.endereco_entrega[0]) {
        const enderecoResult = await this.upsertManager.upsertEnderecoEntrega(
          notfisData.endereco_entrega[0],
          entities.cliente.id
        );
        entities.endereco = enderecoResult?.endereco;
      }

      return entities;

    } catch (error) {
      logger.error('Erro ao processar entidades relacionadas:', error);
      throw error;
    }
  }

  // UPSERT da nota fiscal principal
  async upsertNotaFiscal(notfisData, entities) {
    try {
      // Buscar NF existente por chave
      const existingNF = await this.notasRepo.findByChaveNF(notfisData.chave_nf);

      const nfData = {
        chave_cte: notfisData.chave_nf,
        cliente_id: entities.cliente.id,
        embarcador_id: entities.embarcador.id,
        transportadora_id: entities.transportadora.id,
        endereco_entrega_id: entities.endereco?.id || null,
        
        cod_rep: parseInt(notfisData.cod_rep) || 0,
        nome_rep: notfisData.nome_rep?.trim() || '',
        emi_nf: this.parseDate(notfisData.emi_nf),
        ser: parseInt(notfisData.ser) || 1,
        nro: parseInt(notfisData.nro),
        nro_ctrc: parseInt(notfisData.nro),
        nro_pedido: parseInt(notfisData.nro_pedido) || null,
        
        peso_real: parseFloat(notfisData.peso_real) || 0,
        peso_calculo: parseFloat(notfisData.peso_calculo) || 0,
        qtd_volumes: parseInt(notfisData.qtd_volumes) || 1,
        metro_cubico: parseFloat(notfisData.metro_cubico) || 0,
        valor: parseFloat(notfisData.valor) || 0,
        valor_frete: parseFloat(notfisData.valor_frete) || 0,
        
        observacoes: notfisData.observacoes?.trim() || '',
        mensagem: notfisData.mensagem?.trim() || '',
        status_nf: notfisData.status_nf?.trim() || 'importada',
        nf_retida: Boolean(notfisData.nf_retida),
        
        previsao_entrega: this.parseDate(notfisData.previsao_entrega),
        data_entrega: this.parseDate(notfisData.data_entrega),
        finalizada: false
      };

      if (existingNF) {
        const changes = this.upsertManager.getDataChanges(existingNF, nfData);
        
        if (Object.keys(changes).length > 0) {
          const updated = await this.notasRepo.update(existingNF.id, changes);
          
          logger.info('Nota fiscal atualizada:', {
            id: existingNF.id,
            nro: nfData.nro,
            changes: Object.keys(changes)
          });

          return { notaFiscal: updated, action: 'updated', changes };
        }

        return { notaFiscal: existingNF, action: 'no_changes' };
      } else {
        const newNF = await this.notasRepo.create(nfData);
        
        logger.info('Nota fiscal criada:', {
          id: newNF.id,
          nro: nfData.nro,
          chave_nf: nfData.chave_cte
        });

        return { notaFiscal: newNF, action: 'created' };
      }

    } catch (error) {
      logger.error('Erro no upsert da nota fiscal:', error);
      throw error;
    }
  }

  // Converter string para Date
  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  // Log da operação
  async logOperation(notfisData, result, token) {
    try {
      const logData = {
        tipo: 'external_api',
        operacao: 'nota_fiscal',
        token_usado: token?.substring(0, 10) + '...',
        dados: {
          nro: notfisData.nro,
          chave_nf: notfisData.chave_nf,
          resultado: result.action || 'erro',
          erro: result.error || null
        },
        created_at: new Date()
      };

      // Log estruturado
      logger.info('Operação externa registrada:', logData);

    } catch (error) {
      logger.error('Erro ao registrar log da operação:', error);
    }
  }
}

module.exports = NotaFiscalProcessorService;
