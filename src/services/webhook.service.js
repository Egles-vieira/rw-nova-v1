// ==========================================
// WEBHOOK SERVICE - ATUALIZADO PARA NOVO FORMATO
// ==========================================
// backend/src/services/webhook.service.js

const logger = require('../config/logger');
const db = require('../database/connection');

// Repositories
const NotasFiscaisRepository = require('../repositories/notas-fiscais.repository');
const ClientesRepository = require('../repositories/clientes.repository');
const EmbarcadoresRepository = require('../repositories/embarcadores.repository');
const TransportadorasRepository = require('../repositories/transportadoras.repository');
const { EnderecoEntregaRepository } = require('../repositories/endereco-entrega.repository');
const OcorrenciasRepository = require('../repositories/ocorrencias.repository');

class WebhookService {
  constructor() {
    this.notasRepository = new NotasFiscaisRepository();
    this.clientesRepository = new ClientesRepository();
    this.embarcadoresRepository = new EmbarcadoresRepository();
    this.transportadorasRepository = new TransportadorasRepository();
    this.enderecoEntregaRepository = new EnderecoEntregaRepository();
    this.ocorrenciasRepository = new OcorrenciasRepository();
    this.clientePadraoId = null;
    this.embarcadorPadraoId = null;
    this.transportadoraPadraoId = null;
  }

  // Processar notas fiscais recebidas via webhook
  async processNotasFiscais(notfis) {
    const results = {
      processed: 0,
      errors: []
    };

    if (!Array.isArray(notfis)) {
      throw new Error('Formato inválido: esperado array de notas fiscais');
    }

    // Pré-carrega os IDs padrão uma vez
    if (this.clientePadraoId === null) {
      this.clientePadraoId = await this.getClientePadraoId();
    }
    if (this.embarcadorPadraoId === null) {
      this.embarcadorPadraoId = await this.getEmbarcadorPadraoId();
    }
    if (this.transportadoraPadraoId === null) {
      this.transportadoraPadraoId = await this.getTransportadoraPadraoId();
    }

    for (const notaData of notfis) {
      try {
        await this.processNotaFiscalIndividual(notaData);
        results.processed++;
        
        logger.info('Nota fiscal processada com sucesso via webhook:', {
          numero: notaData.nro,
          processedCount: results.processed
        });
        
      } catch (error) {
        logger.error('Erro ao processar nota fiscal individual:', {
          numero: notaData.nro,
          error: error.message
        });
        
        results.errors.push({
          numero: notaData.nro,
          error: error.message
        });
      }
    }

    logger.info('Processamento de notas fiscais finalizado:', {
      total: notfis.length,
      processed: results.processed,
      errors: results.errors.length
    });

    return results;
  }

