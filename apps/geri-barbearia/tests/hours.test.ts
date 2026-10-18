import { describe, expect, it } from 'vitest';
import { formatTime, getOpenStatus, localClock } from '../src/lib/hours';

// Horário de Brasília (UTC-3, sem horário de verão desde 2019).
const at = (iso: string) => new Date(`${iso}-03:00`);

describe('formatTime', () => {
  it('escreve horas cheias e quebradas no padrão brasileiro', () => {
    expect(formatTime(510)).toBe('8h30');
    expect(formatTime(720)).toBe('12h');
    expect(formatTime(1200)).toBe('20h');
  });
});

describe('localClock', () => {
  it('converte para o fuso de São Paulo', () => {
    // 2026-10-20 é uma terça-feira.
    expect(localClock(new Date('2026-10-20T12:00:00Z'))).toEqual({ day: 2, minutes: 9 * 60 });
  });
});

describe('getOpenStatus', () => {
  it('aberto pela manhã em dia útil', () => {
    expect(getOpenStatus(at('2026-10-20T09:15:00'))).toEqual({ state: 'open', label: 'Aberto agora, até as 12h' });
  });

  it('pausa para o almoço entre 12h e 13h30', () => {
    expect(getOpenStatus(at('2026-10-21T12:40:00'))).toEqual({
      state: 'break',
      label: 'Pausa para o almoço, volta às 13h30',
    });
  });

  it('aberto à tarde até as 20h', () => {
    expect(getOpenStatus(at('2026-10-23T19:59:00')).label).toBe('Aberto agora, até as 20h');
  });

  it('antes de abrir no mesmo dia', () => {
    expect(getOpenStatus(at('2026-10-22T07:00:00'))).toEqual({ state: 'closed', label: 'Fechado agora, abre às 8h30' });
  });

  it('sexta à noite abre amanhã (sábado) às 8h', () => {
    expect(getOpenStatus(at('2026-10-23T20:00:00')).label).toBe('Fechado agora, abre amanhã às 8h');
  });

  it('sábado à tarde abre na terça', () => {
    expect(getOpenStatus(at('2026-10-24T12:00:00')).label).toBe('Fechado agora, abre terça às 8h30');
  });

  it('segunda-feira abre amanhã', () => {
    expect(getOpenStatus(at('2026-10-19T10:00:00')).label).toBe('Fechado agora, abre amanhã às 8h30');
  });
});
