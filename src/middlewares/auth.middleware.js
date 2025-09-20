// backend/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const db = require('../database/connection');
const logger = require('../config/logger');
const config = require('../config/env');
const { HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} } = require('../utils/constants') || {};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function extractToken(req) {
  // 1) Authorization: Bearer <token>
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && typeof auth === 'string') {
    const [scheme, token] = auth.split(' ');
    if (/^Bearer$/i.test(scheme) && token) return token.trim();
  }

  // 2) Query string ?token=
  if (req.query && req.query.token) {
    return String(req.query.token);
  }

  // 3) Cookie (se você usa cookie-parser)
  if (req.cookies && req.cookies.token) {
    return String(req.cookies.token);
  }

  return null;
}

async function loadUserById(userId) {
  // Busca direta no DB para garantir role atualizada.
  // Ajuste os campos conforme sua tabela `users`.
  const sql = `
    SELECT id, name, email, role, deleted_at
    FROM public.users
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await db.query(sql, [userId]);
  return rows[0] || null;
}

// ------------------------------------------------------------
// Middlewares
// ------------------------------------------------------------

/**
 * Autentica a requisição via JWT.
 * - Verifica token
 * - Carrega usuário do banco
 * - Injeta req.user = { id, name, email, role }
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Não autenticado: token ausente'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Sessão expirada'
        });
      }
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Carrega o usuário mais recente do DB (garante role atualizada)
    const user = await loadUserById(decoded.id);
    if (!user || user.deleted_at) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }

    // Injeta role (DEFAULT 'user' caso nulo)
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user'
    };

    return next();
  } catch (error) {
    logger.error('Erro no authenticate middleware:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno de autenticação'
    });
  }
}

/**
 * Autenticação opcional:
 * - Se tiver token válido → popula req.user
 * - Se não tiver/for inválido → segue sem req.user
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await loadUserById(decoded.id);
      if (user && !user.deleted_at) {
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user'
        };
      }
    } catch (err) {
      // Token inválido/expirado → ignora e segue sem user
      logger.warn('optionalAuthenticate: token inválido/expirado ignorado');
    }

    return next();
  } catch (error) {
    logger.error('Erro no optionalAuthenticate middleware:', error);
    return next(); // não bloqueia requisição
  }
}

/**
 * Autoriza por role:
 * - Use após `authenticate`
 * - Ex.: authorize(['admin', 'manager'])
 */
function authorize(roles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Não autenticado'
        });
      }

      // Normaliza role
      const userRole = req.user.role || 'user';

      if (Array.isArray(roles) && roles.length > 0) {
        if (!roles.includes(userRole)) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            message: 'Acesso negado'
          });
        }
      }

      return next();
    } catch (error) {
      logger.error('Erro no authorize middleware:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno de autorização'
      });
    }
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize
};
