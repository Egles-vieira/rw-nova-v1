// =====================================
// TESTE RÁPIDO - webhook-test.js
// =====================================

const axios = require('axios');

// Payload mínimo para testar
const testPayload = {
  "notfis": [
    {
      "nro": 12345,
      "valor": 1000.50,
      "recebedor": [
        {
          "documento": "12345678000195",
          "nome": "EMPRESA TESTE LTDA"
        }
      ],
      "remetente": [
        {
          "documento": "98765432000198",
          "nome": "FORNECEDOR TESTE LTDA"
        }
      ],
      "transportadora": [
        {
          "cnpj": "11111111000111",
          "nome": "TRANSPORTADORA TESTE LTDA"
        }
      ]
    }
  ]
};

async function testarWebhook() {
  try {
    console.log('🧪 Testando webhook...');
    
    const response = await axios.post('http://localhost:3000/api/webhook/notafiscal', testPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Sucesso!');
    console.log('Status:', response.status);
    console.log('Dados:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Erro!');
    console.error('Status:', error.response?.status);
    console.error('Dados:', JSON.stringify(error.response?.data, null, 2));
  }
}

testarWebhook();

// =====================================
// COMO USAR:
// =====================================
// 1. Salve como webhook-test.js na pasta backend
// 2. Execute: node webhook-test.js
// 3. Veja se funciona com payload simples

// =====================================
// VERIFICAR LOGS DO SERVIDOR
// =====================================
// No terminal do servidor, você deve ver logs como:
// [INFO] Webhook request received - quantidade_notas: 1
// [INFO] Processando nota fiscal 1/1 - nro: 12345
// [WARN] Método findByDocumento não existe em ClientesRepository
// [INFO] Novo cliente criado - id: X, documento: 12345678000195