// ==========================================
// 3. OCORRENCIA PROCESSOR SERVICE  
// ==========================================
// backend/src/services/external/ocorrencia-processor.service.js

const logger = require('../../config/logger');

class OcorrenciaProcessorService {
  constructor(repositories) {
    this.repositories = repositories;
    this.notasRepo = repositories.notas;
    this.ocorrenciasRepo = repositories.ocorrencias;
    this.codigoOcorrenciasRepo = repositories.codigoOcorrencias;
  }

  // Processar array de ocorrências
  async processOcorrencias(ocorrenciasData, transportadoraToken) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    if (!Array.isArray(ocorrenciasData)) {
      throw new Error('Dados das ocorrências devem ser um array');
    }

    logger.info(`Processando ${ocorrenciasData.length} ocorrências`);

    for (const [index, ocorrenciaItem] of ocorrenciasData.entries()) {
      try {
        const result = await this.processSingleOcorrencia(ocorrenciaItem, transportadoraToken);
        
        results.details.push({
          index: index,
          nro_nf: ocorrenciaItem.nro_nf,
          codigo: ocorrenciaItem.codigo,
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
        logger.error(`Erro ao processar ocorrência índice ${index}:`, error);
        
        results.details.push({
          index: index,
          nro_nf: ocorrenciaItem?.nro_nf,
          codigo: ocorrenciaItem?.codigo,
          status: 'error',
          message: error.message
        });

        results.errors++;
      }
    }

    return results;
  }

  // Processar uma única ocorrência
  async processSingleOcorrencia(ocorrenciaData, transportadoraToken) {
    try {
      // 1. Validar dados
      this.validateOcorrenciaData(ocorrenciaData);

      // 2. Buscar nota fiscal
      const notaFiscal = await this.findNotaFiscal(ocorrenciaData.nro_nf);
      if (!notaFiscal) {
        throw new Error(`Nota fiscal não encontrada: ${ocorrenciaData.nro_nf}`);
      }

      // 3. Mapear código externo para interno
      const codigoInterno = await this.mapCodigoOcorrencia(
        ocorrenciaData.codigo, 
        notaFiscal.transportadora_id
      );

      // 4. Processar ocorrência
      const ocorrenciaResult = await this.upsertOcorrencia(
        ocorrenciaData, 
        notaFiscal, 
        codigoInterno
      );

      // 5. Verificar se é código finalizador
      await this.checkFinalizadora(notaFiscal, codigoInterno);

      // 6. Log da operação
      await this.logOcorrenciaOperation(ocorrenciaData, ocorrenciaResult, transportadoraToken);

      return {
        action: ocorrenciaResult.action,
        message: 'Ocorrência processada com sucesso',
        ocorrencia: ocorrenciaResult.ocorrencia
      };

    } catch (error) {
      await this.logOcorrenciaOperation(ocorrenciaData, { error: error.message }, transportadoraToken);
      throw error;
    }
  }

  // Validar dados da ocorrência
  validateOcorrenciaData(data) {
    if (!data.nro_nf) {
      throw new Error('Número da NF é obrigatório');
    }

    if (!data.codigo) {
      throw new Error('Código da ocorrência é obrigatório');
    }

    if (!data.data_evento && !data.dataHoraEvento) {
      throw new Error('Data do evento é obrigatória');
    }
  }

  // Buscar nota fiscal
  async findNotaFiscal(nroNF) {
    try {
      // Tentar por número CTRC primeiro
      let nota = await this.notasRepo.findByNroCtrc(parseInt(nroNF));
      
      // Se não encontrar, tentar por número da NF
      if (!nota) {
        nota = await this.notasRepo.findByNro(parseInt(nroNF));
      }

      return nota;
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal:', error);
      return null;
    }
  }

  // Mapear código externo para código interno
  async mapCodigoOcorrencia(codigoExterno, transportadoraId) {
    try {
      // Buscar mapeamento específico da transportadora
      const mapeamento = await this.repositories.transportadoraCodigoOcorrencia
        .findByTransportadoraAndCodigo(transportadoraId, codigoExterno);

      if (mapeamento) {
        return mapeamento.codigo_ocorrencia_codigo;
      }

      // Mapeamento padrão baseado em strings comuns
      const mapeamentoPadrao = {
        'COLETADO': 1,
        'COLETA': 1,
        'PICKUP': 1,
        
        'EM_TRANSITO': 2,
        'TRANSPORTE': 2,
        'TRANSIT': 2,
        'TRANSFERIDO': 2,
        
        'SAIU_PARA_ENTREGA': 3,
        'OUT_FOR_DELIVERY': 3,
        'ENTREGA': 3,
        
        'ENTREGUE': 4,
        'DELIVERED': 4,
        'ENTREGA_REALIZADA': 4,
        
        'TENTATIVA': 5,
        'TENTATIVA_ENTREGA': 5,
        'DELIVERY_ATTEMPT': 5,
        
        'DEVOLVIDO': 6,
        'RETURNED': 6,
        'DEVOLUCAO': 6,
        
        'EXTRAVIADO': 7,
        'LOST': 7,
        'PERDIDO': 7,
        
        'AVARIADO': 8,
        'DAMAGED': 8,
        'DANIFICADO': 8
      };

      const codigo = mapeamentoPadrao[codigoExterno.toUpperCase()];
      return codigo || 99; // Código padrão para outros eventos

    } catch (error) {
      logger.error('Erro ao mapear código de ocorrência:', error);
      return 99; // Código padrão
    }
  }

  // UPSERT da ocorrência
  async upsertOcorrencia(ocorrenciaData, notaFiscal, codigoInterno) {
    try {
      const dataEvento = this.parseDateTime(
        ocorrenciaData.data_evento || ocorrenciaData.dataHoraEvento
      );

      // Verificar se já existe ocorrência similar
      const existing = await this.ocorrenciasRepo.findSimilar({
        nro_nf: notaFiscal.nro_ctrc,
        codigo: codigoInterno,
        dataHoraEvento: dataEvento
      });

      const ocorrenciaPayload = {
        nro_nf: parseInt(notaFiscal.nro_ctrc),
        codigo: codigoInterno,
        descricao: ocorrenciaData.descricao || 'Evento importado via API',
        dataHoraEvento: dataEvento,
        dataHoraEnvio: new Date(),
        nomeRecebedor: ocorrenciaData.recebedor?.trim() || null,
        docRecebedor: ocorrenciaData.documento_recebedor?.replace(/\D/g, '') || null,
        latitude: parseFloat(ocorrenciaData.latitude) || null,
        longitude: parseFloat(ocorrenciaData.longitude) || null,
        linkComprovante: ocorrenciaData.comprovante_url?.trim() || null
      };

      if (existing) {
        const changes = this.getOcorrenciaChanges(existing, ocorrenciaPayload);
        
        if (Object.keys(changes).length > 0) {
          const updated = await this.ocorrenciasRepo.update(existing.id, changes);
          return { ocorrencia: updated, action: 'updated', changes };
        }

        return { ocorrencia: existing, action: 'no_changes' };
      } else {
        const newOcorrencia = await this.ocorrenciasRepo.create(ocorrenciaPayload);
        
        logger.info('Ocorrência criada:', {
          id: newOcorrencia.id,
          nro_nf: newOcorrencia.nro_nf,
          codigo: newOcorrencia.codigo
        });

        return { ocorrencia: newOcorrencia, action: 'created' };
      }

    } catch (error) {
      logger.error('Erro no upsert da ocorrência:', error);
      throw error;
    }
  }

  // Verificar se código é finalizador e atualizar NF
  async checkFinalizadora(notaFiscal, codigoInterno) {
    try {
      const codigoInfo = await this.codigoOcorrenciasRepo.findByCodigo(codigoInterno);
      
      if (codigoInfo && codigoInfo.finalizadora && !notaFiscal.finalizada) {
        await this.notasRepo.update(notaFiscal.id, {
          finalizada: true,
          status_nf: 'finalizada',
          data_integracao: new Date()
        });

        logger.info('Nota fiscal finalizada:', {
          id: notaFiscal.id,
          nro: notaFiscal.nro_ctrc,
          codigo_finalizador: codigoInterno
        });
      }

    } catch (error) {
      logger.error('Erro ao verificar finalizadora:', error);
    }
  }

  // Comparar dados da ocorrência
  getOcorrenciaChanges(existing, newData) {
    const changes = {};
    
    const fieldsToCompare = [
      'descricao', 'nomeRecebedor', 'docRecebedor', 
      'latitude', 'longitude', 'linkComprovante'
    ];
    
    for (const field of fieldsToCompare) {
      const newValue = newData[field];
      const existingValue = existing[field];
      
      if (newValue !== null && newValue !== existingValue) {
        changes[field] = newValue;
      }
    }
    
    return changes;
  }

  // Parse de data e hora
  parseDateTime(dateTimeString) {
    if (!dateTimeString) return new Date();
    
    try {
      const date = new Date(dateTimeString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch (error) {
      return new Date();
    }
  }

  // Log da operação
  async logOcorrenciaOperation(ocorrenciaData, result, token) {
    try {
      const logData = {
        tipo: 'external_api',
        operacao: 'ocorrencia',
        token_usado: token?.substring(0, 10) + '...',
        dados: {
          nro_nf: ocorrenciaData.nro_nf,
          codigo: ocorrenciaData.codigo,
          resultado: result.action || 'erro',
          erro: result.error || null
        }
      };

      logger.info('Operação de ocorrência registrada:', logData);

    } catch (error) {
      logger.error('Erro ao registrar log da ocorrência:', error);
    }
  }
}

module.exports = OcorrenciaProcessorService;