import type { Metadata } from 'next';
import { site } from '@/data/site';
import { DemoNotice } from '@/components/ui/Feedback';
import { PageHeader } from '../PageHeader';
import { PolicyIndex } from './PolicyIndex';

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

/** Página de leitura: medida de 65 a 75 caracteres, índice fixo no desktop e âncoras preservadas. */
export default function PoliciesPage() {
  return (
    <>
      <PageHeader title="Políticas da loja" description="Trocas, entregas, privacidade e termos de uso, em linguagem direta." />
      <div className="container-fz grid gap-10 pb-6 pt-8 sm:pt-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <PolicyIndex items={SECTIONS.map(({ id, title }) => ({ id, title }))} />
          </div>
        </aside>

        <div className="min-w-0 max-w-[70ch]">
          <DemoNotice>
            Documento em elaboração. Dúvidas? Escreva para{' '}
            <a href={`mailto:${site.contactEmail}`} className="font-semibold text-fg underline decoration-line-strong underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-fg">
              {site.contactEmail}
            </a>
            .
          </DemoNotice>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-24 py-9 sm:py-10">
                <h2 id={`${s.id}-titulo`} className="heading-display text-[2rem] text-fg sm:text-[2.5rem]">
                  {s.title}
                </h2>
                <p className="mt-4 max-w-[60ch] text-[0.95rem] leading-relaxed text-fg-2 sm:text-base">{s.text}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
