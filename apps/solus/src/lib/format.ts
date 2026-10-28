/** Locale-aware formatting. Everything goes through Intl (pt-BR, BRL, UTC dates). */

const LOCALE = 'pt-BR';

const currency = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' });
const currencyWhole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const currencyCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const percent1 = new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent0 = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });

export function formatCurrency(value: number, options: { compact?: boolean; whole?: boolean } = {}): string {
  if (options.compact && Math.abs(value) >= 10_000) return currencyCompact.format(value);
  if (options.whole) return currencyWhole.format(value);
  return currency.format(value);
}

const currencyAxis = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Axis labels share one notation: when the axis reaches R$ 10 mil every tick is
 * compact ("R$ 2,5 mil"), otherwise every tick is whole reais ("R$ 900").
 */
export function formatCurrencyAxis(value: number, axisMax: number): string {
  return Math.abs(axisMax) >= 10_000 ? currencyAxis.format(value) : currencyWhole.format(value);
}

export function formatNumber(value: number, options: { compact?: boolean } = {}): string {
  if (options.compact && Math.abs(value) >= 10_000) return compact.format(value);
  return integer.format(value);
}

export function formatDecimal(value: number): string {
  return decimal1.format(value);
}

export function formatPercent(ratio: number, digits: 0 | 1 = 1): string {
  return (digits === 0 ? percent0 : percent1).format(ratio);
}

/** Relative change between two values as a ratio, or null when the base is zero. */
export function relativeChange(value: number, previous: number): number | null {
  if (previous === 0) return null;
  return (value - previous) / Math.abs(previous);
}

const signedPercent = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const signedDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

export function formatSignedPercent(ratio: number): string {
  return signedPercent.format(ratio);
}

/** Difference between two ratios in percentage points ("+1,2 p.p."). */
export function formatPoints(delta: number): string {
  return `${signedDecimal.format(delta * 100)} p.p.`;
}

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function toDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
}

function stripDots(text: string): string {
  return text.replace(/\./g, '').replace(/\s+de\s+/g, ' ');
}

export function formatDay(iso: string): string {
  return stripDots(dayMonth.format(toDate(iso)));
}

export function formatDate(iso: string): string {
  return stripDots(dayMonthYear.format(toDate(iso)));
}

export function formatMonth(iso: string, withYear = false): string {
  return stripDots((withYear ? monthYear : monthShort).format(toDate(iso)));
}

export function formatMonthLong(iso: string): string {
  return monthLong.format(toDate(iso));
}

export function formatDateTime(iso: string): string {
  return stripDots(dateTime.format(toDate(iso)));
}

export function formatDays(days: number): string {
  if (days < 1) return 'menos de 1 dia';
  const rounded = Math.round(days);
  return `${integer.format(rounded)} ${rounded === 1 ? 'dia' : 'dias'}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${integer.format(count)} ${count === 1 ? singular : plural}`;
}
