import type { DateOrder, DecimalStyle, RawCell } from './types';

/**
 * Normalization of the values Brazilian spreadsheets carry:
 *   números  1.250,50 · 1250,50 · 1250.50 · R$ 1.250,50 · (1.250,50) · 1.250,50-
 *   datas    DD/MM/AAAA · DD/MM/AA · DD-MM-AAAA · AAAA-MM-DD (ISO, com ou sem
 *            hora) · número de série do Excel
 * Only "1.250" and "1,250" are ambiguous: the file's decimal style decides
 * (BR: thousand separator; US: decimal point).
 */

export type Parsed<T> = { ok: true; value: T | null } | { ok: false };

const EMPTY = { ok: true, value: null } as const;
const INVALID = { ok: false } as const;

/** A cell as trimmed text ('' when empty). Numbers never use exponent notation. */
export function cellText(cell: RawCell): string {
  if (cell === null) return '';
  if (typeof cell === 'number') {
    return Number.isInteger(cell) ? cell.toFixed(0) : cell.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 10 });
  }
  if (typeof cell === 'boolean') return cell ? 'true' : 'false';
  return cell.replace(/\s+/g, ' ').trim();
}

export function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Math.sign(value) * Number.EPSILON) * factor) / factor;
}

export function parseDecimal(cell: RawCell, style: DecimalStyle): Parsed<number> {
  if (cell === null) return EMPTY;
  if (typeof cell === 'number') return Number.isFinite(cell) ? { ok: true, value: cell } : INVALID;
  if (typeof cell === 'boolean') return INVALID;

  let text = cell.replace(/[\s  ]/g, '').replace(/^(R\$|US\$|\$|BRL)/i, '');
  if (text === '' || text === '-') return EMPTY;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.endsWith('-')) {
    negative = !negative;
    text = text.slice(0, -1);
  }
  text = text.replace(/^(R\$|US\$|\$)/i, '');
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return INVALID;

  const commas = (text.match(/,/g) ?? []).length;
  const dots = (text.match(/\./g) ?? []).length;
  let normalized: string;

  if (commas > 0 && dots > 0) {
    const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    const [integerPart, fraction, ...rest] = text.split(decimal);
    if (rest.length > 0 || !new RegExp(`^\\d{1,3}(\\${thousands}\\d{3})*$`).test(integerPart!)) return INVALID;
    normalized = `${integerPart!.split(thousands).join('')}.${fraction}`;
  } else if (commas > 0) {
    if (commas > 1) {
      if (!/^\d{1,3}(,\d{3})+$/.test(text)) return INVALID;
      normalized = text.replace(/,/g, '');
    } else {
      normalized = style === 'us' && /^\d{1,3},\d{3}$/.test(text) ? text.replace(',', '') : text.replace(',', '.');
    }
  } else if (dots > 0) {
    if (dots > 1) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(text)) return INVALID;
      normalized = text.replace(/\./g, '');
    } else {
      normalized = style === 'br' && /^\d{1,3}\.\d{3}$/.test(text) ? text.replace('.', '') : text;
    }
  } else {
    normalized = text;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return INVALID;
  return { ok: true, value: negative ? -value : value };
}

/** Decimal style of a column: the unambiguous values vote; ties go to BR. */
export function detectDecimalStyle(cells: RawCell[]): DecimalStyle {
  let br = 0;
  let us = 0;
  for (const cell of cells) {
    if (typeof cell !== 'string') continue;
    const text = cell.replace(/[\s R$]/g, '');
    if (/,\d{1,2}$/.test(text) || /\.\d{3},/.test(text)) br++;
    else if (/^\d*\.\d{1,2}$/.test(text) || /,\d{3}\./.test(text)) us++;
  }
  return us > br ? 'us' : 'br';
}

function isoFromParts(year: number, month: number, day: number): string | null {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const YEAR_FIRST = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/;
const DAY_OR_MONTH_FIRST = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;

export function parseDate(cell: RawCell, order: DateOrder): Parsed<string> {
  if (cell === null) return EMPTY;
  if (typeof cell === 'boolean') return INVALID;
  if (typeof cell === 'number') {
    // número de série do Excel (dias desde 30/12/1899), de 1954 a 2119
    if (!Number.isInteger(cell) || cell < 20000 || cell > 80000) return INVALID;
    return { ok: true, value: new Date(Date.UTC(1899, 11, 30) + cell * 86_400_000).toISOString().slice(0, 10) };
  }
  const text = cell.trim();
  if (text === '') return EMPTY;

  let match = ISO.exec(text) ?? YEAR_FIRST.exec(text);
  if (match) {
    const value = isoFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
    return value ? { ok: true, value } : INVALID;
  }
  match = DAY_OR_MONTH_FIRST.exec(text);
  if (match) {
    const [first, second] = [Number(match[1]), Number(match[2])];
    const year = match[3]!.length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    const [day, month] = order === 'mdy' ? [second, first] : [first, second];
    const value = isoFromParts(year, month, day);
    return value ? { ok: true, value } : INVALID;
  }
  return INVALID;
}

/** DD/MM unless the column shows otherwise (a first part above 12 settles it). */
export function detectDateOrder(cells: RawCell[]): DateOrder {
  let dayFirst = 0;
  let monthFirst = 0;
  for (const cell of cells) {
    if (typeof cell !== 'string') continue;
    const match = DAY_OR_MONTH_FIRST.exec(cell.trim());
    if (!match) continue;
    if (Number(match[1]) > 12) dayFirst++;
    if (Number(match[2]) > 12) monthFirst++;
  }
  return monthFirst > 0 && dayFirst === 0 ? 'mdy' : 'dmy';
}

const keyOf = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const TRUE = new Set(['sim', 's', 'true', 'verdadeiro', 'v', '1', 'x', 'yes', 'y', 'ativo', 'ativa']);
const FALSE = new Set(['nao', 'n', 'false', 'falso', 'f', '0', 'no', 'inativo', 'inativa']);

export function parseBoolean(cell: RawCell): Parsed<boolean> {
  if (cell === null) return EMPTY;
  if (typeof cell === 'boolean') return { ok: true, value: cell };
  const key = keyOf(cellText(cell));
  if (key === '') return EMPTY;
  if (TRUE.has(key)) return { ok: true, value: true };
  if (FALSE.has(key)) return { ok: true, value: false };
  return INVALID;
}

const SALE = new Set(['venda', 'vendas', 'v', 'sale', 'saida', 's', 'pedido']);
const RETURN = new Set(['devolucao', 'devolucoes', 'dev', 'd', 'return', 'estorno', 'troca', 'cancelamento', 'cancelada', 'cancelado']);

export function parseKind(cell: RawCell): Parsed<'sale' | 'return'> {
  const key = keyOf(cellText(cell));
  if (key === '') return EMPTY;
  if (SALE.has(key)) return { ok: true, value: 'sale' };
  if (RETURN.has(key)) return { ok: true, value: 'return' };
  return INVALID;
}

export function parseInteger(cell: RawCell, style: DecimalStyle): Parsed<number> {
  const parsed = parseDecimal(cell, style);
  if (!parsed.ok || parsed.value === null) return parsed;
  return Number.isInteger(parsed.value) ? parsed : INVALID;
}

/** Comparison key of a SKU, the same rule as private.sku_key() in the database. */
export function skuKey(sku: string) {
  return sku.replace(/\s+/g, '').toUpperCase();
}
