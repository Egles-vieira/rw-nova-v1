// restricao-logistica.repository.js
const BaseRepository = require('./base.repository');

class RestricaoLogisticaRepository extends BaseRepository {
  constructor() {
    super('restricao_logistica');
  }
}

module.exports = RestricaoLogisticaRepository;