  // Processar uma nota fiscal individual
  async processNotaFiscalIndividual(notaData) {
    try {
      logger.info('Iniciando processamento de nota fiscal individual:', {
        numero: notaData.nro,
        hasRecebedor: !!(notaData.recebedor && notaData.recebedor.length > 0),
        hasRemetente: !!(notaData.remetente && notaData.remetente.length > 0),
        hasTransportadora: !!(notaData.transportadora && notaData.transportadora.length > 0),
        hasEnderecoEntrega: !!(notaData.endereco_entrega && notaData.endereco_entrega.length > 0)
      });

      // 1. Processar cliente (recebedor) - OBRIGATÓRIO
      let clienteId = this.clientePadraoId;
      
      if (notaData.recebedor && notaData.recebedor.length > 0 && notaData.recebedor[0].documento) {
        try {
          clienteId = await this.processCliente(notaData.recebedor[0]);
          logger.debug('Cliente processado:', { clienteId });
        } catch (error) {
          logger.warn('Falha ao processar cliente, usando padrão:', error.message);
          clienteId = this.clientePadraoId;
        }
      }

      // 2. Processar embarcador (remetente) - OBRIGATÓRIO
      let embarcadorId = this.embarcadorPadraoId;
      if (notaData.remetente && notaData.remetente.length > 0 && notaData.remetente[0].documento) {
        try {
          embarcadorId = await this.processEmbarcador(notaData.remetente[0]);
          logger.debug('Embarcador processado:', { embarcadorId });
        } catch (error) {
          logger.warn('Falha ao processar embarcador, usando padrão:', error.message);
          embarcadorId = this.embarcadorPadraoId;
        }
      }

      // 3. Processar transportadora - OBRIGATÓRIO
      let transportadoraId = this.transportadoraPadraoId;
      if (notaData.transportadora && notaData.transportadora.length > 0 && notaData.transportadora[0].cnpj) {
        try {
          transportadoraId = await this.processTransportadora(notaData.transportadora[0]);
          logger.debug('Transportadora processada:', { transportadoraId });
        } catch (error) {
          logger.warn('Falha ao processar transportadora, usando padrão:', error.message);
          transportadoraId = this.transportadoraPadraoId;
        }
      }

      // 4. Processar endereço de entrega (opcional)
      let enderecoEntregaId = null;
      if (notaData.endereco_entrega && notaData.endereco_entrega.length > 0) {
        const enderecoData = notaData.endereco_entrega[0];
        if (enderecoData.endereco && enderecoData.cidade && enderecoData.uf) {
          try {
            enderecoEntregaId = await this.processEnderecoEntrega(enderecoData, clienteId);
            logger.debug('Endereço de entrega processado:', { enderecoEntregaId });
          } catch (error) {
            logger.warn('Falha ao processar endereço de entrega:', error.message);
          }
        }
      }

      // 5. Criar/atualizar nota fiscal
      const notaFiscalData = {
        nro: notaData.nro,
        ser: notaData.ser,
        valor: notaData.valor,
        peso_real: notaData.peso_real,
        peso_calculo: notaData.peso_calculo,
        qtd_volumes: notaData.qtd_volumes,
        metro_cubico: notaData.metro_cubico,
        valor_frete: notaData.valor_frete,
        chave_nf: notaData.chave_nf,
        nro_pedido: notaData.nro_pedido,
        cod_rep: notaData.cod_rep,
        nome_rep: notaData.nome_rep,
        observacoes: notaData.observacoes,
        mensagem: notaData.mensagem,
        previsao_entrega: notaData.previsao_entrega ? new Date(notaData.previsao_entrega) : null,
        data_entrega: notaData.data_entrega ? new Date(notaData.data_entrega) : null,
        nf_retida: notaData.nf_retida || false,
        cliente_id: clienteId,
        embarcador_id: embarcadorId,
        transportadora_id: transportadoraId,
        endereco_entrega_id: enderecoEntregaId,
        emi_nf: notaData.emi_nf ? new Date(notaData.emi_nf) : null,
        status_nf: notaData.status_nf || 'pendente',
        updated_at: new Date()
      };

      // Verificar se nota fiscal já existe
      let notaFiscal;
      const existingNota = await this.notasRepository.findByNumero(notaData.nro);
      
      if (existingNota && existingNota.length > 0) {
        const notaExistente = existingNota[0];
        notaFiscal = await this.notasRepository.update(notaExistente.id, notaFiscalData);
        logger.debug('Nota fiscal atualizada:', { id: notaExistente.id });
      } else {
        notaFiscalData.created_at = new Date();
        notaFiscal = await this.notasRepository.create(notaFiscalData);
        logger.debug('Nota fiscal criada:', { id: notaFiscal.id });
      }
      
      logger.info('Nota fiscal processada com sucesso:', {
        id: notaFiscal.id,
        numero: notaData.nro
      });

      return notaFiscal;

    } catch (error) {
      logger.error('Erro no processamento da nota fiscal:', {
        numero: notaData.nro,
        error: error.message
      });
      throw error;
    }
  }

