// ==========================================
// 1. UPSERT MANAGER SERVICE
// ==========================================
// backend/src/services/external/upsert-manager.service.js

const logger = require('../../config/logger');
const { validateCNPJ, validateCPF } = require('../../utils/validators');

class UpsertManagerService {
  constructor(repositories) {
    this.clientesRepo = repositories.clientes;
    this.embarcadoresRepo = repositories.embarcadores;
    this.transportadorasRepo = repositories.transportadoras;
    this.enderecoEntregaRepo = repositories.enderecoEntrega;
    this.notasRepo = repositories.notas;
  }

  // UPSERT Cliente (Recebedor)
  async upsertCliente(recebedorData) {
    try {
      if (!recebedorData || !recebedorData.documento) {
        throw new Error('Dados do recebedor são obrigatórios');
      }

      // Normalizar CNPJ/CPF
      const documento = recebedorData.documento.replace(/\D/g, '');
      
      if (!validateCNPJ(documento) && !validateCPF(documento)) {
        throw new Error(`Documento inválido: ${recebedorData.documento}`);
      }

      // Buscar cliente existente
      const existingCliente = await this.clientesRepo.findByCnpj(documento);

      const clienteData = {
        cnpj: documento,
        nome: recebedorData.nome?.trim().toUpperCase() || '',
        endereco: recebedorData.endereco?.trim() || '',
        bairro: recebedorData.bairro?.trim() || '',
        cidade: recebedorData.cidade?.trim() || '',
        uf: recebedorData.uf?.trim().toUpperCase() || '',
        cep: recebedorData.cep?.replace(/\D/g, '') || '',
        contato: recebedorData.contato?.trim() || '',
        cod_cliente: recebedorData.cod_cliente?.toString() || null
      };

      if (existingCliente) {
        // Comparar e atualizar apenas se houver diferenças
        const changes = this.getDataChanges(existingCliente, clienteData);
        
        if (Object.keys(changes).length > 0) {
          const updated = await this.clientesRepo.update(existingCliente.id, changes);
          
          logger.info('Cliente atualizado:', {
            id: existingCliente.id,
            cnpj: documento,
            changes: Object.keys(changes)
          });

          return { cliente: updated, action: 'updated', changes };
        }

        return { cliente: existingCliente, action: 'no_changes' };
      } else {
        // Criar novo cliente
        const newCliente = await this.clientesRepo.create(clienteData);
        
        logger.info('Cliente criado:', {
          id: newCliente.id,
          cnpj: documento,
          nome: clienteData.nome
        });

        return { cliente: newCliente, action: 'created' };
      }

    } catch (error) {
      logger.error('Erro no upsert do cliente:', {
        error: error.message,
        data: recebedorData
      });
      throw error;
    }
  }

  // UPSERT Embarcador (Remetente)
  async upsertEmbarcador(remetenteData) {
    try {
      if (!remetenteData || !remetenteData.documento) {
        throw new Error('Dados do remetente são obrigatórios');
      }

      const documento = remetenteData.documento.replace(/\D/g, '');
      
      if (!validateCNPJ(documento)) {
        throw new Error(`CNPJ do remetente inválido: ${remetenteData.documento}`);
      }

      const existingEmbarcador = await this.embarcadoresRepo.findByCnpj(documento);

      const embarcadorData = {
        cnpj: documento,
        nome: remetenteData.nome?.trim().toUpperCase() || '',
        endereco: remetenteData.endereco?.trim() || '',
        municipio: remetenteData.municipio?.trim() || '',
        uf: remetenteData.uf?.trim().toUpperCase() || '',
        contato: remetenteData.contato?.trim() || ''
      };

      if (existingEmbarcador) {
        const changes = this.getDataChanges(existingEmbarcador, embarcadorData);
        
        if (Object.keys(changes).length > 0) {
          const updated = await this.embarcadoresRepo.update(existingEmbarcador.id, changes);
          
          logger.info('Embarcador atualizado:', {
            id: existingEmbarcador.id,
            cnpj: documento,
            changes: Object.keys(changes)
          });

          return { embarcador: updated, action: 'updated', changes };
        }

        return { embarcador: existingEmbarcador, action: 'no_changes' };
      } else {
        const newEmbarcador = await this.embarcadoresRepo.create(embarcadorData);
        
        logger.info('Embarcador criado:', {
          id: newEmbarcador.id,
          cnpj: documento
        });

        return { embarcador: newEmbarcador, action: 'created' };
      }

    } catch (error) {
      logger.error('Erro no upsert do embarcador:', error);
      throw error;
    }
  }

