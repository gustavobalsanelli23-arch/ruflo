import type { Metadata } from 'next';
import { StripeManagedNotice } from '@/components/admin/StripeManagedNotice';

export const metadata: Metadata = { title: 'Cupons' };

export default function Page() {
  return (
    <StripeManagedNotice
      title="Cupons"
      steps={[
        'Os cupons do site foram desligados: o desconto precisa ser aplicado no pagamento, que é feito na Stripe.',
        'Para criar um cupom: Stripe → Catálogo de produtos → Cupons → Novo cupom, e crie um código promocional para ele.',
        'Em cada link de pagamento, ative "Permitir códigos promocionais" para o cliente poder digitar o código.',
      ]}
    />
  );
}