  // Processar cliente (recebedor) - APENAS CAMPOS NECESSÁRIOS
  async processCliente(clienteData) {
    try {
      if (!clienteData.documento) {
        throw new Error('CNPJ/CPF do cliente é obrigatório');
      }

      let cliente = await this.clientesRepository.findByDocumento(clienteData.documento);
      
      if (!cliente) {
        // Criar novo cliente com dados básicos
        const clienteToCreate = {
          documento: clienteData.documento,
          cod_cliente: clienteData.cod_cliente || this.gerarCodigoClienteFromCnpj(clienteData.documento),
          nome: clienteData.nome || 'Cliente não informado',
          endereco: clienteData.endereco || 'Não informado',
          bairro: clienteData.bairro || 'Não informado',
          cep: clienteData.cep || '00000000',
          cidade: clienteData.cidade || 'Não informado',
          uf: clienteData.uf || 'NI',
          contato: clienteData.contato || '0000000000',
          created_at: new Date(),
          updated_at: new Date()
        };
        
        cliente = await this.clientesRepository.create(clienteToCreate);
        logger.debug('Cliente criado:', { id: cliente.id, documento: clienteData.documento });
      } else {
        // Atualizar dados do cliente existente
        const clienteToUpdate = {
          nome: clienteData.nome || cliente.nome,
          endereco: clienteData.endereco || cliente.endereco,
          bairro: clienteData.bairro || cliente.bairro,
          cep: clienteData.cep || cliente.cep,
          cidade: clienteData.cidade || cliente.cidade,
          uf: clienteData.uf || cliente.uf,
          contato: clienteData.contato || cliente.contato,
          updated_at: new Date()
        };
        
        await this.clientesRepository.update(cliente.id, clienteToUpdate);
        logger.debug('Cliente atualizado:', { id: cliente.id, documento: clienteData.documento });
      }
      
      return cliente.id;
    } catch (error) {
      logger.error('Erro ao processar cliente:', error.message);
      throw error;
    }
  }

  // Processar embarcador (remetente)
  async processEmbarcador(embarcadorData) {
    try {
      if (!embarcadorData.documento) {
        throw new Error('CNPJ do embarcador é obrigatório');
      }

      let embarcador = await this.embarcadoresRepository.findByDocumento(embarcadorData.documento);
      
      if (!embarcador) {
        // Criar novo embarcador
        const embarcadorToCreate = {
          documento: embarcadorData.documento,
          nome: embarcadorData.nome || 'Embarcador não informado',
          endereco: embarcadorData.endereco || 'Não informado',
          cidade: embarcadorData.cidade || embarcadorData.municipio || 'Não informado',
          uf: embarcadorData.uf || 'NI',
          created_at: new Date(),
          updated_at: new Date()
        };
        
        embarcador = await this.embarcadoresRepository.create(embarcadorToCreate);
        logger.debug('Embarcador criado:', { id: embarcador.id, documento: embarcadorData.documento });
      } else {
        // Atualizar dados do embarcador existente
        const embarcadorToUpdate = {
          nome: embarcadorData.nome || embarcador.nome,
          endereco: embarcadorData.endereco || embarcador.endereco,
          cidade: embarcadorData.cidade || embarcadorData.municipio || embarcador.cidade,
          uf: embarcadorData.uf || embarcador.uf,
          updated_at: new Date()
        };
        
        await this.embarcadoresRepository.update(embarcador.id, embarcadorToUpdate);
        logger.debug('Embarcador atualizado:', { id: embarcador.id, documento: embarcadorData.documento });
      }
      
      return embarcador.id;
    } catch (error) {
      logger.error('Erro ao processar embarcador:', error.message);
      throw error;
    }
  }

