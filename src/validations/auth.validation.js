const Joi = require('joi');
const { validateEmail, validateStrongPassword } = require('../utils/validators');

// Validador personalizado para email
const emailValidator = (value, helpers) => {
  if (!validateEmail(value)) {
    return helpers.error('any.invalid');
  }
  return value.toLowerCase().trim();
};

// Validador personalizado para senha forte
const passwordValidator = (value, helpers) => {
  if (!validateStrongPassword(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Schema para login
const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .custom(emailValidator)
    .messages({
      'any.required': 'Email é obrigatório',
      'any.invalid': 'Email inválido',
      'string.base': 'Email deve ser uma string',
      'string.empty': 'Email não pode estar vazio'
    }),

  password: Joi.string()
    .required()
    .min(6)
    .messages({
      'any.required': 'Senha é obrigatória',
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.base': 'Senha deve ser uma string',
      'string.empty': 'Senha não pode estar vazia'
    })
});

// Schema para registro
const registerSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'any.required': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres',
      'string.empty': 'Nome não pode estar vazio'
    }),

  email: Joi.string()
    .required()
    .custom(emailValidator)
    .messages({
      'any.required': 'Email é obrigatório',
      'any.invalid': 'Email inválido',
      'string.base': 'Email deve ser uma string',
      'string.empty': 'Email não pode estar vazio'
    }),

  password: Joi.string()
    .required()
    .custom(passwordValidator)
    .messages({
      'any.required': 'Senha é obrigatória',
      'any.invalid': 'Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial',
      'string.base': 'Senha deve ser uma string'
    }),

  password_confirmation: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.required': 'Confirmação de senha é obrigatória',
      'any.only': 'Confirmação de senha deve ser igual à senha',
      'string.base': 'Confirmação de senha deve ser uma string'
    })
});

// Schema para refresh de token
const refreshSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token é obrigatório',
      'string.base': 'Token deve ser uma string',
      'string.empty': 'Token não pode estar vazio'
    })
});

// Schema para alteração de senha
const changePasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha atual é obrigatória',
      'string.base': 'Senha atual deve ser uma string',
      'string.empty': 'Senha atual não pode estar vazia'
    }),

  newPassword: Joi.string()
    .required()
    .custom(passwordValidator)
    .messages({
      'any.required': 'Nova senha é obrigatória',
      'any.invalid': 'Nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial',
      'string.base': 'Nova senha deve ser uma string'
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.required': 'Confirmação da nova senha é obrigatória',
      'any.only': 'Confirmação deve ser igual à nova senha',
      'string.base': 'Confirmação deve ser uma string'
    })
});

// Schema para esqueci minha senha
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .required()
    .custom(emailValidator)
    .messages({
      'any.required': 'Email é obrigatório',
      'any.invalid': 'Email inválido',
      'string.base': 'Email deve ser uma string',
      'string.empty': 'Email não pode estar vazio'
    })
});

// Schema para redefinir senha
const resetPasswordSchema = Joi.object({
  resetToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Token de recuperação é obrigatório',
      'string.base': 'Token deve ser uma string',
      'string.empty': 'Token não pode estar vazio'
    }),

  newPassword: Joi.string()
    .required()
    .custom(passwordValidator)
    .messages({
      'any.required': 'Nova senha é obrigatória',
      'any.invalid': 'Nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial',
      'string.base': 'Nova senha deve ser uma string'
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.required': 'Confirmação da nova senha é obrigatória',
      'any.only': 'Confirmação deve ser igual à nova senha',
      'string.base': 'Confirmação deve ser uma string'
    })
});

module.exports = {
  loginSchema,
  registerSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};