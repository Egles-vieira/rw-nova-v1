// ==========================================
// 5. SCRIPT DE GERAÇÃO DE DOCUMENTAÇÃO
// ==========================================
// backend/scripts/generate-external-docs.js

const path = require('path');
const fs = require('fs');
const logger = require('../src/config/logger');

async function generateDocs() {
  try {
    logger.info('Gerando documentação das APIs externas...');

    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Gerar Postman Collection
    const postmanCollection = generatePostmanCollection();
    fs.writeFileSync(
      path.join(docsDir, 'external-apis.postman_collection.json'),
      JSON.stringify(postmanCollection, null, 2)
    );

    // Gerar OpenAPI/Swagger spec
    const swaggerSpec = generateSwaggerSpec();
    fs.writeFileSync(
      path.join(docsDir, 'external-apis-swagger.json'),
      JSON.stringify(swaggerSpec, null, 2)
    );

    // Gerar exemplos cURL
    const curlExamples = generateCurlExamples();
    fs.writeFileSync(
      path.join(docsDir, 'external-apis-curl-examples.md'),
      curlExamples
    );

    logger.info('✓ Documentação gerada com sucesso em /docs/');

  } catch (error) {
    logger.error('Erro ao gerar documentação:', error);
    process.exit(1);
  }
}

function generatePostmanCollection() {
  return {
    info: {
      name: "Road-RW External APIs",
      description: "APIs externas para integração com transportadoras",
      version: "1.0.0"
    },
    variable: [
      { key: "base_url", value: "http://localhost:3001" },
      { key: "external_token", value: "SEU_TOKEN_AQUI" }
    ],
    auth: {
      type: "bearer",
      bearer: [{ key: "token", value: "{{external_token}}" }]
    },
    item: [
      {
        name: "Health Check",
        request: {
          method: "GET",
          url: "{{base_url}}/api/external/health"
        }
      },
      {
        name: "Enviar Notas Fiscais",
        request: {
          method: "POST",
          url: "{{base_url}}/api/external/notas-fiscais",
          body: {
            mode: "raw",
            raw: JSON.stringify({
              notfis: [{
                chave_nf: "12345678901234567890123456789012345678901234",
                nro: 123456,
                ser: 1,
                emi_nf: "2025-01-15T00:00:00.000Z",
                recebedor: [{
                  documento: "12345678000195",
                  nome: "Empresa Teste Ltda"
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
            }, null, 2),
            options: { raw: { language: "json" } }
          }
        }
      }
    ]
  };
}

function generateSwaggerSpec() {
  return {
    openapi: "3.0.0",
    info: {
      title: "Road-RW External APIs",
      version: "1.0.0",
      description: "APIs externas para integração com transportadoras"
    },
    servers: [
      { url: "http://localhost:3001/api/external", description: "Desenvolvimento" },
      { url: "https://api.roadrw.com/api/external", description: "Produção" }
    ],
    security: [
      { BearerAuth: [] }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      }
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            200: { description: "API funcionando" }
          }
        }
      },
      "/notas-fiscais": {
        post: {
          summary: "Enviar notas fiscais",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    notfis: {
                      type: "array",
                      items: { $ref: "#/components/schemas/NotaFiscal" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}

function generateCurlExamples() {
  return `# Road-RW External APIs - Exemplos cURL

## 1. Health Check
\`\`\`bash
curl -X GET http://localhost:3001/api/external/health
\`\`\`

## 2. Enviar Notas Fiscais
\`\`\`bash
curl -X POST http://localhost:3001/api/external/notas-fiscais \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "notfis": [{
      "chave_nf": "12345678901234567890123456789012345678901234",
      "nro": 123456,
      "emi_nf": "2025-01-15T00:00:00.000Z",
      "recebedor": [{
        "documento": "12345678000195",
        "nome": "Empresa Teste Ltda"
      }],
      "remetente": [{
        "documento": "98765432000198", 
        "nome": "Remetente Teste Ltda"
      }],
      "transportadora": [{
        "cnpj": "11223344000156",
        "nome": "Transportadora Teste"
      }]
    }]
  }'
\`\`\`

## 3. Enviar Ocorrências
\`\`\`bash
curl -X POST http://localhost:3001/api/external/ocorrencias \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ocorrencias": [{
      "nro_nf": 123456,
      "codigo": "ENTREGUE",
      "descricao": "Mercadoria entregue",
      "data_evento": "2025-01-15T14:30:00Z"
    }]
  }'
\`\`\`

## 4. Consultar Status
\`\`\`bash
curl -X GET "http://localhost:3001/api/external/notas-fiscais/12345678901234567890123456789012345678901234/status" \\
  -H "Authorization: Bearer SEU_TOKEN"
\`\`\`
`;
}

// Executar se chamado diretamente
if (require.main === module) {
  generateDocs();
}

module.exports = { generateDocs };
