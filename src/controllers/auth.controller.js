const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../config/logger');
const { HTTP_STATUS } = require('../utils/constants');
const UsersRepository = require('../repositories/users.repository');

class AuthController {
  constructor() {
    this.usersRepository = new UsersRepository();
  }

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuário por email (incluindo password)
      const user = await this.usersRepository.findByEmail(email);
      
      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Gerar token JWT
      const token = this.generateToken(user);

      // Remover password do retorno
      const { password: _, ...userWithoutPassword } = user;

      // Log de auditoria
      logger.audit('login', user.id, 'user', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: userWithoutPassword,
          expiresIn: config.jwt.expiresIn
        }
      });
    } catch (error) {
      logger.error('Erro no login:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Registro
  async register(req, res) {
    try {
      const { name, email, password, password_confirmation } = req.body;

      // Verificar se as senhas coincidem
      if (password !== password_confirmation) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'As senhas não coincidem'
        });
      }

      // Verificar se email já existe
      const existingUser = await this.usersRepository.findByEmail(email);
      if (existingUser) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'Email já está em uso'
        });
      }

      // Criptografar senha
      const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

      // Criar usuário
      const newUser = await this.usersRepository.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword
      });

      // Gerar token JWT
      const token = this.generateToken(newUser);

      // Log de auditoria
      logger.audit('register', newUser.id, 'user', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          token,
          user: newUser,
          expiresIn: config.jwt.expiresIn
        }
      });
    } catch (error) {
      logger.error('Erro no registro:', error);
      
      if (error.message.includes('Email já está em uso')) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Refresh token
  async refresh(req, res) {
    try {
      const { token } = req.body;

      // Verificar token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Buscar usuário
      const user = await this.usersRepository.findById(decoded.id);
      
      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Gerar novo token
      const newToken = this.generateToken(user);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          token: newToken,
          user,
          expiresIn: config.jwt.expiresIn
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }
      
      logger.error('Erro no refresh token:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // Log de auditoria
      if (req.user) {
        logger.audit('logout', req.user.id, 'user', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      logger.error('Erro no logout:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter perfil do usuário logado
  async getProfile(req, res) {
    try {
      const user = await this.usersRepository.findById(req.user.id);
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Perfil recuperado com sucesso',
        data: user
      });
    } catch (error) {
      logger.error('Erro ao obter perfil:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Alterar senha
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Buscar usuário com senha
      const user = await this.usersRepository.findByEmail(req.user.email);
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar senha atual
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Senha atual incorreta'
        });
      }

      // Criptografar nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

      // Atualizar senha
      await this.usersRepository.update(userId, {
        password: hashedNewPassword
      });

      // Log de auditoria
      logger.audit('change_password', userId, 'user', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao alterar senha:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Esqueci minha senha
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await this.usersRepository.findByEmail(email);
      
      if (!user) {
        // Por segurança, sempre retornar sucesso mesmo se email não existir
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'Se o email existir, um link de recuperação será enviado'
        });
      }

      // Gerar token de recuperação (válido por 1 hora)
      const resetToken = jwt.sign(
        { id: user.id, purpose: 'password_reset' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // TODO: Implementar envio de email
      // await emailService.sendPasswordReset(user.email, resetToken);

      // Log de auditoria
      logger.audit('forgot_password', user.id, 'user', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Se o email existir, um link de recuperação será enviado',
        // Apenas para desenvolvimento - remover em produção
        resetToken: config.nodeEnv === 'development' ? resetToken : undefined
      });
    } catch (error) {
      logger.error('Erro no esqueci senha:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Redefinir senha
  async resetPassword(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      // Verificar token de recuperação
      const decoded = jwt.verify(resetToken, config.jwt.secret);
      
      if (decoded.purpose !== 'password_reset') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token inválido'
        });
      }

      // Buscar usuário
      const user = await this.usersRepository.findById(decoded.id);
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Criptografar nova senha
      const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

      // Atualizar senha
      await this.usersRepository.update(user.id, {
        password: hashedPassword
      });

      // Log de auditoria
      logger.audit('reset_password', user.id, 'user', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }
      
      logger.error('Erro ao redefinir senha:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Verificar token
  async verifyToken(req, res) {
    try {
      // Se chegou até aqui, o token é válido (middleware de auth passou)
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token válido',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      logger.error('Erro na verificação de token:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Gerar token JWT
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role || 'user'   // ✅ injeta a role do banco
        
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }
}

module.exports = AuthController;