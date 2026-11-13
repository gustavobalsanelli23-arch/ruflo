import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/config/legal';
import { Contact, LegalDocument, Section } from '@/modules/legal/legal-shell';

export const metadata: Metadata = { title: 'Política de reembolso' };

export default function RefundPage() {
  return (
    <LegalDocument
      title="Política de reembolso"
      intro={
        <p>
          Vale para os planos pagos do SOLUS (Basic, Pro e Premium). O plano Free não tem cobrança. Os preços estão na{' '}
          <Link href="/planos">página de planos</Link>.
        </p>
      }
    >
      <Section title="1. Arrependimento em 7 dias">
        <p>
          Você pode desistir da contratação em até 7 dias corridos a partir da primeira cobrança de um plano, sem precisar justificar
          (art. 49 do Código de Defesa do Consumidor). Devolvemos o valor pago integralmente.
        </p>
      </Section>

      <Section title="2. Cancelamento depois de 7 dias">
        <ul>
          <li>Você pode cancelar quando quiser, sem multa.</li>
          <li>O plano continua valendo até o fim do mês já pago; depois, a organização passa para o plano Free.</li>
          <li>Não há reembolso proporcional dos dias restantes do mês, salvo nos casos do item 3.</li>
          <li>Os dados não são apagados ao mudar para o Free. Se passarem do limite do Free, ficam guardados e você só não importa mais.</li>
        </ul>
      </Section>

      <Section title="3. Quando devolvemos de qualquer forma">
        <ul>
          <li>Cobrança em duplicidade ou de valor diferente do contratado: devolvemos a diferença.</li>
          <li>Serviço indisponível por nossa culpa por mais de 72 horas seguidas no mês: devolvemos o valor proporcional ao período.</li>
        </ul>
      </Section>

      <Section title="4. Como pedir">
        <p>
          Escreva para <Contact email={LEGAL.supportEmail} /> com o e-mail da conta e o nome da organização. Respondemos em até 5 dias
          úteis. O valor é devolvido pelo mesmo meio de pagamento em até 10 dias úteis depois da confirmação; o prazo para aparecer na
          fatura depende do banco ou da operadora do cartão.
        </p>
      </Section>
    </LegalDocument>
  );
}
