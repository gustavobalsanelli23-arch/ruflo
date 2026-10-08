import { describe, expect, it } from 'vitest';
import {
  customerPasswordProblems,
  formatCEP,
  formatCPF,
  formatPhone,
  isValidCEP,
  isValidCPF,
  isValidEmail,
  isValidFullName,
  isValidMobile,
  maskCPF,
  passwordStrength,
} from '@/lib/validation';
import { stateFromCep } from '@/services/address/cep.service';

describe('validação de cadastro', () => {
  it('valida CPF pelos dígitos verificadores', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224725')).toBe(true);
    expect(isValidCPF('529.982.247-24')).toBe(false);
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
  });

  it('formata e mascara CPF', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
    expect(maskCPF('52998224725')).toBe('***.982.247-**');
  });

  it('valida celular brasileiro com DDD', () => {
    expect(isValidMobile('(11) 98765-4321')).toBe(true);
    expect(isValidMobile('(11) 3876-5432')).toBe(false);
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('valida CEP, e-mail e nome completo', () => {
    expect(isValidCEP('01310-100')).toBe(true);
    expect(isValidCEP('0131010')).toBe(false);
    expect(formatCEP('01310100')).toBe('01310-100');
    expect(isValidEmail('torcedor@futzone.com.br')).toBe(true);
    expect(isValidEmail('torcedor@')).toBe(false);
    expect(isValidFullName('Ana Souza')).toBe(true);
    expect(isValidFullName('Ana')).toBe(false);
  });

  it('mede a força da senha e lista o que falta', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').score).toBeLessThanOrEqual(1);
    expect(passwordStrength('Camisa#2026').score).toBeGreaterThanOrEqual(3);
    expect(customerPasswordProblems('Camisa#2026')).toEqual([]);
    expect(customerPasswordProblems('camisa')).toContain('mínimo de 8 caracteres');
    expect(customerPasswordProblems('CamisaDoTime2026')).toEqual([]); // 12+ dispensa símbolo
  });
});

describe('CEP → estado', () => {
  it('identifica a UF pela faixa do CEP', () => {
    expect(stateFromCep('01310-100')).toBe('SP');
    expect(stateFromCep('20040-002')).toBe('RJ');
    expect(stateFromCep('30130-010')).toBe('MG');
    expect(stateFromCep('90010-000')).toBe('RS');
    expect(stateFromCep('70040-010')).toBe('DF');
    expect(stateFromCep('123')).toBeUndefined();
  });
});
