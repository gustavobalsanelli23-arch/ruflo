/**
 * Writes bare numbers in the analyst's prose the Brazilian way, after the
 * numbers were checked against the data: "12012" → "12.012", "1234.5" →
 * "1.234,5", "63662,00" → "63.662,00". The model copies tool values, which
 * come unformatted; the tables are formatted by the app, the prose by this.
 *
 * Left alone: numbers already grouped ("12.012"), short ones ("715"), years
 * (1900–2100 without decimals), and digits glued to letters or symbols
 * (SKUs like "CAF-001", codes, times, dates, percentages already written),
 * numbers after a word that names a code (SKU, código, pedido, nota, EAN…)
 * and anything over 9 digits (barcodes, keys: never money in this app).
 */

const CODE_BEFORE = /(?:sku|c[óo]d(?:igo)?|pedido|nota|cupom|ean|gtin|chave|n[º°o]\.?|#)\s*[:-]?\s*$/i;

const BARE = /(?<![\p{L}\d.,/:#_-])(-?)(\d{4,})(?:([.,])(\d{1,4}))?(?![\p{L}\d/:#_]|[.,]\d)/gu;

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function tidyNumbers(text: string): string {
  return text.replace(BARE, (match, sign: string, whole: string, separator: string | undefined, decimals: string | undefined, offset: number) => {
    if (whole.length > 9 || CODE_BEFORE.test(text.slice(Math.max(0, offset - 16), offset))) return match;
    const year = !separator && whole.length === 4 && Number(whole) >= 1900 && Number(whole) <= 2100;
    if (year) return match;
    // A dot followed by exactly three digits is a thousands group, not a decimal.
    if (separator === '.' && decimals?.length === 3) return match;
    return `${sign}${group(whole)}${separator ? `,${decimals}` : ''}`;
  });
}
