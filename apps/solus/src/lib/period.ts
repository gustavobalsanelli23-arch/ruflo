import type { Granularity, Period, PeriodKey } from '@/lib/data/types';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; short: string }[] = [
  { key: '7d', label: 'Últimos 7 dias', short: '7 dias' },
  { key: '30d', label: 'Últimos 30 dias', short: '30 dias' },
  { key: '90d', label: 'Últimos 90 dias', short: '90 dias' },
  { key: '12m', label: 'Últimos 12 meses', short: '12 meses' },
  { key: 'ytd', label: 'Ano até a data', short: 'Ano' },
];

export const DEFAULT_PERIOD: PeriodKey = '30d';

export function parsePeriod(value: string | string[] | undefined | null): PeriodKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return PERIOD_OPTIONS.some((option) => option.key === raw) ? (raw as PeriodKey) : DEFAULT_PERIOD;
}

const DAY = 86_400_000;

export function toISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function fromISODate(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return toISODate(fromISODate(iso) + days * DAY);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((fromISODate(end) - fromISODate(start)) / DAY) + 1;
}

/** Resolves a period ending on `end` (inclusive) and the equal-length window before it. */
export function resolvePeriod(key: PeriodKey, end: string): Period {
  const label = PERIOD_OPTIONS.find((option) => option.key === key)?.label ?? '';
  let start: string;
  let previousStart: string;
  let previousEnd: string;
  let granularity: Granularity;

  if (key === 'ytd' || key === '12m') {
    // Whole calendar months (the current one month-to-date), compared with the
    // same window a year earlier, so no bucket is a sliver of a month.
    const year = Number(end.slice(0, 4));
    const month = Number(end.slice(5, 7));
    const startDate = key === 'ytd' ? new Date(Date.UTC(year, 0, 1)) : new Date(Date.UTC(year, month - 12, 1));
    start = toISODate(startDate.getTime());
    previousStart = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;
    previousEnd = `${year - 1}${end.slice(4)}`;
    granularity = 'month';
  } else {
    const length = key === '7d' ? 7 : key === '30d' ? 30 : 90;
    start = addDays(end, -(length - 1));
    previousEnd = addDays(start, -1);
    previousStart = addDays(previousEnd, -(length - 1));
    granularity = length <= 30 ? 'day' : length <= 90 ? 'week' : 'month';
  }

  return { key, label, start, end, previousStart, previousEnd, granularity };
}

/** Last day of the month of `iso`, capped at `cap` when given (month-to-date). */
export function endOfMonth(iso: string, cap?: string): string {
  const date = new Date(fromISODate(iso));
  const end = toISODate(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return cap && end > cap ? cap : end;
}

/** Consecutive day, week (7 days from `start`) or calendar-month buckets covering [start, end]. */
export function buckets(start: string, end: string, granularity: Granularity): { start: string; end: string }[] {
  const result: { start: string; end: string }[] = [];
  if (granularity === 'day') {
    for (let d = start; d <= end; d = addDays(d, 1)) result.push({ start: d, end: d });
  } else if (granularity === 'week') {
    for (let d = start; d <= end; d = addDays(d, 7)) {
      const e = addDays(d, 6);
      result.push({ start: d, end: e > end ? end : e });
    }
  } else {
    let cursor = start;
    while (cursor <= end) {
      const date = new Date(fromISODate(cursor));
      const monthEnd = toISODate(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
      result.push({ start: cursor, end: monthEnd > end ? end : monthEnd });
      cursor = addDays(monthEnd, 1);
    }
  }
  return result;
}
