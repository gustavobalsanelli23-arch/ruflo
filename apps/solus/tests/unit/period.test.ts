import { describe, expect, it } from 'vitest';
import { daysBetween, endOfMonth, parsePeriod, resolvePeriod } from '@/lib/period';

describe('period', () => {
  it('falls back to 30 days for unknown or missing values', () => {
    expect(parsePeriod(undefined)).toBe('30d');
    expect(parsePeriod('1y')).toBe('30d');
    expect(parsePeriod(['90d', '7d'])).toBe('90d');
  });

  it('builds rolling windows with an equal previous window right before them', () => {
    const p = resolvePeriod('30d', '2026-10-26');
    expect(p).toMatchObject({ start: '2026-09-27', end: '2026-10-26', previousEnd: '2026-09-26', granularity: 'day' });
    expect(daysBetween(p.previousStart, p.previousEnd)).toBe(30);
    expect(resolvePeriod('90d', '2026-10-26').granularity).toBe('week');
  });

  it('uses whole calendar months for 12 months and year to date', () => {
    const twelve = resolvePeriod('12m', '2026-10-26');
    expect(twelve).toMatchObject({ start: '2025-11-01', previousStart: '2024-11-01', previousEnd: '2025-10-26', granularity: 'month' });
    const ytd = resolvePeriod('ytd', '2026-10-26');
    expect(ytd).toMatchObject({ start: '2026-01-01', previousStart: '2025-01-01', previousEnd: '2025-10-26' });
  });

  it('finds the end of the month, capped at a date', () => {
    expect(endOfMonth('2026-02-01')).toBe('2026-02-28');
    expect(endOfMonth('2026-10-01', '2026-10-26')).toBe('2026-10-26');
  });
});
