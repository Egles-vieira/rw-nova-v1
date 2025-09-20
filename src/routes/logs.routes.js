// src/routes/logs.routes.js
const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Listar logs do sistema
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: level
 *         in: query
 *         schema: { type: string, enum: ['error', 'warn', 'info', 'debug'] }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Lista de logs
 */
router.get('/', auth, (req, res) => {
  const { level, limit = 50 } = req.query;
  
  const logs = [
    { id: 1, level: 'info', message: 'Sistema iniciado', timestamp: new Date().toISOString() },
    { id: 2, level: 'info', message: 'Jobs inicializados', timestamp: new Date().toISOString() },
    { id: 3, level: 'warn', message: 'Token expirando', timestamp: new Date().toISOString() },
    { id: 4, level: 'error', message: 'Falha na sincronização', timestamp: new Date().toISOString() }
  ];

  const filteredLogs = level ? logs.filter(log => log.level === level) : logs;
  
  res.json({
    success: true,
    data: {
      logs: filteredLogs.slice(0, limit),
      total: filteredLogs.length
    }
  });
});

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Estatísticas dos logs
 *     tags: [Logs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Estatísticas
 */
router.get('/stats', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      total: 1250,
      errors: 15,
      warnings: 45,
      info: 1190
    }
  });
});

module.exports = router;