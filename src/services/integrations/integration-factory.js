// ==========================================
// 3. INTEGRATION FACTORY
// ==========================================
// backend/src/services/integrations/integration-factory.js

const JamefIntegrationService = require('./jamef-integration.service');
const logger = require('../../config/logger');

class IntegrationFactory {
  static services = new Map();

  static register(name, serviceClass) {
    this.services.set(name, serviceClass);
    logger.info(`Serviço de integração registrado: ${name}`);
  }

  static create(type, config = {}) {
    const ServiceClass = this.services.get(type);
    
    if (!ServiceClass) {
      throw new Error(`Serviço de integração não encontrado: ${type}`);
    }

    return new ServiceClass(config);
  }

  static getAvailableServices() {
    return Array.from(this.services.keys());
  }

  static initialize() {
    // Registrar serviços disponíveis
    this.register('jamef', JamefIntegrationService);
    
    // TODO: Adicionar outros serviços
    // this.register('braspress', BraspressIntegrationService);
    // this.register('tnt', TNTIntegrationService);
    
    logger.info('Factory de integrações inicializada', {
      services: this.getAvailableServices()
    });
  }
}

module.exports = IntegrationFactory;