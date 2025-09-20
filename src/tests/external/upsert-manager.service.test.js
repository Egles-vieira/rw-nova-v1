
// ==========================================
// 1. TESTES UNITÁRIOS - UPSERT MANAGER
// ==========================================
// backend/tests/external/upsert-manager.service.test.js

const UpsertManagerService = require('../../src/services/external/upsert-manager.service');

describe('UpsertManagerService', () => {
  let service;
  let mockRepositories;

  beforeEach(() => {
    mockRepositories = {
      clientes: {
        findByCnpj: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      embarcadores: {
        findByCnpj: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      transportadoras: {
        findByCnpj: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      enderecoEntrega: {
        findSimilar: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };

    service = new UpsertManagerService(mockRepositories);
  });

  describe('upsertCliente', () => {
    const validRecebedor = {
      documento: '12345678000195',
      nome: 'Empresa Teste Ltda',
      endereco: 'Rua Teste, 123',
      cidade: 'São Paulo',
      uf: 'SP'
    };

    test('deve criar novo cliente quando não existe', async () => {
      mockRepositories.clientes.findByCnpj.mockResolvedValue(null);
      mockRepositories.clientes.create.mockResolvedValue({
        id: 1,
        ...validRecebedor,
        cnpj: '12345678000195'
      });

      const result = await service.upsertCliente(validRecebedor);

      expect(result.action).toBe('created');
      expect(result.cliente.id).toBe(1);
      expect(mockRepositories.clientes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cnpj: '12345678000195',
          nome: 'EMPRESA TESTE LTDA'
        })
      );
    });

    test('deve atualizar cliente existente quando há diferenças', async () => {
      const existingCliente = {
        id: 1,
        cnpj: '12345678000195',
        nome: 'EMPRESA TESTE LTDA',
        cidade: 'Rio de Janeiro' // Diferente
      };

      mockRepositories.clientes.findByCnpj.mockResolvedValue(existingCliente);
      mockRepositories.clientes.update.mockResolvedValue({
        ...existingCliente,
        cidade: 'SÃO PAULO'
      });

      const result = await service.upsertCliente(validRecebedor);

      expect(result.action).toBe('updated');
      expect(mockRepositories.clientes.update).toHaveBeenCalledWith(1, {
        cidade: 'São Paulo'
      });
    });

    test('deve retornar no_changes quando não há diferenças', async () => {
      const existingCliente = {
        id: 1,
        cnpj: '12345678000195',
        nome: 'EMPRESA TESTE LTDA',
        endereco: 'RUA TESTE, 123',
        cidade: 'SÃO PAULO',
        uf: 'SP'
      };

      mockRepositories.clientes.findByCnpj.mockResolvedValue(existingCliente);

      const result = await service.upsertCliente(validRecebedor);

      expect(result.action).toBe('no_changes');
      expect(mockRepositories.clientes.update).not.toHaveBeenCalled();
    });

    test('deve rejeitar CNPJ inválido', async () => {
      const invalidRecebedor = {
        ...validRecebedor,
        documento: '12345678000199' // CNPJ inválido
      };

      await expect(service.upsertCliente(invalidRecebedor))
        .rejects.toThrow('Documento inválido');
    });
  });

  describe('getDataChanges', () => {
    test('deve identificar corretamente as diferenças', () => {
      const existing = {
        nome: 'EMPRESA TESTE',
        cidade: 'SÃO PAULO',
        uf: 'SP'
      };

      const newData = {
        nome: 'Empresa Teste Ltda', // Diferente após normalização
        cidade: 'São Paulo', // Igual após normalização
        uf: 'RJ' // Diferente
      };

      const changes = service.getDataChanges(existing, newData);

      expect(changes).toEqual({
        nome: 'Empresa Teste Ltda',
        uf: 'RJ'
      });
    });

    test('deve tratar valores null/undefined', () => {
      const existing = {
        nome: 'TESTE',
        endereco: null
      };

      const newData = {
        nome: 'TESTE',
        endereco: 'Rua Nova'
      };

      const changes = service.getDataChanges(existing, newData);

      expect(changes).toEqual({
        endereco: 'Rua Nova'
      });
    });
  });
});
