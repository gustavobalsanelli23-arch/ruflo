import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICE_RULES, type PriceKey } from '@/lib/pricing';
import { linkPriceMismatch, PAYMENT_LINKS, paymentGroups, paymentUrl, productPriceKey } from '@/lib/paymentLinks';
import { seedProducts } from '@/data/products';

describe('links de pagamento da Stripe', () => {
  it('cada tipo de camisa tem o seu link, com o preço da tabela', () => {
    const expected: Record<PriceKey, string> = {
      torcedor: '3cIcN7alF6g0grD7GK4ZG00',
      jogador: 'bJe5kFeBVgUEejv5yC4ZG01',
      conjunto: '14A4gBfFZeMwgrD6CG4ZG02',
      infantil: '28E3cx51lfQA6R35yC4ZG03',
      especial: '5kQ14p51ldIs0sFgdg4ZG04',
      retro: '3cI5kF1P9fQAcbn1im4ZG05',
    };
    for (const key of Object.keys(expected) as PriceKey[]) {
      expect(PAYMENT_LINKS[key].url).toBe(`https://buy.stripe.com/${expected[key]}`);
      expect(PAYMENT_LINKS[key].price).toBe(DEFAULT_PRICE_RULES[key]);
    }
  });

  it('todo produto do catálogo inicial pode ser pago pelo link do seu tipo', () => {
    expect(seedProducts.filter(linkPriceMismatch)).toEqual([]);
  });

  it('preço diferente do link (editado à mão ou promoção) é detectado', () => {
    const p = seedProducts.find((x) => productPriceKey(x) === 'torcedor')!;
    expect(linkPriceMismatch(p)).toBe(false);
    expect(linkPriceMismatch({ ...p, price: 14990 })).toBe(true);
  });

  it('agrupa por tipo: um pagamento por link, com quantidade, valor e referência', () => {
    const groups = paymentGroups(
      [
        { priceKey: 'retro', quantity: 1, unitPrice: 20990 },
        { priceKey: 'torcedor', quantity: 2, unitPrice: 16990 },
        { priceKey: 'torcedor', quantity: 1, unitPrice: 16990 },
      ],
      'FZ-10001',
    );
    expect(groups).toEqual([
      { key: 'torcedor', label: 'Camisa Torcedor', quantity: 3, amount: 50970, reference: 'FZ-10001-torcedor' },
      { key: 'retro', label: 'Camisa Retrô', quantity: 1, amount: 20990, reference: 'FZ-10001-retro' },
    ]);
  });

  it('o link leva a referência do pedido e o e-mail do cliente, codificados', () => {
    const url = new URL(paymentUrl({ key: 'jogador', reference: 'FZ-10002-jogador' }, 'ana+teste@exemplo.com'));
    expect(url.origin + url.pathname).toBe('https://buy.stripe.com/bJe5kFeBVgUEejv5yC4ZG01');
    expect(url.searchParams.get('client_reference_id')).toBe('FZ-10002-jogador');
    expect(url.searchParams.get('prefilled_email')).toBe('ana+teste@exemplo.com');
    // A Stripe só aceita letras, números, - e _ na referência.
    expect(new URL(paymentUrl({ key: 'retro', reference: 'FZ 1/2' })).searchParams.get('client_reference_id')).toBe('FZ12');
  });
});