  // Processar transportadora
  async processTransportadora(transportadoraData) {
    try {
      if (!transportadoraData.cnpj) {
        throw new Error('CNPJ da transportadora é obrigatório');
      }

      let transportadora = await this.transportadorasRepository.findByCnpj(transportadoraData.cnpj);
      
      if (!transportadora) {
        // Criar nova transportadora
        const transportadoraToCreate = {
          cnpj: transportadoraData.cnpj,
          nome: transportadoraData.nome || 'Transportadora não informada',
          endereco: transportadoraData.endereco || 'Não informado',
          municipio: transportadoraData.municipio || transportadoraData.cidade || 'Não informado',
          uf: transportadoraData.uf || 'NI',
          created_at: new Date(),
          updated_at: new Date()
        };
        
        transportadora = await this.transportadorasRepository.create(transportadoraToCreate);
        logger.debug('Transportadora criada:', { id: transportadora.id, cnpj: transportadoraData.cnpj });
      } else {
        // Atualizar dados da transportadora existente
        const transportadoraToUpdate = {
          nome: transportadoraData.nome || transportadora.nome,
          endereco: transportadoraData.endereco || transportadora.endereco,
          municipio: transportadoraData.municipio || transportadoraData.cidade || transportadora.municipio,
          uf: transportadoraData.uf || transportadora.uf,
          updated_at: new Date()
        };
        
        await this.transportadorasRepository.update(transportadora.id, transportadoraToUpdate);
        logger.debug('Transportadora atualizada:', { id: transportadora.id, cnpj: transportadoraData.cnpj });
      }
      
      return transportadora.id;
    } catch (error) {
      logger.error('Erro ao processar transportadora:', error.message);
      throw error;
    }
  }

  // Processar endereço de entrega usando método do repositório
  async processEnderecoEntrega(enderecoData, clienteId) {
    try {
      logger.debug('Processando endereço de entrega:', {
        endereco: enderecoData.endereco,
        cidade: enderecoData.cidade,
        uf: enderecoData.uf,
        clienteId: clienteId || this.clientePadraoId
      });

      // Delegar processamento para o repositório
      const resultado = await this.enderecoEntregaRepository.processEnderecoEntrega(
        enderecoData,
        clienteId || this.clientePadraoId
      );

      logger.debug('Endereço de entrega processado:', {
        id: resultado.id,
        isNew: resultado.isNew,
        endereco: enderecoData.endereco
      });

      return resultado.id;
    } catch (error) {
      logger.error('Erro ao processar endereço de entrega:', error.message);
      throw error;
    }
  }

  // === MÉTODOS DE APOIO ===

