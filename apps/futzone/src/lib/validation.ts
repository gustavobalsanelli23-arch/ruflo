/**
 * Validações e máscaras de dados brasileiros (CPF, celular, CEP) e de senha.
 * Funções puras: usadas nos formulários e, futuramente, também no servidor.
 */

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Nome completo: pelo menos nome e sobrenome. */
export function isValidFullName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter((p) => p.length >= 2);
  return parts.length >= 2;
}

/** Valida CPF pelos dígitos verificadores (rejeita sequências repetidas). */
export function isValidCPF(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

/** 000.000.000-00 (aplicada enquanto o usuário digita). */
export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** Exibe só parte do CPF (privacidade): ***.456.789-** */
export function maskCPF(value: string): string {
  const d = onlyDigits(value);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Celular brasileiro: DDD válido + 9 dígitos começando com 9. */
export function isValidMobile(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  return ddd >= 11 && ddd <= 99 && d[2] === '9';
}

/** (00) 00000-0000 */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const isValidCEP = (value: string): boolean => onlyDigits(value).length === 8;

/** 00000-000 */
export function formatCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export interface PasswordStrength {
  /** 0 (muito fraca) a 4 (forte). */
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Muito fraca' | 'Fraca' | 'Razoável' | 'Boa' | 'Forte';
  checks: { length: boolean; mixedCase: boolean; number: boolean; symbol: boolean; long: boolean };
}

export function passwordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    long: password.length >= 12,
  };
  let score = Object.values(checks).filter(Boolean).length;
  if (!checks.length) score = Math.min(score, 1);
  const clamped = Math.min(4, Math.max(0, score - 1)) as PasswordStrength['score'];
  const labels: PasswordStrength['label'][] = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return { score: password ? clamped : 0, label: labels[password ? clamped : 0], checks };
}

/**
 * Regras mínimas para senha de cliente. Retorna o que falta
 * (lista vazia = senha aceita).
 */
export function customerPasswordProblems(password: string): string[] {
  const { checks } = passwordStrength(password);
  const problems: string[] = [];
  if (!checks.length) problems.push('mínimo de 8 caracteres');
  if (!checks.mixedCase) problems.push('letras maiúsculas e minúsculas');
  if (!checks.number) problems.push('pelo menos um número');
  if (!checks.symbol && !checks.long) problems.push('um símbolo (ex.: ! @ #) ou 12+ caracteres');
  return problems;
}
