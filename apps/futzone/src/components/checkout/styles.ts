/*
 * Peças visuais repetidas no carrinho e no checkout. Sem 'use client': servem
 * tanto a componentes do servidor (TrustBadges) quanto aos do navegador.
 */

/** Linha de aço que abre um caminho alternativo ("Continuar como visitante", "Adicionar novo endereço"). */
export const STEEL_ROW =
  'group flex h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-button)] border border-line-strong bg-steel-2 px-4 text-left text-sm font-semibold text-fg transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out-fz)] hover:border-fg-2/40 hover:bg-steel-3 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/** Selo neutro de aço ("Simulado", "Em breve"). */
export const STEEL_TAG = 'shrink-0 rounded-[var(--radius-chip)] border border-line-strong px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted';

/** Ação em texto sublinhado, branca ("Alterar", "Tem um cupom?"). */
export const TEXT_BUTTON =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-button)] px-1 text-sm font-semibold text-fg underline decoration-fg/30 underline-offset-4 transition-[text-decoration-color,transform] duration-150 ease-[var(--ease-out-fz)] hover:decoration-fg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';
