import type { Cents } from '@/types/catalog';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatPrice = (cents: Cents): string => brl.format(cents / 100);

const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

/** Ex.: R$ 6,5 mil — para indicadores com pouco espaço. */
export const formatCompactPrice = (cents: Cents): string => brlCompact.format(cents / 100);

export const formatDate = (iso: string): string =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** 08/10/2026 */
export const formatShortDate = (iso: string): string =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Data/hora local sem fuso ("2026-10-08T14:30:00"). Usada em pedidos e eventos
 * para que servidor e navegador exibam o mesmo horário.
 */
export function toLocalISO(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Converte "349,90" ou "349.90" em centavos. Retorna NaN para entradas inválidas. */
export function parsePrice(input: string): Cents {
  const normalized = input.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}

export const centsToInput = (cents?: Cents): string =>
  cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');
