import type { Cents } from '@/types/catalog';
import { readJSON, STORAGE_KEYS, writeJSON } from '@/services/storage';

/**
 * Cupons de desconto.
 *
 * Sem backend, os cupons são de DEMONSTRAÇÃO e ficam no navegador. Em produção
 * a validação precisa acontecer no servidor (limite de uso, validade, cliente),
 * implementando `CouponProvider` com a mesma assinatura.
 */

export type CouponType = 'percent' | 'fixed' | 'free_shipping';

export interface Coupon {
  code: string;
  description: string;
  type: CouponType;
  /** % (1–100) para `percent`; centavos para `fixed`; ignorado em `free_shipping`. */
  value: number;
  minSubtotal: Cents;
  /** Teto do desconto percentual (opcional). */
  maxDiscount?: Cents;
  active: boolean;
  /** AAAA-MM-DD (inclusive). */
  expiresAt?: string;
  createdAt: string;
}

export interface CouponContext {
  subtotal: Cents;
  /** Frete escolhido (null = ainda não escolhido). */
  shippingCost: Cents | null;
}

export type CouponResult =
  | { ok: true; coupon: Coupon; discount: Cents; freeShipping: boolean; message: string }
  | { ok: false; reason: 'vazio' | 'nao_encontrado' | 'inativo' | 'expirado' | 'minimo'; message: string };

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

const brl = (c: Cents) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function couponLabel(c: Coupon): string {
  if (c.type === 'percent') return `${c.value}% de desconto`;
  if (c.type === 'fixed') return `${brl(c.value)} de desconto`;
  return 'Frete grátis';
}

/** Valida e calcula o desconto de um cupom (função pura). */
export function evaluateCoupon(coupon: Coupon | undefined, ctx: CouponContext, today: string = new Date().toISOString().slice(0, 10)): CouponResult {
  if (!coupon) return { ok: false, reason: 'nao_encontrado', message: 'Cupom não encontrado.' };
  if (!coupon.active) return { ok: false, reason: 'inativo', message: 'Este cupom não está ativo.' };
  if (coupon.expiresAt && today > coupon.expiresAt) return { ok: false, reason: 'expirado', message: 'Este cupom expirou.' };
  if (ctx.subtotal < coupon.minSubtotal) {
    return { ok: false, reason: 'minimo', message: `Válido para compras a partir de ${brl(coupon.minSubtotal)}.` };
  }
  if (coupon.type === 'free_shipping') {
    return { ok: true, coupon, discount: ctx.shippingCost ?? 0, freeShipping: true, message: 'Frete grátis aplicado.' };
  }
  let discount = coupon.type === 'percent' ? Math.round((ctx.subtotal * Math.min(100, Math.max(0, coupon.value))) / 100) : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, ctx.subtotal);
  return { ok: true, coupon, discount, freeShipping: false, message: `${couponLabel(coupon)} aplicado.` };
}

export const DEFAULT_COUPONS: Coupon[] = [
  { code: 'CUPOM10', description: 'Cupom de demonstração', type: 'percent', value: 10, minSubtotal: 0, active: true, createdAt: '2026-10-01' },
  { code: 'BEMVINDO20', description: 'Boas-vindas (demonstração)', type: 'fixed', value: 2000, minSubtotal: 20000, active: true, createdAt: '2026-10-01' },
  { code: 'FRETEGRATIS', description: 'Frete grátis (demonstração)', type: 'free_shipping', value: 0, minSubtotal: 25000, active: true, createdAt: '2026-10-01' },
];

export interface CouponRepository {
  list(): Coupon[];
  saveAll(coupons: Coupon[]): void;
}

export const couponRepository: CouponRepository = {
  list: () => readJSON<Coupon[]>(STORAGE_KEYS.coupons, DEFAULT_COUPONS),
  saveAll: (coupons) => writeJSON(STORAGE_KEYS.coupons, coupons),
};

export interface CouponProvider {
  validate(code: string, ctx: CouponContext): Promise<CouponResult>;
}

/** Validação local (demonstração). */
export const couponProvider: CouponProvider = {
  async validate(code, ctx) {
    const normalized = normalizeCode(code);
    if (!normalized) return { ok: false, reason: 'vazio', message: 'Digite o código do cupom.' };
    const coupon = couponRepository.list().find((c) => c.code === normalized);
    return evaluateCoupon(coupon, ctx);
  },
};
