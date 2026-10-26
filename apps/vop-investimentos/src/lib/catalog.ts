// Regras do catálogo, independentes da origem dos dados. Hoje a lista vem de
// src/data/properties.ts; para ligar um CMS (Sanity, Strapi, planilha, API do
// CRM), basta entregar um Property[] no mesmo formato — por exemplo, buscando
// no build (src/entry-server.tsx) e injetando no HTML — e estes filtros,
// cards e o detalhe continuam funcionando sem mudança.
import type { Property, PropertyType, Purpose } from '../data/properties';

export type PurposeFilter = 'todos' | Purpose;
export type PriceRangeId = 'todas' | 'ate-2' | '2-a-5' | 'acima-5' | 'consulta';

export interface Filters {
  purpose: PurposeFilter;
  type: 'todos' | PropertyType;
  region: 'todas' | string;
  price: PriceRangeId;
}

export const defaultFilters: Filters = { purpose: 'todos', type: 'todos', region: 'todas', price: 'todas' };

interface PriceRange {
  id: PriceRangeId;
  label: string;
  min?: number;
  max?: number;
}

export const priceRanges: readonly PriceRange[] = [
  { id: 'todas', label: 'Qualquer valor' },
  { id: 'ate-2', label: 'Até R$ 2 milhões', max: 2_000_000 },
  { id: '2-a-5', label: 'De R$ 2 a 5 milhões', min: 2_000_000, max: 5_000_000 },
  { id: 'acima-5', label: 'Acima de R$ 5 milhões', min: 5_000_000 },
  { id: 'consulta', label: 'Valor sob consulta' },
];

export const purposeOptions: readonly { id: PurposeFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'comprar', label: 'Comprar' },
  { id: 'investir', label: 'Investir' },
];

function inRange(price: number | null, id: PriceRangeId): boolean {
  if (id === 'todas') return true;
  if (id === 'consulta') return price === null;
  if (price === null) return false;
  const range = priceRanges.find((r) => r.id === id);
  if (!range) return true;
  return (range.min === undefined || price >= range.min) && (range.max === undefined || price < range.max);
}

export function filterProperties(list: readonly Property[], f: Filters): Property[] {
  return list.filter(
    (p) =>
      (f.purpose === 'todos' || p.purposes.includes(f.purpose)) &&
      (f.type === 'todos' || p.type === f.type) &&
      (f.region === 'todas' || p.location.region === f.region) &&
      inRange(p.price, f.price),
  );
}

export function isFiltered(f: Filters): boolean {
  return (Object.keys(defaultFilters) as (keyof Filters)[]).some((k) => f[k] !== defaultFilters[k]);
}

export interface FilterOptions {
  types: PropertyType[];
  regions: string[];
  /** Faixas de preço que têm ao menos um imóvel. */
  prices: PriceRange[];
  /** Só mostra um filtro quando ele separa alguma coisa. */
  show: { purpose: boolean; type: boolean; region: boolean; price: boolean };
}

/** Opções derivadas dos dados: o filtro nunca oferece o que não existe. */
export function filterOptions(list: readonly Property[]): FilterOptions {
  const types = [...new Set(list.map((p) => p.type))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const regions = [...new Set(list.map((p) => p.location.region))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const prices = priceRanges.filter((r) => r.id === 'todas' || list.some((p) => inRange(p.price, r.id)));
  const purposes = new Set(list.flatMap((p) => p.purposes));
  return {
    types,
    regions,
    prices,
    show: {
      purpose: purposes.size > 1,
      type: types.length > 1,
      region: regions.length > 1,
      price: prices.length > 2 && list.filter((p) => p.price !== null).length >= 2,
    },
  };
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** "R$ 7.900.000" ou "Sob consulta". */
export function formatPrice(price: number | null): string {
  return price === null ? 'Sob consulta' : brl.format(price).replace(/ /g, ' ');
}

export function formatArea(area: number): string {
  return `${area.toLocaleString('pt-BR')} m²`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Linhas de ficha técnica que existem para o imóvel (sem campos vazios). */
export function specs(p: Property): { label: string; value: string }[] {
  const rows = [{ label: 'Área', value: formatArea(p.area) }];
  if (p.suites !== undefined && p.bedrooms === undefined) rows.push({ label: 'Suítes', value: String(p.suites) });
  if (p.bedrooms !== undefined) {
    rows.push({
      label: 'Dormitórios',
      value: p.suites ? `${p.bedrooms} (${plural(p.suites, 'suíte', 'suítes')})` : String(p.bedrooms),
    });
  }
  if (p.parking !== undefined) rows.push({ label: 'Vagas', value: String(p.parking) });
  return rows;
}

/**
 * Ritmo editorial da grade: um imóvel em largura total, dois lado a lado, e
 * assim por diante. Um imóvel que ficaria sozinho na metade ocupa a linha.
 */
export function isWide(position: number, total: number): boolean {
  const slot = position % 3;
  return slot === 0 || (slot === 1 && position === total - 1);
}

/** Mensagem pronta de interesse em um imóvel. */
export function interestMessage(p: Property): string {
  return `Olá! Vim pelo site da VOP e quero saber mais sobre o imóvel ${p.code} — ${p.title} (${p.location.label}).`;
}