  async getClientePadraoId() {
    try {
      const cnpjPadrao = '00000000000000';
      
      let clientePadrao = await this.clientesRepository.findByDocumento(cnpjPadrao);
      if (clientePadrao) {
        return clientePadrao.id;
      }
      
      logger.info('Criando cliente padrão...');
      const clienteToCreate = {
        documento: cnpjPadrao,
        cod_cliente: 99999,
        nome: 'Cliente Não Informado',
        endereco: 'Não informado',
        bairro: 'Não informado',
        cep: '00000000',
        cidade: 'Não informado',
        uf: 'NI',
        contato: '0000000000',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const novoCliente = await this.clientesRepository.create(clienteToCreate);
      logger.info('Cliente padrão criado com sucesso:', { id: novoCliente.id });
      return novoCliente.id;
      
    } catch (error) {
      logger.error('Falha ao obter cliente padrão:', error.message);
      throw new Error('Sistema de clientes indisponível');
    }
  }

  async getEmbarcadorPadraoId() {
    try {
      const cnpjPadrao = '00000000000100';
      let embarcador = await this.embarcadoresRepository.findByDocumento(cnpjPadrao);
      
      if (embarcador) {
        return embarcador.id;
      }
      
      const embarcadorData = {
        documento: cnpjPadrao,
        nome: 'Embarcador Não Informado',
        endereco: 'Não informado',
        cidade: 'Não informado',
        uf: 'NI',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const novoEmbarcador = await this.embarcadoresRepository.create(embarcadorData);
      return novoEmbarcador.id;
      
    } catch (error) {
      logger.error('Falha ao obter embarcador padrão:', error.message);
      throw new Error('Não foi possível obter embarcador');
    }
  }

  async getTransportadoraPadraoId() {
    try {
      const cnpjPadrao = '00000000000200';
      let transportadora = await this.transportadorasRepository.findByCnpj(cnpjPadrao);
      
      if (transportadora) {
        return transportadora.id;
      }
      
      const transportadoraData = {
        cnpj: cnpjPadrao,
        nome: 'Transportadora Não Informada',
        endereco: 'Não informado',
        municipio: 'Não informado',
        uf: 'NI',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const novaTransportadora = await this.transportadorasRepository.create(transportadoraData);
      return novaTransportadora.id;
      
    } catch (error) {
      logger.error('Falha ao obter transportadora padrão:', error.message);
      throw new Error('Não foi possível obter transportadora');
    }
  }

  // Processar ocorrências recebidas via webhook
  async processOcorrencias(ocorrencias) {
    const results = {
      processed: 0,
      errors: []
    };

    if (!Array.isArray(ocorrencias)) {
      throw new Error('Formato inválido: esperado array de ocorrências');
    }

    for (const ocorrenciaData of ocorrencias) {
      try {
        await this.processOcorrenciaIndividual(ocorrenciaData);
        results.processed++;
        
        logger.info('Ocorrência processada com sucesso via webhook:', {
          nro_nf: ocorrenciaData.nro_nf,
          codigo: ocorrenciaData.codigo,
          processedCount: results.processed
        });
        
      } catch (error) {
        logger.error('Erro ao processar ocorrência individual:', {
          nro_nf: ocorrenciaData.nro_nf,
          codigo: ocorrenciaData.codigo,
          error: error.message
        });
        
        results.errors.push({
          nro_nf: ocorrenciaData.nro_nf,
          codigo: ocorrenciaData.codigo,
          error: error.message
        });
      }
    }

    logger.info('Processamento de ocorrências finalizado:', {
      total: ocorrencias.length,
      processed: results.processed,
      errors: results.errors.length
    });

    return results;
  }

  // Processar uma ocorrência individual
// Processar uma ocorrência individual
async processOcorrenciaIndividual(ocorrenciaData) {
  try {
    logger.info('Iniciando processamento de ocorrência individual:', {
      nro_nf: ocorrenciaData.nro_nf,
      codigo: ocorrenciaData.codigo,
      descricao: ocorrenciaData.descricao
    });

    // Validar campos obrigatórios baseados no schema real
    if (!ocorrenciaData.nro_nf) {
      throw new Error('Número da NF é obrigatório');
    }

    if (!ocorrenciaData.codigo) {
      throw new Error('Código da ocorrência é obrigatório');
    }

    if (!ocorrenciaData.descricao) {
      throw new Error('Descrição da ocorrência é obrigatória');
    }

    if (!ocorrenciaData.dataHoraEnvio) {
      throw new Error('Data/hora de envio é obrigatória');
    }

    // Verificar se a nota fiscal existe
    const notaFiscal = await this.notasRepository.findByNumero(ocorrenciaData.nro_nf);
    if (!notaFiscal || notaFiscal.length === 0) {
      throw new Error(`Nota fiscal ${ocorrenciaData.nro_nf} não encontrada`);
    }

    // Validar código de ocorrência
    const codigoOcorrencia = await this.validateCodigoOcorrencia(ocorrenciaData.codigo);
    if (!codigoOcorrencia) {
      logger.warn(`Código de ocorrência ${ocorrenciaData.codigo} não encontrado, criando mesmo assim`);
    }

    // Verificar duplicação
    const existente = await this.findOcorrenciaExistente(
      ocorrenciaData.nro_nf,
      ocorrenciaData.codigo,
      ocorrenciaData.dataHoraEnvio
    );

    if (existente) {
      logger.info('Ocorrência já existe, ignorando:', {
        id: existente.id,
        nro_nf: ocorrenciaData.nro_nf,
        codigo: ocorrenciaData.codigo
      });
      return existente;
    }

    // Preparar dados da ocorrência baseados no schema real
    const ocorrenciaToCreate = {
      // Campos obrigatórios
      nro_nf: parseInt(ocorrenciaData.nro_nf),                                    // integer NOT NULL
      dataHoraEnvio: new Date(ocorrenciaData.dataHoraEnvio),                     // timestamp NOT NULL  
      codigo: parseInt(ocorrenciaData.codigo),                                   // integer NOT NULL
      descricao: ocorrenciaData.descricao,                                       // text NOT NULL
      
      // Campos opcionais
      dataHoraEvento: ocorrenciaData.dataHoraEvento ? new Date(ocorrenciaData.dataHoraEvento) : null,  // timestamp nullable
      complemento: ocorrenciaData.complemento || null,                           // varchar(255) nullable
      nomeRecebedor: ocorrenciaData.nomeRecebedor || null,                       // varchar(255) nullable
      docRecebedor: ocorrenciaData.docRecebedor || null,                         // char(20) nullable
      latitude: ocorrenciaData.latitude || null,                                 // numeric(8,2) nullable
      longitude: ocorrenciaData.longitude || null,                               // numeric(8,2) nullable
      linkComprovante: ocorrenciaData.linkComprovante || null,                   // text nullable
      zaapId: ocorrenciaData.zaapId || null,                                     // varchar(255) nullable
      messageId: ocorrenciaData.messageId || null,                               // varchar(255) nullable
      id_z_api: ocorrenciaData.id_z_api || null,                                 // varchar(255) nullable
      enviado_zap: ocorrenciaData.enviado_zap !== undefined ? ocorrenciaData.enviado_zap : false,  // boolean DEFAULT false
      enviado_date: ocorrenciaData.enviado_date ? new Date(ocorrenciaData.enviado_date) : null,    // timestamp nullable
      status: this.validateStatus(ocorrenciaData.status),                        // varchar(255) com constraint
      link_comprovante_sistema: ocorrenciaData.link_comprovante_sistema || null, // text nullable
      status_download_comprovante: ocorrenciaData.status_download_comprovante || null,  // integer nullable
      tipo_comprovante_download: ocorrenciaData.tipo_comprovante_download || null,      // varchar(255) nullable
      
      // Timestamps automáticos
      created_at: new Date(),
      updated_at: new Date()
    };

    // Criar ocorrência
    const ocorrencia = await this.ocorrenciasRepository.create(ocorrenciaToCreate);
    logger.debug('Ocorrência criada:', { id: ocorrencia.id });

    // Atualizar status da nota fiscal se código é finalizador
    if (codigoOcorrencia && codigoOcorrencia.finalizadora) {
      await this.updateNotaFiscalStatus(ocorrenciaData.nro_nf, codigoOcorrencia);
    }

    logger.info('Ocorrência processada com sucesso:', {
      id: ocorrencia.id,
      nro_nf: ocorrenciaData.nro_nf,
      codigo: ocorrenciaData.codigo
    });

    return ocorrencia;

  } catch (error) {
    logger.error('Erro no processamento da ocorrência:', {
      nro_nf: ocorrenciaData.nro_nf,
      codigo: ocorrenciaData.codigo,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Validar status (deve ser um dos valores permitidos pela constraint)
validateStatus(status) {
  const validStatuses = ['waiting', 'running', 'finished'];
  
  if (!status) {
    return 'waiting'; // Default
  }
  
  if (validStatuses.includes(status)) {
    return status;
  }
  
  logger.warn(`Status inválido recebido: ${status}, usando 'waiting'`);
  return 'waiting';
}

// Validar se código de ocorrência existe
async validateCodigoOcorrencia(codigo) {
  try {
    // Buscar diretamente na tabela codigo_ocorrencias pelo campo 'codigo'
    const sql = `SELECT * FROM codigo_ocorrencias WHERE codigo = $1 LIMIT 1`;
    const result = await db.query(sql, [codigo]);
    
    return result.rows[0] || null;
  } catch (error) {
    logger.warn('Erro ao validar código de ocorrência:', error.message);
    return null;
  }
}

// Buscar ocorrência existente para evitar duplicação
async findOcorrenciaExistente(nroNf, codigo, dataHoraEnvio) {
  try {
    // Buscar ocorrência com mesmo NF, código e data/hora de envio
    const sql = `
      SELECT id FROM ocorrencias 
      WHERE nro_nf = $1 
      AND codigo = $2 
      AND "dataHoraEnvio" = $3 
      LIMIT 1
    `;
    
    const result = await db.query(sql, [
      nroNf, 
      codigo, 
      new Date(dataHoraEnvio)
    ]);

    return result.rows[0] || null;
  } catch (error) {
    logger.warn('Erro ao buscar ocorrência existente:', error.message);
    return null;
  }
}

// Atualizar status da nota fiscal baseado na ocorrência finalizadora
async updateNotaFiscalStatus(nroNf, codigoOcorrencia) {
  try {
    const notaFiscal = await this.notasRepository.findByNumero(nroNf);
    if (!notaFiscal || notaFiscal.length === 0) {
      return;
    }

    const nota = notaFiscal[0];
    let novoStatus = nota.status_nf;

    // Determinar novo status baseado no tipo de ocorrência
    switch (codigoOcorrencia.tipo) {
      case 'entrega':
        novoStatus = 'entregue';
        break;
      case 'coleta':
        novoStatus = 'coletado';
        break;
      case 'ocorrencia':
        if (codigoOcorrencia.descricao && codigoOcorrencia.descricao.toLowerCase().includes('entregue')) {
          novoStatus = 'entregue';
        }
        break;
      default:
        // Manter status atual
        break;
    }

    if (novoStatus !== nota.status_nf) {
      await this.notasRepository.update(nota.id, {
        status_nf: novoStatus,
        updated_at: new Date()
      });

      logger.info('Status da nota fiscal atualizado:', {
        nro_nf: nroNf,
        statusAnterior: nota.status_nf,
        novoStatus: novoStatus
      });
    }
  } catch (error) {
    logger.error('Erro ao atualizar status da nota fiscal:', {
      nro_nf: nroNf,
      error: error.message
    });
    // Não lança erro para não interromper processamento da ocorrência
  }
}

  // Validar se código de ocorrência existe
  async validateCodigoOcorrencia(codigo) {
    try {
      // Buscar diretamente na tabela codigo_ocorrencias pelo campo 'codigo'
      const sql = `SELECT * FROM codigo_ocorrencias WHERE codigo = $1 LIMIT 1`;
      const result = await db.query(sql, [codigo]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.warn('Erro ao validar código de ocorrência:', error.message);
      return null;
    }
  }

  // Buscar ocorrência existente para evitar duplicação
  async findOcorrenciaExistente(nroNf, codigo, dataHoraEnvio) {
    try {
      // Buscar ocorrência com mesmo NF, código e data/hora de envio usando SQL direto
      const sql = `
        SELECT id FROM ocorrencias 
        WHERE nro_nf = $1 
        AND codigo = $2 
        AND "dataHoraEnvio" = $3 
        LIMIT 1
      `;
      
      const result = await db.query(sql, [
        nroNf, 
        codigo, 
        new Date(dataHoraEnvio)
      ]);

      return result.rows[0] || null;
    } catch (error) {
      logger.warn('Erro ao buscar ocorrência existente:', error.message);
      return null;
    }
  }

  // Atualizar status da nota fiscal baseado na ocorrência finalizadora
  async updateNotaFiscalStatus(nroNf, codigoOcorrencia) {
    try {
      const notaFiscal = await this.notasRepository.findByNumero(nroNf);
      if (!notaFiscal || notaFiscal.length === 0) {
        return;
      }

      const nota = notaFiscal[0];
      let novoStatus = nota.status_nf;

      // Determinar novo status baseado no tipo de ocorrência
      switch (codigoOcorrencia.tipo) {
        case 'entrega':
          novoStatus = 'entregue';
          break;
        case 'coleta':
          novoStatus = 'coletado';
          break;
        case 'ocorrencia':
          if (codigoOcorrencia.descricao && codigoOcorrencia.descricao.toLowerCase().includes('entregue')) {
            novoStatus = 'entregue';
          }
          break;
        default:
          // Manter status atual
          break;
      }

      if (novoStatus !== nota.status_nf) {
        await this.notasRepository.update(nota.id, {
          status_nf: novoStatus,
          updated_at: new Date()
        });

        logger.info('Status da nota fiscal atualizado:', {
          nro_nf: nroNf,
          statusAnterior: nota.status_nf,
          novoStatus: novoStatus
        });
      }
    } catch (error) {
      logger.error('Erro ao atualizar status da nota fiscal:', {
        nro_nf: nroNf,
        error: error.message
      });
      // Não lança erro para não interromper processamento da ocorrência
    }
  }
}

module.exports = WebhookService;