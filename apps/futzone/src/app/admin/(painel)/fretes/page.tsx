import type { Metadata } from 'next';
import { StripeManagedNotice } from '@/components/admin/StripeManagedNotice';

export const metadata: Metadata = { title: 'Fretes' };

export default function Page() {
  return (
    <StripeManagedNotice
      title="Fretes"
      steps={[
        'O frete é cobrado na página de pagamento da Stripe, conforme a região escolhida pelo cliente.',
        'Para mudar valores ou prazos: Stripe → Links de pagamento → abra o link do tipo de camisa → Opções de frete.',
        'Mude nos 6 links (Torcedor, Jogador, Especial, Conjunto, Infantil e Retrô) para manter o mesmo frete em todos.',
      ]}
    />
  );
}
