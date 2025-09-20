// ==========================================
// 2. TESTES DE INTEGRAÇÃO - EXTERNAL CONTROLLER
// ==========================================
// backend/tests/external/external-notas.controller.integration.test.js

const request = require('supertest');
const express = require('express');
const ExternalNotasController = require('../../src/controllers/external-notas.controller');

describe('ExternalNotasController Integration', () => {
  let app;
  let mockRepositories;
  let controller;

  beforeEach(() => {
    mockRepositories = {
      notas: {
        findByChaveNF: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      clientes: {
        findByCnpj: jest.fn(),
        create: jest.fn()
      },
      transportadoras: {
        findByCnpj: jest.fn(),
        create: jest.fn()
      },
      embarcadores: {
        findByCnpj: jest.fn(),
        create: jest.fn()
      },
      externalLogs: {
        create: jest.fn()
      }
    };

    controller = new ExternalNotasController(mockRepositories);

    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.externalAuth = {
        token: { token: 'test-token', integracao: 'test' },
        transportadora: { id: 1, nome: 'Test Transport' }
      };
      next();
    });

    app.post('/external/notas-fiscais', (req, res) => 
      controller.receiveNotasFiscais(req, res)
    );
  });

  test('deve processar notas fiscais válidas', async () => {
    const validPayload = {
      notfis: [{
        peso_calculo: 0.0,
        chave_nf: "35250761418042000131550040018757221276116250",
        ser: 4,
        emi_nf: "2025-07-04T00:00:00.000Z",
        nro: 1875722,
        nro_pedido: 2413919,
        peso_real: 1.032,
        qtd_volumes: 1,
        valor: 748.14,
        recebedor: [{
          cod_cliente: "56440",
          documento: "24876491000369",
          nome: "POLICLINICA QUALITY LTDA",
          endereco: "R RIACHUELO,685",
          cidade: "CÁCERES",
          uf: "MT"
        }],
        remetente: [{
          documento: "61418042000131",
          nome: "CIRURGICA FERNANDES C.MAT.CIR.HO.SO.LTDA"
        }],
        transportadora: [{
          cnpj: "95591723000119",
          nome: "TNT MERCURIO CARGAS E ENCOMENDAS EXPRESSAS LTDA"
        }]
      }]
    };

    // Mock successful creation
    mockRepositories.transportadoras.findByCnpj.mockResolvedValue(null);
    mockRepositories.transportadoras.create.mockResolvedValue({ id: 1 });
    mockRepositories.clientes.findByCnpj.mockResolvedValue(null);
    mockRepositories.clientes.create.mockResolvedValue({ id: 1 });
    mockRepositories.embarcadores.findByCnpj.mockResolvedValue(null);
    mockRepositories.embarcadores.create.mockResolvedValue({ id: 1 });
    mockRepositories.notas.findByChaveNF.mockResolvedValue(null);
    mockRepositories.notas.create.mockResolvedValue({ id: 1 });

    const response = await request(app)
      .post('/external/notas-fiscais')
      .send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary.processed).toBe(1);
    expect(response.body.data.summary.created).toBe(1);
  });

  test('deve retornar erro para payload inválido', async () => {
    const invalidPayload = {
      notfis: [{
        // Faltando campos obrigatórios
        nro: 123
      }]
    };

    const response = await request(app)
      .post('/external/notas-fiscais')
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
