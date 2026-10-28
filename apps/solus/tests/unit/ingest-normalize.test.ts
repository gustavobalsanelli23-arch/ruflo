// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cellText, detectDateOrder, detectDecimalStyle, parseBoolean, parseDate, parseDecimal, parseKind, round, skuKey } from '@/lib/ingest/normalize';

const value = <T>(parsed: { ok: true; value: T | null } | { ok: false }) => (parsed.ok ? parsed.value : 'inválido');

describe('números em formato brasileiro e internacional', () => {
  it.each([
    ['1.250,50', 1250.5],
    ['1250,50', 1250.5],
    ['1250.50', 1250.5],
    ['1,250.50', 1250.5],
    ['R$ 1.250,50', 1250.5],
    ['R$1.250,50', 1250.5],
    ['  12 ', 12],
    ['0,5', 0.5],
    ['1.234.567,89', 1234567.89],
    ['1.234.567', 1234567],
    ['(1.250,50)', -1250.5],
    ['-1.250,50', -1250.5],
    ['1.250,50-', -1250.5],
    ['R$ -10,00', -10],
    ['1 250,50', 1250.5],
    [42.5, 42.5],
  ])('%s → %s', (input, expected) => {
    expect(value(parseDecimal(input, 'br'))).toBe(expected);
  });

  it('"1.250" e "1,250" seguem o estilo do arquivo', () => {
    expect(value(parseDecimal('1.250', 'br'))).toBe(1250);
    expect(value(parseDecimal('1.250', 'us'))).toBe(1.25);
    expect(value(parseDecimal('1,250', 'br'))).toBe(1.25);
    expect(value(parseDecimal('1,250', 'us'))).toBe(1250);
  });

  it.each(['abc', '12%', '1,2,3', '1.2.3', '12,5,0', '1e5', '--5', '1.25,50', true])('"%s" é inválido', (input) => {
    expect(parseDecimal(input as string, 'br').ok).toBe(false);
  });

  it('vazio e traço são ausência de valor, não zero', () => {
    expect(value(parseDecimal('', 'br'))).toBeNull();
    expect(value(parseDecimal(' - ', 'br'))).toBeNull();
    expect(value(parseDecimal('R$', 'br'))).toBeNull();
    expect(value(parseDecimal(null, 'br'))).toBeNull();
  });

  it('o estilo decimal é detectado pelos valores sem ambiguidade', () => {
    expect(detectDecimalStyle(['1.250,50', '12,90', '1.250'])).toBe('br');
    expect(detectDecimalStyle(['1250.50', '12.90', '1,250.00'])).toBe('us');
    expect(detectDecimalStyle(['1.250', '3'])).toBe('br');
    expect(detectDecimalStyle([10, 20.5])).toBe('br');
  });

  it('arredonda sem o erro clássico do ponto flutuante', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(0.1 + 0.2, 4)).toBe(0.3);
    expect(round(-2.345, 2)).toBe(-2.35);
  });
});

describe('datas', () => {
  it.each([
    ['31/01/2026', '2026-01-31'],
    ['1/2/2026', '2026-02-01'],
    ['31-01-2026', '2026-01-31'],
    ['31.01.2026', '2026-01-31'],
    ['31/01/26', '2026-01-31'],
    ['31/01/2026 14:35', '2026-01-31'],
    ['2026-01-31', '2026-01-31'],
    ['2026-01-31T14:35:00Z', '2026-01-31'],
    ['2026-01-31 14:35:00', '2026-01-31'],
    ['2026/01/31', '2026-01-31'],
    [46053, '2026-01-31'],
  ])('%s → %s', (input, expected) => {
    expect(value(parseDate(input, 'dmy'))).toBe(expected);
  });

  it.each(['31/02/2026', '29/02/2025', '00/01/2026', '2026-13-01', 'ontem', '31012026', 3.5, 100])('"%s" é inválida', (input) => {
    expect(parseDate(input, 'dmy').ok).toBe(false);
  });

  it('29/02 existe em ano bissexto', () => {
    expect(value(parseDate('29/02/2028', 'dmy'))).toBe('2028-02-29');
  });

  it('formato americano só quando escolhido ou detectado', () => {
    expect(value(parseDate('01/31/2026', 'mdy'))).toBe('2026-01-31');
    expect(parseDate('01/31/2026', 'dmy').ok).toBe(false);
    expect(detectDateOrder(['01/31/2026', '02/15/2026'])).toBe('mdy');
    expect(detectDateOrder(['31/01/2026', '02/03/2026'])).toBe('dmy');
    expect(detectDateOrder(['02/03/2026'])).toBe('dmy');
  });
});

describe('textos, tipos e SKU', () => {
  it('texto: espaços normalizados, números sem notação científica', () => {
    expect(cellText('  Café   Torrado  ')).toBe('Café Torrado');
    expect(cellText(7891234567890)).toBe('7891234567890');
    expect(cellText(0.0000001)).toBe('0.0000001');
    expect(cellText(null)).toBe('');
  });

  it('sim/não e venda/devolução em português, sem acento e em inglês', () => {
    expect(['Sim', 'S', 'x', 'true', 'ATIVO'].map((v) => value(parseBoolean(v)))).toEqual([true, true, true, true, true]);
    expect(['Não', 'nao', 'N', '0', 'inativo'].map((v) => value(parseBoolean(v)))).toEqual([false, false, false, false, false]);
    expect(parseBoolean('talvez').ok).toBe(false);
    expect(['Venda', 'saída', 'SALE'].map((v) => value(parseKind(v)))).toEqual(['sale', 'sale', 'sale']);
    expect(['Devolução', 'devolucao', 'Estorno', 'return'].map((v) => value(parseKind(v)))).toEqual(['return', 'return', 'return', 'return']);
    expect(parseKind('troca de mercadoria').ok).toBe(false);
  });

  it('chave do SKU igual à do banco: maiúsculas e sem espaços', () => {
    expect(skuKey(' caf 01 ')).toBe('CAF01');
    expect(skuKey('Caf-01')).toBe('CAF-01');
  });
});
