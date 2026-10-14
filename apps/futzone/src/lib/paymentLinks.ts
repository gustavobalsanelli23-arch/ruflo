import type { Cents, Product } from '@/types/catalog';
import { priceKeyFor, type PriceKey } from './pricing';

/**
 * Pagamento pelos links da Stripe: um link fixo por tipo de camisa, com o preço
 * do tipo e o frete por região escolhido na própria Stripe (que também coleta o
 * endereço). Os links são públicos; nenhuma chave da Stripe passa pelo site.
 *
 * O link não sabe qual time nem tamanho foi comprado: o pedido fica gravado na
 * loja e a referência `<número>-<tipo>` vai junto (client_reference_id), para o
 * pagamento ser casado com o pedido no painel.
 */

export interface PaymentLink {
  url: string;
  /** Preço cobrado pelo link (centavos). Precisa ser igual ao preço do produto. */
  price: Cents;
  label: string;
}

export const PAYMENT_LINKS: Record<PriceKey, PaymentLink> = {
  torcedor: { url: 'https://buy.stripe.com/3cIcN7alF6g0grD7GK4ZG00', price: 16990, label: 'Camisa Torcedor' },
  jogador: { url: 'https://buy.stripe.com/bJe5kFeBVgUEejv5yC4ZG01', price: 18990, label: 'Camisa Jogador' },
  conjunto: { url: 'https://buy.stripe.com/14A4gBfFZeMwgrD6CG4ZG02', price: 16990, label: 'Conjunto' },
  infantil: { url: 'https://buy.stripe.com/28E3cx51lfQA6R35yC4ZG03', price: 16990, label: 'Camisa Infantil' },
  especial: { url: 'https://buy.stripe.com/5kQ14p51ldIs0sFgdg4ZG04', price: 18990, label: 'Camisa Especial' },
  retro: { url: 'https://buy.stripe.com/3cI5kF1P9fQAcbn1im4ZG05', price: 20990, label: 'Camisa Retrô' },
};

/** Ordem em que os pagamentos aparecem para o cliente. */
const ORDER: PriceKey[] = ['torcedor', 'jogador', 'especial', 'conjunto', 'infantil', 'retro'];

/** Um pagamento do pedido: todas as camisas do mesmo tipo vão no mesmo link. */
export interface PaymentLinkGroup {
  key: PriceKey;
  label: string;
  quantity: number;
  /** Valor dos produtos deste pagamento (o frete é somado na Stripe). */
  amount: Cents;
  /** Referência enviada à Stripe (client_reference_id): `FZ-10001-torcedor`. */
  reference: string;
}

export const productPriceKey = (p: Pick<Product, 'name' | 'category' | 'gender'>): PriceKey =>
  priceKeyFor({ name: p.name, category: p.category, kids: p.gender === 'infantil' });

/** O preço do produto difere do preço fixo do link do tipo dele? */
export function linkPriceMismatch(p: Pick<Product, 'name' | 'category' | 'gender' | 'price'>): boolean {
  return p.price !== PAYMENT_LINKS[productPriceKey(p)].price;
}

export function paymentGroups(lines: Array<{ priceKey: PriceKey; quantity: number; unitPrice: Cents }>, orderNumber: string): PaymentLinkGroup[] {
  const byKey = new Map<PriceKey, { quantity: number; amount: Cents }>();
  for (const l of lines) {
    const g = byKey.get(l.priceKey) ?? { quantity: 0, amount: 0 };
    byKey.set(l.priceKey, { quantity: g.quantity + l.quantity, amount: g.amount + l.unitPrice * l.quantity });
  }
  return ORDER.filter((k) => byKey.has(k)).map((key) => ({
    key,
    label: PAYMENT_LINKS[key].label,
    ...byKey.get(key)!,
    reference: `${orderNumber}-${key}`,
  }));
}

/** Link da Stripe com a referência do pedido e o e-mail do cliente já preenchidos. */
export function paymentUrl(group: Pick<PaymentLinkGroup, 'key' | 'reference'>, email?: string): string {
  const params = new URLSearchParams({ client_reference_id: group.reference.replace(/[^A-Za-z0-9_-]/g, '') });
  if (email) params.set('prefilled_email', email);
  return `${PAYMENT_LINKS[group.key].url}?${params.toString()}`;
}
