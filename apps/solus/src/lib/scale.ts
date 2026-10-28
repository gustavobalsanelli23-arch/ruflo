/**
 * Axis scales with round steps (1, 2, 2.5, 5 × 10ⁿ), so every chart reads
 * 36%, 38%, 40% or R$ 0, R$ 2,5 mil, R$ 5 mil, never 38%, 41%, 43%.
 */

export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

const STEPS = [1, 2, 2.5, 5, 10];

export function niceStep(span: number, intervals: number): number {
  const raw = Math.abs(span) / Math.max(1, intervals);
  if (raw === 0 || !Number.isFinite(raw)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const nice = STEPS.find((step) => unit <= step + 1e-9) ?? 10;
  return nice * power;
}

function precision(step: number): number {
  return Math.max(0, -Math.floor(Math.log10(step)) + 2);
}

function build(lo: number, hi: number, intervals: number): NiceScale {
  const step = niceStep(hi - lo, intervals);
  const digits = precision(step);
  const fix = (value: number) => Number(value.toFixed(digits));
  const min = fix(Math.floor(lo / step + 1e-9) * step);
  const max = fix(Math.ceil(hi / step - 1e-9) * step);
  const ticks: number[] = [];
  for (let value = min; value <= max + step / 2; value += step) ticks.push(fix(value));
  return { min, max, step, ticks };
}

/**
 * Picks the round scale that wastes the least plot area for `values`,
 * trying a few interval counts around `intervals`.
 */
export function niceScale(
  values: number[],
  options: { intervals?: number; includeZero?: boolean } = {},
): NiceScale {
  const finite = values.filter((value) => Number.isFinite(value));
  let lo = finite.length ? Math.min(...finite) : 0;
  let hi = finite.length ? Math.max(...finite) : 1;
  if (options.includeZero) {
    lo = Math.min(0, lo);
    hi = Math.max(0, hi);
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const target = options.intervals ?? 4;
  const candidates = [target - 1, target, target + 1].filter((n) => n >= 2).map((n) => build(lo, hi, n));
  const waste = (scale: NiceScale) => (scale.max - scale.min - (hi - lo)) / (scale.max - scale.min);
  return candidates
    .filter((scale) => scale.ticks.length >= 3 && scale.ticks.length <= 7)
    .reduce((best, scale) => (waste(scale) < waste(best) - 1e-9 ? scale : best), candidates[1] ?? candidates[0]!);
}

/** Decimal places a percent axis needs so neighbouring ticks never print the same label. */
export function percentDigits(step: number): 0 | 1 {
  return step * 100 >= 1 - 1e-9 ? 0 : 1;
}
