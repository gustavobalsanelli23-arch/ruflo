/**
 * DEMONSTRATION DATA — deterministic daily sales history generated from the
 * demo catalog (same seed, same numbers on every render and every machine).
 * Every total the interface shows is a sum of these product-level rows, so
 * revenue, cost, margin and stock stay coherent across modules.
 */
import { addDays, daysBetween } from '@/lib/period';
import { DEMO_TODAY, costOn, products, type DemoProduct } from './catalog';

export const HISTORY_DAYS = 730;
export const HISTORY_START = addDays(DEMO_TODAY, -(HISTORY_DAYS - 1));

// Fri/Sat carry the week in specialty grocery; Monday is the quietest day.
const WEEKDAY = [0.84, 0.76, 0.86, 0.92, 0.98, 1.22, 1.42];
const MONTH = [0.93, 0.88, 0.95, 0.97, 1, 1.02, 1.01, 0.98, 1, 1.03, 1.07, 1.3];
const WINE_MONTH = [0.8, 0.78, 0.88, 0.95, 1.05, 1.18, 1.2, 1.02, 0.96, 1, 1.1, 1.62];
const BASKET_ITEMS = 3.2;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function seedFor(id: string): number {
  let hash = 2_166_136_261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619);
  return hash >>> 0;
}

export interface DailyRow {
  date: string;
  units: number;
  revenue: number;
  cost: number;
}

function generate(product: DemoProduct): DailyRow[] {
  const random = mulberry32(seedFor(product.id));
  const months = product.categoryId === 'vinhos' ? WINE_MONTH : MONTH;
  const rows: DailyRow[] = [];
  for (let i = 0; i < HISTORY_DAYS; i += 1) {
    const date = addDays(HISTORY_START, i);
    const day = new Date(`${date}T00:00:00Z`);
    const yearsBack = (HISTORY_DAYS - 1 - i) / 365;
    const trend = Math.pow(1 + product.growth, -yearsBack);
    const noise = 0.78 + random() * 0.44;
    const lambda =
      product.daily * trend * (WEEKDAY[day.getUTCDay()] ?? 1) * (months[day.getUTCMonth()] ?? 1) * noise;
    const stalled = product.lastSale !== undefined && date > product.lastSale;
    const units = stalled ? 0 : Math.floor(lambda + random());
    const unitCost = costOn(product, date);
    rows.push({ date, units, revenue: units * product.price, cost: units * unitCost });
  }
  return rows;
}

let cache: Map<string, DailyRow[]> | null = null;

export function salesHistory(): Map<string, DailyRow[]> {
  if (!cache) cache = new Map(products.map((product) => [product.id, generate(product)]));
  return cache;
}

function indexOf(date: string): number {
  return daysBetween(HISTORY_START, date) - 1;
}

export interface Totals {
  units: number;
  revenue: number;
  cost: number;
}

export function productTotals(productId: string, start: string, end: string): Totals {
  const rows = salesHistory().get(productId) ?? [];
  const from = Math.max(0, indexOf(start));
  const to = Math.min(rows.length - 1, indexOf(end));
  const totals: Totals = { units: 0, revenue: 0, cost: 0 };
  for (let i = from; i <= to; i += 1) {
    const row = rows[i];
    if (!row) continue;
    totals.units += row.units;
    totals.revenue += row.revenue;
    totals.cost += row.cost;
  }
  return totals;
}

export function storeTotals(start: string, end: string, productIds?: string[]): Totals {
  const ids = productIds ?? products.map((product) => product.id);
  const totals: Totals = { units: 0, revenue: 0, cost: 0 };
  for (const id of ids) {
    const t = productTotals(id, start, end);
    totals.units += t.units;
    totals.revenue += t.revenue;
    totals.cost += t.cost;
  }
  return totals;
}

/** Orders are derived from units with a stable basket size (demo assumption). */
export function ordersFor(units: number): number {
  return Math.round(units / BASKET_ITEMS);
}

export function lastSaleDate(productId: string): string | null {
  const rows = salesHistory().get(productId) ?? [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row && row.units > 0) return row.date;
  }
  return null;
}
