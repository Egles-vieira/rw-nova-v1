// ==========================================
// 3. SCRIPT DE TESTES DE API
// ==========================================
// backend/scripts/test-external-apis.js

const axios = require('axios');
const logger = require('../src/config/logger');

class ExternalAPITester {
  constructor(baseURL = 'http://localhost:3001', token = null) {
    this.baseURL = baseURL;
    this.token = token;
    this.client = axios.create({
      baseURL: `${baseURL}/api/external`,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      timeout: 30000
    });
  }

  async runAllTests() {
    logger.info('=== INICIANDO TESTES DAS APIS EXTERNAS ===');

    const tests = [
      { name: 'Health Check', test: () => this.testHealthCheck() },
      { name: 'Notas Fiscais - Envio', test: () => this.testNotasFiscaisEnvio() },
      { name: 'Notas Fiscais - Consulta Status', test: () => this.testConsultaStatus() },
      { name: 'Ocorrências - Envio', test: () => this.testOcorrenciasEnvio() },
      { name: 'Webhook', test: () => this.testWebhook() }
    ];

    const results = {
      passed: 0,
      failed: 0,
      total: tests.length
    };

    for (const testCase of tests) {
      try {
        logger.info(`\n🧪 Testando: ${testCase.name}`);
        await testCase.test();
        results.passed++;
        logger.info(`✅ ${testCase.name} - PASSOU`);
      } catch (error) {
        results.failed++;
        logger.error(`❌ ${testCase.name} - FALHOU:`, error.message);
      }
    }

    logger.info('\n=== RESULTADO DOS TESTES ===');
    logger.info(`Total: ${results.total}`);
    logger.info(`Passou: ${results.passed}`);
    logger.info(`Falhou: ${results.failed}`);
    logger.info(`Taxa de sucesso: ${Math.round((results.passed / results.total) * 100)}%`);

    return results;
  }

  async testHealthCheck() {
    const response = await this.client.get('/health');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Health check returned success: false');
    }
  }

  async testNotasFiscaisEnvio() {
    if (!this.token) {
      throw new Error('Token necessário para teste de notas fiscais');
    }

    const payload = {
      notfis: [{
        chave_nf: "12345678901234567890123456789012345678901234",
        nro: 123456,
        ser: 1,
        emi_nf: "2025-01-15T00:00:00.000Z",
        peso_real: 1.5,
        qtd_volumes: 1,
        valor: 100.00,
        recebedor: [{
          documento: "12345678000195",
          nome: "Empresa Teste Ltda",
          endereco: "Rua Teste, 123",
          cidade: "São Paulo",
          uf: "SP"
        }],
        remetente: [{
          documento: "98765432000198",
          nome: "Remetente Teste Ltda"
        }],
        transportadora: [{
          cnpj: "11223344000156",
          nome: "Transportadora Teste"
        }]
      }]
    };

    const response = await this.client.post('/notas-fiscais', payload);
    
    if (![200, 206].includes(response.status)) {
      throw new Error(`Expected status 200 or 206, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Request failed: ' + response.data.message);
    }
  }

  async testConsultaStatus() {
    if (!this.token) {
      throw new Error('Token necessário para consulta de status');
    }

    // Usar chave de exemplo
    const chaveNF = "12345678901234567890123456789012345678901234";
    
    const response = await this.client.get(`/notas-fiscais/${chaveNF}/status`);
    
    // Aceitar 404 (não encontrada) ou 200 (encontrada)
    if (![200, 404].includes(response.status)) {
      throw new Error(`Expected status 200 or 404, got ${response.status}`);
    }
  }

  async testOcorrenciasEnvio() {
    if (!this.token) {
      throw new Error('Token necessário para teste de ocorrências');
    }

    const payload = {
      ocorrencias: [{
        nro_nf: 123456,
        codigo: "ENTREGUE",
        descricao: "Mercadoria entregue ao destinatário",
        data_evento: "2025-01-15T14:30:00.000Z",
        recebedor: "João Silva"
      }]
    };

    const response = await this.client.post('/ocorrencias', payload);
    
    if (![200, 206].includes(response.status)) {
      throw new Error(`Expected status 200 or 206, got ${response.status}`);
    }
  }

  async testWebhook() {
    if (!this.token) {
      throw new Error('Token necessário para teste de webhook');
    }

    const payload = {
      evento: "ocorrencia",
      dados: {
        nro_nf: 123456,
        codigo: "EM_TRANSITO",
        descricao: "Mercadoria em trânsito"
      }
    };

    const response = await this.client.post('/webhook', payload);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
  }
}

async function runTests() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3001';
  const token = process.argv[2];

  if (!token) {
    logger.warn('Executando testes limitados (sem token)');
    logger.warn('Para testes completos: npm run external:test TOKEN');
  }

  const tester = new ExternalAPITester(baseURL, token);
  const results = await tester.runAllTests();

  if (results.failed > 0) {
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests().catch(error => {
    logger.error('Erro nos testes:', error);
    process.exit(1);
  });
}

module.exports = { ExternalAPITester };
