/**
 * Grounding: every number and date the analyst writes must appear in the
 * results of the tools it called. The model may copy a value as formatted or
 * rounded ("R$ 1.234,56", "R$ 1,2 mil", "23%"), never compute a new one.
 *
 * Not checked: integers up to 10 without a unit (enumerations, "3 produtos")
 * and numbers inside strings that came from the data (product names such as
 * "Café 250 g", SKUs), which are masked before the scan.
 */

export interface Ground {
  numbers: number[];
  /** ISO dates (YYYY-MM-DD) found in the data. */
  dates: Set<string>;
  /** YYYY-MM of every date, for month-level references. */
  months: Set<string>;
  years: Set<string>;
  /** Text values from the data, longest first, masked before scanning. */
  strings: string[];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function buildGround(values: unknown[]): Ground {
  const numbers: number[] = [];
  const dates = new Set<string>();
  const strings = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'number') {
      if (Number.isFinite(value)) numbers.push(value);
    } else if (typeof value === 'string') {
      const iso = ISO_DATE.exec(value);
      if (iso) dates.add(iso[0]);
      // Names, SKUs and formatted values ("Café 250 g", "R$ 1.234,56") copied verbatim.
      else if (value.length >= 3 && value.length <= 200 && /\d/.test(value) && /[A-Za-zÀ-ÿ$]/.test(value)) strings.add(value);
    } else if (Array.isArray(value)) {
      numbers.push(value.length);
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  values.forEach(visit);
  const months = new Set([...dates].map((date) => date.slice(0, 7)));
  const years = new Set([...dates].map((date) => date.slice(0, 4)));
  return { numbers, dates, months, years, strings: [...strings].sort((a, b) => b.length - a.length) };
}

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6,
  jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12,
};
const MONTH_NAMES = 'jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?';

const pad = (value: number) => String(value).padStart(2, '0');
const monthOf = (name: string) => MONTHS[name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace('.', '')] ?? 0;

type Token = { text: string; ok: boolean };

function checkDate(day: number | null, month: number, year: number | null, ground: Ground): boolean {
  if (month < 1 || month > 12) return false;
  if (year !== null && day !== null) return ground.dates.has(`${year}-${pad(month)}-${pad(day)}`);
  if (year !== null) return ground.months.has(`${year}-${pad(month)}`);
  // Sem ano: algum dia (ou mês) igual nos dados.
  return [...ground.dates].some((date) => Number(date.slice(5, 7)) === month && (day === null || Number(date.slice(8, 10)) === day));
}

const fullYear = (text: string | undefined) => (text === undefined ? null : text.length === 2 ? 2000 + Number(text) : Number(text));

/** Dates first, so their digits are not read as numbers. */
const DATE_PATTERNS: { regex: RegExp; check: (match: RegExpExecArray, ground: Ground) => boolean }[] = [
  {
    regex: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    check: (m, g) => checkDate(Number(m[3]), Number(m[2]), Number(m[1]), g),
  },
  {
    regex: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?\b/g,
    check: (m, g) => checkDate(Number(m[1]), Number(m[2]), fullYear(m[3]), g),
  },
  {
    regex: new RegExp(`\\b(\\d{1,2})(?:º)?\\s+(?:de\\s+)?(${MONTH_NAMES})\\.?(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`, 'gi'),
    check: (m, g) => checkDate(Number(m[1]), monthOf(m[2]!), fullYear(m[3]), g),
  },
  {
    regex: new RegExp(`\\b(${MONTH_NAMES})\\.?(?:\\s+de)?\\s+(\\d{4})\\b`, 'gi'),
    check: (m, g) => checkDate(null, monthOf(m[1]!), Number(m[2]), g),
  },
  {
    regex: /\b(20\d{2}|19\d{2})\b/g,
    check: (m, g) => g.years.has(m[1]!),
  },
];

const NUMBER =
  /(?<![\w.,])(-|−|\+)?(R\$\s?)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(\s?%|\s?p\.?\s?p\.?|\s?(?:mil|mi|milhões|milhão|bi|bilhões|bilhão)\b)?/gi;

function multiplierOf(unit: string | undefined): number {
  const value = (unit ?? '').trim().toLowerCase();
  if (value === 'mil') return 1e3;
  if (value === 'mi' || value.startsWith('milh')) return 1e6;
  if (value === 'bi' || value.startsWith('bilh')) return 1e9;
  return 1;
}

function matches(value: number, decimals: number, multiplier: number, ground: Ground): boolean {
  const target = value * multiplier;
  const tolerance = 0.5 * 10 ** -decimals * multiplier + 1e-9;
  return ground.numbers.some((candidate) => Math.abs(Math.abs(candidate) - Math.abs(target)) <= tolerance);
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The numbers and dates in `text`, each marked as found in the data or not. */
export function scan(text: string, ground: Ground): Token[] {
  let rest = text;
  for (const known of ground.strings) {
    if (rest.toLowerCase().includes(known.toLowerCase())) rest = rest.replace(new RegExp(escapeRegex(known), 'gi'), ' ');
  }
  const tokens: Token[] = [];
  for (const pattern of DATE_PATTERNS) {
    rest = rest.replace(pattern.regex, (...args) => {
      const match = args.slice(0, -2) as unknown as RegExpExecArray;
      tokens.push({ text: match[0], ok: pattern.check(match, ground) });
      return ' ';
    });
  }
  for (const match of rest.matchAll(NUMBER)) {
    const [whole, , currency, digits, unit] = match;
    const normalized = digits!.replace(/\./g, '').replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value)) continue;
    const decimals = normalized.includes('.') ? normalized.split('.')[1]!.length : 0;
    const plain = !currency && !unit;
    if (plain && decimals === 0 && value <= 10) continue;
    if (/^\s?[º°ª]/.test(rest.slice((match.index ?? 0) + whole.length))) continue;
    tokens.push({ text: whole.trim(), ok: matches(value, decimals, multiplierOf(unit), ground) });
  }
  return tokens;
}

export function unverified(text: string, ground: Ground): string[] {
  return scan(text, ground)
    .filter((token) => !token.ok)
    .map((token) => token.text);
}

/** Sentences of a paragraph, keeping their punctuation. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9"“(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
