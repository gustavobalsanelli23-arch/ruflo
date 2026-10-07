import type { Metadata } from 'next';
import { site } from '@/data/site';
import { DemoNotice } from '@/components/ui/Feedback';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: 'Políticas da loja' };

const SECTIONS = [
  {
    id: 'trocas',
    title: 'Trocas e devoluções',
    text: 'Compras feitas pela internet podem ser devolvidas em até 7 dias após o recebimento (direito de arrependimento, art. 49 do Código de Defesa do Consumidor). As regras detalhadas de troca de tamanho serão publicadas aqui antes do início das vendas.',
  },
  { id: 'entregas', title: 'Entregas', text: 'Prazos, valores de frete e regiões atendidas serão definidos quando a finalização de compra for ativada.' },
  { id: 'privacidade', title: 'Privacidade', text: 'Nesta versão de demonstração nenhum dado é enviado a servidores: carrinho, conta e pedidos ficam apenas no seu navegador. A política completa, em conformidade com a LGPD, será publicada antes do lançamento.' },
  { id: 'termos', title: 'Termos de uso', text: 'Os termos de uso da loja estão em elaboração e serão publicados antes do início das vendas.' },
];

export default function PoliciesPage() {
  return (
    <>
      <PageHeader eyebrow="Atendimento" title="Políticas da loja" description="Transparência sobre trocas, entregas e privacidade." />
      <div className="container-fz max-w-3xl py-10 sm:py-14">
        <DemoNotice>Documento em elaboração. Dúvidas? Escreva para {site.contactEmail}.</DemoNotice>
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="heading-display text-3xl text-fg sm:text-4xl">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-fg-2">{s.text}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
