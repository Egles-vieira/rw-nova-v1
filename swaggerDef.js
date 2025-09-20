// swaggerDef.js - VERSÃO CORRETA
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Road-RW API',
    version: '1.0.0',
    description: 'Sistema de Gestão Logística - Backend API'
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor de Desenvolvimento'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Autenticação' },
    { name: 'Transportadoras', description: 'Transportadoras' },
    { name: 'Clientes', description: 'Clientes' },
    { name: 'Embarcadores', description: 'Embarcadores' },
    { name: 'Motoristas', description: 'Motoristas' },
    { name: 'Notas Fiscais', description: 'Notas Fiscais' },
    { name: 'Romaneios', description: 'Romaneios' },
    { name: 'Ocorrências', description: 'Ocorrências' },
    { name: 'Jobs', description: 'Jobs de Integração' },
    { name: 'Monitoring', description: 'Monitoramento' },
    { name: 'Integrations', description: 'Integrações' },
    { name: 'External APIs', description: 'APIs Externas' },
    { name: 'Webhooks', description: 'Webhooks' },
    { name: 'Logs', description: 'Logs' },
    { name: 'Reports', description: 'Relatórios' }
  ]
};