  // UPSERT Transportadora
  async upsertTransportadora(transportadoraData) {
    try {
      if (!transportadoraData || !transportadoraData.cnpj) {
        throw new Error('CNPJ da transportadora é obrigatório');
      }

      const cnpj = transportadoraData.cnpj.replace(/\D/g, '');
      
      if (!validateCNPJ(cnpj)) {
        throw new Error(`CNPJ da transportadora inválido: ${transportadoraData.cnpj}`);
      }

      const existingTransportadora = await this.transportadorasRepo.findByCnpj(cnpj);

      const tpData = {
        cnpj: cnpj,
        nome: transportadoraData.nome?.trim().toUpperCase() || '',
        endereco: transportadoraData.endereco?.trim() || '',
        municipio: transportadoraData.municipio?.trim() || '',
        uf: transportadoraData.uf?.trim().toUpperCase() || '',
        ativo: true
      };

      if (existingTransportadora) {
        const changes = this.getDataChanges(existingTransportadora, tpData);
        
        if (Object.keys(changes).length > 0) {
          const updated = await this.transportadorasRepo.update(existingTransportadora.id, changes);
          return { transportadora: updated, action: 'updated', changes };
        }

        return { transportadora: existingTransportadora, action: 'no_changes' };
      } else {
        const newTransportadora = await this.transportadorasRepo.create(tpData);
        
        logger.info('Transportadora criada:', {
          id: newTransportadora.id,
          cnpj: cnpj
        });

        return { transportadora: newTransportadora, action: 'created' };
      }

    } catch (error) {
      logger.error('Erro no upsert da transportadora:', error);
      throw error;
    }
  }

  // UPSERT Endereço de Entrega
  async upsertEnderecoEntrega(enderecoData, clienteId) {
    try {
      if (!enderecoData || !clienteId) {
        return null;
      }

      const endereco = {
        cliente_id: clienteId,
        endereco: enderecoData.endereco?.trim() || '',
        bairro: enderecoData.bairro?.trim() || '',
        cidade: enderecoData.cidade?.trim() || '',
        uf: enderecoData.uf?.trim().toUpperCase() || '',
        cep: enderecoData.cep?.replace(/\D/g, '') || '',
        doca: enderecoData.doca?.trim() || null,
        rota: enderecoData.rota?.trim() || null
      };

      // Buscar endereço similar
      const existing = await this.enderecoEntregaRepo.findSimilar({
        cliente_id: clienteId,
        endereco: endereco.endereco,
        cep: endereco.cep
      });

      if (existing) {
        const changes = this.getDataChanges(existing, endereco);
        
        if (Object.keys(changes).length > 0) {
          const updated = await this.enderecoEntregaRepo.update(existing.id, changes);
          return { endereco: updated, action: 'updated', changes };
        }

        return { endereco: existing, action: 'no_changes' };
      } else {
        const newEndereco = await this.enderecoEntregaRepo.create(endereco);
        return { endereco: newEndereco, action: 'created' };
      }

    } catch (error) {
      logger.error('Erro no upsert do endereço:', error);
      return null;
    }
  }

  // Comparar dados e retornar apenas diferenças
  getDataChanges(existing, newData) {
    const changes = {};
    
    for (const [key, newValue] of Object.entries(newData)) {
      const existingValue = existing[key];
      
      // Comparar valores normalizados
      const normalizedNew = this.normalizeValue(newValue);
      const normalizedExisting = this.normalizeValue(existingValue);
      
      if (normalizedNew !== normalizedExisting) {
        changes[key] = newValue;
      }
    }
    
    return changes;
  }

  // Normalizar valores para comparação
  normalizeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value.trim().toUpperCase();
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    return value;
  }
}

module.exports = UpsertManagerService;