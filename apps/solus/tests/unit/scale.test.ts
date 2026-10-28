import { describe, expect, it } from 'vitest';
import { formatCurrencyAxis } from '@/lib/format';
import { niceScale, niceStep, percentDigits } from '@/lib/scale';

const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('niceStep', () => {
  it('rounds to 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(11_600, 4)).toBe(5000);
    expect(niceStep(11_600, 5)).toBe(2500);
    expect(niceStep(0.045, 4)).toBe(0.02);
    expect(niceStep(0.67, 4)).toBe(0.2);
  });
});

describe('niceScale', () => {
  it('produces evenly spaced, round ticks that contain the data', () => {
    const scale = niceScale([0.383, 0.412, 0.399]);
    const steps = scale.ticks.slice(1).map((tick, i) => Number((tick - (scale.ticks[i] ?? 0)).toFixed(6)));
    expect(new Set(steps).size).toBe(1);
    expect(scale.min).toBeLessThanOrEqual(0.383);
    expect(scale.max).toBeGreaterThanOrEqual(0.412);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
    expect(scale.ticks.length).toBeLessThanOrEqual(6);
  });

  it('starts money axes at zero when asked', () => {
    const scale = niceScale([6200, 11_600, 8400], { includeZero: true });
    expect(scale.min).toBe(0);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.max).toBeGreaterThanOrEqual(11_600);
  });

  it('spans negative and positive values', () => {
    const scale = niceScale([-0.05, 0.62], { includeZero: true });
    expect(scale.ticks).toContain(0);
    expect(scale.min).toBeLessThan(0);
  });

  it('survives a flat or empty series', () => {
    expect(niceScale([5, 5]).ticks.length).toBeGreaterThanOrEqual(3);
    expect(niceScale([]).ticks.length).toBeGreaterThanOrEqual(3);
  });
});

describe('axis labels', () => {
  it('uses one notation for every tick of a money axis', () => {
    expect(normalize(formatCurrencyAxis(2500, 12_500))).toBe('R$ 2,5 mil');
    expect(normalize(formatCurrencyAxis(10_000, 12_500))).toBe('R$ 10 mil');
    expect(normalize(formatCurrencyAxis(900, 3000))).toBe('R$ 900');
  });

  it('adds a decimal to percent ticks only when steps are under one point', () => {
    expect(percentDigits(0.02)).toBe(0);
    expect(percentDigits(0.005)).toBe(1);
  });
});
