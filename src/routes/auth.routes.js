const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  loginSchema,
  registerSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validations/auth.validation');

const controller = new AuthController();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login de usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@empresa.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login',
  validate(loginSchema),
  controller.login.bind(controller)
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registro de novo usuário
 *     tags: [Autenticação]
 */
router.post('/register',
  validate(registerSchema),
  controller.register.bind(controller)
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token JWT
 *     tags: [Autenticação]
 */
router.post('/refresh',
  validate(refreshSchema),
  controller.refresh.bind(controller)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperação de senha
 *     tags: [Autenticação]
 */
router.post('/forgot-password',
  validate(forgotPasswordSchema),
  controller.forgotPassword.bind(controller)
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Redefinir senha
 *     tags: [Autenticação]
 */
router.post('/reset-password',
  validate(resetPasswordSchema),
  controller.resetPassword.bind(controller)
);

// Rotas protegidas (requerem autenticação)
router.use(authenticate);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obter dados do usuário logado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me',
  controller.getProfile.bind(controller)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Alterar senha
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 */
router.post('/change-password',
  validate(changePasswordSchema),
  controller.changePassword.bind(controller)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout',
  controller.logout.bind(controller)
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar validade do token
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verify',
  controller.verifyToken.bind(controller)
);

module.exports = router;