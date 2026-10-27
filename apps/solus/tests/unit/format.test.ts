import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDay,
  formatDays,
  formatMonth,
  formatPercent,
  formatPoints,
  formatSignedPercent,
  relativeChange,
} from '@/lib/format';

const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('format (pt-BR)', () => {
  it('formats BRL with cents, whole and compact', () => {
    expect(normalize(formatCurrency(1234.5))).toBe('R$ 1.234,50');
    expect(normalize(formatCurrency(1234.5, { whole: true }))).toBe('R$ 1.235');
    expect(normalize(formatCurrency(221_436, { compact: true }))).toBe('R$ 221,4 mil');
    expect(normalize(formatCurrency(9_000, { compact: true }))).toBe('R$ 9.000,00');
  });

  it('formats ratios as percent and percentage points with sign', () => {
    expect(normalize(formatPercent(0.394))).toBe('39,4%');
    expect(normalize(formatSignedPercent(0.006))).toBe('+0,6%');
    expect(normalize(formatSignedPercent(-0.021))).toBe('-2,1%');
    expect(normalize(formatPoints(-0.052))).toBe('-5,2 p.p.');
  });

  it('returns null change when the base is zero', () => {
    expect(relativeChange(10, 0)).toBeNull();
    expect(relativeChange(110, 100)).toBeCloseTo(0.1);
  });

  it('formats ISO dates in UTC without shifting the day', () => {
    expect(formatDay('2026-10-01')).toBe('1 out');
    expect(formatDate('2026-10-26')).toBe('26 out 2026');
    expect(formatMonth('2026-11-01')).toBe('nov');
  });

  it('pluralizes days and handles sub-day coverage', () => {
    expect(formatDays(1)).toBe('1 dia');
    expect(formatDays(2.4)).toBe('2 dias');
    expect(formatDays(0.4)).toBe('menos de 1 dia');
  });
});
