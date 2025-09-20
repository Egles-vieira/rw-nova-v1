// ==========================================
// 4. DOCUMENTAÇÃO COMPLETA DE USO
// ==========================================
// docs/EXTERNAL_APIS.md

/**
 * # APIs Externas - Road-RW
 * 
 * Sistema completo para integração externa com transportadoras via APIs REST.
 * 
 * ## 🚀 Início Rápido
 * 
 * ### 1. Configuração Inicial
 * ```bash
 * # Executar setup
 * npm run setup:external
 * 
 * # Criar token para transportadora
 * npm run external:tokens create jamef 365
 * ```
 * 
 * ### 2. Teste de Conexão
 * ```bash
 * curl http://localhost:3001/api/external/health
 * ```
 * 
 * ## 🔐 Autenticação
 * 
 * Todas as APIs externas requerem autenticação via Bearer Token:
 * 
 * ```bash
 * Authorization: Bearer SEU_TOKEN_AQUI
 * ```
 * 
 * ### Obter Token
 * ```bash
 * # Via script
 * npm run external:tokens create jamef 365
 * 
 * # Via API interna (admin)
 * curl -X POST /api/jobs/api-tokens \
 *   -H "Authorization: Bearer ADMIN_TOKEN" \
 *   -d '{"integracao": "jamef", "token": "TOKEN_PERSONALIZADO"}'
 * ```
 * 
 * ## 📋 APIs Disponíveis
 * 
 * ### 1. Enviar Notas Fiscais
 * ```bash
 * POST /api/external/notas-fiscais
 * Content-Type: application/json
 * Authorization: Bearer TOKEN
 * 
 * {
 *   "notfis": [
 *     {
 *       "peso_calculo": 0.0,
 *       "chave_nf": "35250761418042000131550040018757221276116250",
 *       "ser": 4,
 *       "emi_nf": "2025-07-04T00:00:00.000Z",
 *       "nro": 1875722,
 *       "nro_pedido": 2413919,
 *       "peso_real": 1.032,
 *       "qtd_volumes": 1,
 *       "valor": 748.14,
 *       "recebedor": [{
 *         "documento": "24876491000369",
 *         "nome": "POLICLINICA QUALITY LTDA",
 *         "endereco": "R RIACHUELO,685",
 *         "cidade": "CÁCERES",
 *         "uf": "MT"
 *       }],
 *       "remetente": [{
 *         "documento": "61418042000131",
 *         "nome": "CIRURGICA FERNANDES LTDA"
 *       }],
 *       "transportadora": [{
 *         "cnpj": "95591723000119",
 *         "nome": "TNT MERCURIO CARGAS LTDA"
 *       }]
 *     }
 *   ]
 * }
 * ```
 * 
 * ### 2. Enviar Ocorrências
 * ```bash
 * POST /api/external/ocorrencias
 * 
 * {
 *   "ocorrencias": [
 *     {
 *       "nro_nf": 1875722,
 *       "codigo": "ENTREGUE",
 *       "descricao": "Mercadoria entregue",
 *       "data_evento": "2025-07-15T14:30:00Z",
 *       "recebedor": "João Silva",
 *       "documento_recebedor": "12345678901",
 *       "latitude": -23.550520,
 *       "longitude": -46.633308
 *     }
 *   ]
 * }
 * ```
 * 
 * ### 3. Consultar Status
 * ```bash
 * GET /api/external/notas-fiscais/35250761418042000131550040018757221276116250/status
 * ```
 * 
 * ### 4. Webhook
 * ```bash
 * POST /api/external/webhook
 * 
 * {
 *   "evento": "ocorrencia",
 *   "dados": {
 *     "nro_nf": 1875722,
 *     "codigo": "EM_TRANSITO"
 *   }
 * }
 * ```
 * 
 * ## 📊 Códigos de Ocorrência
 * 
 * | Código | Descrição | Finalizadora |
 * |--------|-----------|--------------|
 * | 1 | Coleta realizada | Não |
 * | 2 | Em trânsito | Não |
 * | 3 | Saiu para entrega | Não |
 * | 4 | Entregue | Sim |
 * | 5 | Tentativa de entrega | Não |
 * | 6 | Devolvido | Sim |
 * | 7 | Extraviado | Sim |
 * | 8 | Avariado | Não |
 * 
 * ## 🔒 Rate Limiting
 * 
 * | Integração | Limite | Janela |
 * |------------|--------|---------|
 * | Jamef | 500 req | 15 min |
 * | Braspress | 1000 req | 15 min |
 * | TNT | 300 req | 15 min |
 * | Outros | 100 req | 15 min |
 * 
 * ## 📝 Exemplos Práticos
 * 
 * ### Exemplo 1: Integração Simples
 * ```javascript
 * const axios = require('axios');
 * 
 * const api = axios.create({
 *   baseURL: 'http://localhost:3001/api/external',
 *   headers: {
 *     'Authorization': 'Bearer SEU_TOKEN',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * // Enviar nota fiscal
 * const response = await api.post('/notas-fiscais', { notfis: [...] });
 * console.log(response.data);
 * ```
 * 
 * ### Exemplo 2: Com Retry
 * ```javascript
 * async function enviarComRetry(payload, maxTentativas = 3) {
 *   for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
 *     try {
 *       const response = await api.post('/notas-fiscais', payload);
 *       return response.data;
 *     } catch (error) {
 *       if (tentativa === maxTentativas) throw error;
 *       
 *       const delay = 1000 * tentativa;
 *       await new Promise(resolve => setTimeout(resolve, delay));
 *     }
 *   }
 * }
 * ```
 * 
 * ## 🐛 Troubleshooting
 * 
 * ### Erro 401 - Unauthorized
 * - Verificar se token está correto
 * - Verificar se token não expirou
 * - Verificar header Authorization
 * 
 * ### Erro 429 - Rate Limit
 * - Reduzir frequência de requests
 * - Implementar backoff exponencial
 * - Verificar limites por integração
 * 
 * ### Erro 400 - Bad Request
 * - Validar JSON schema
 * - Verificar campos obrigatórios
 * - Validar formato de CNPJ/CPF
 * 
 * ## 📊 Monitoramento
 * 
 * ```bash
 * # Estatísticas de uso
 * npm run external:stats
 * 
 * # Logs recentes
 * npm run external:logs
 * 
 * # Status do sistema
 * curl /api/external/health
 * ```
 * 
 * ## 🔧 Configuração Avançada
 * 
 * ### Mapeamento de Códigos Personalizado
 * ```sql
 * INSERT INTO transportadora_codigo_ocorrencia (
 *   transportadora_id, codigo_ocorrencia_codigo, codigo, descricao
 * ) VALUES (1, 4, 'DELIVERED', 'Entregue com sucesso');
 * ```
 * 
 * ### Rate Limiting Personalizado
 * ```javascript
 * // No .env
 * EXTERNAL_RATE_LIMIT_JAMEF=600
 * EXTERNAL_RATE_LIMIT_BRASPRESS=1200
 * ```
 * 
 * ## 🚀 Deploy e Produção
 * 
 * ### Nginx Config
 * ```nginx
 * location /api/external/ {
 *   proxy_pass http://localhost:3001;
 *   proxy_set_header X-Real-IP $remote_addr;
 *   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *   client_max_body_size 10M;
 * }
 * ```
 * 
 * ### Monitoramento Produção
 * ```bash
 * # Logs de erro
 * tail -f logs/external-api-errors.log
 * 
 * # Métricas em tempo real
 * watch -n 5 "npm run external:stats"
 * ```
 */