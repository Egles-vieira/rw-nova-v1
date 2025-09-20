// backend/src/utils/validators.js

// Se você já tem regex prontos no constants.js, vamos reaproveitar.
// Ex.: REGEX_PATTERNS.EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
let REGEX_PATTERNS = {};
try {
  REGEX_PATTERNS = require('./constants').REGEX_PATTERNS || {};
} catch (_) {
  // fallback simples para email se constants não estiver disponível por algum motivo
  REGEX_PATTERNS.EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
}

/**
 * Lista oficial de UFs do Brasil (27)
 */
const UF_LIST = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

/**
 * Validação de CPF
 */
function validateCPF(cpf) {
  if (!cpf) return false;
  cpf = String(cpf).replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  let remainder = 11 - (sum % 11);
  if (remainder >= 10) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  remainder = 11 - (sum % 11);
  if (remainder >= 10) remainder = 0;
  return remainder === parseInt(cpf.charAt(10), 10);
}

/**
 * Validação de CNPJ
 */
function validateCNPJ(cnpj) {
  if (!cnpj) return false;
  cnpj = String(cnpj).replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  let digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1), 10);
}

/**
 * Validação de Email
 */
function validateEmail(email) {
  if (!email) return false;
  const regex = REGEX_PATTERNS.EMAIL || /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).toLowerCase());
}

/**
 * Validação de Senha Forte
 * - mínimo 8 caracteres
 * - pelo menos 1 minúscula, 1 maiúscula, 1 número, 1 caractere especial
 */
function validateStrongPassword(password) {
  if (!password) return false;
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

/**
 * Validação de UF
 */
function validateUF(uf) {
  if (!uf) return false;
  const v = String(uf).trim().toUpperCase();
  return UF_LIST.has(v);
}

module.exports = {
  validateCPF,
  validateCNPJ,
  validateEmail,
  validateStrongPassword,
  validateUF
};
