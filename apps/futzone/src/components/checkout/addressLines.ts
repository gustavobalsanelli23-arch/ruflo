import type { Address } from '@/types/commerce';

/**
 * O endereço de formatAddress (lib/orders) quebrado em linhas: rua e número,
 * bairro e cidade, CEP. Assim o CEP nunca quebra no hífen ("01310-" / "100").
 */
export function addressLines(a: Address): string[] {
  return [`${a.street}, ${a.number}${a.complement ? `, ${a.complement}` : ''}`, `${a.district}, ${a.city}/${a.state}`, `CEP ${a.zip}`];
}
