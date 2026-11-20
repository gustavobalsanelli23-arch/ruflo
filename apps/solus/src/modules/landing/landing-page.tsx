import Link from 'next/link';
import { formatPrice, PLANS } from '@/config/plans';
import { LegalFooter } from '@/modules/legal/legal-shell';
import { LandingHero } from './landing-hero';

/**
 * Public home for visitors (signed-in people go straight to the app). Every
 * claim here is something the product does today; no figures, logos or
 * testimonials that SOLUS does not have.
 */

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const PRIMARY = `inline-flex h-12 items-center justify-center gap-2 btn-primary px-6 text-base font-semibold ${FOCUS}`;
const SECONDARY = `inline-flex h-12 items-center justify-center gap-2 btn-soft px-6 text-base font-semibold ${FOCUS}`;
const SECTION_TITLE = 'text-[2rem] leading-[1.05] font-bold tracking-[-0.04em] text-foreground sm:text-[2.75rem]';
/* A column: hairline on top, title, text. */
const COLUMN = 'border-t border-foreground/80 pt-4';

const STEPS = [
  {
    title: 'Envie as planilhas que você já tem',
    text: 'Vendas, produtos e estoque em CSV ou Excel, exportados do seu sistema, do Mercado Livre ou da contabilidade. Sem integração e sem instalar nada.',
  },
  {
    title: 'O SOLUS confere e calcula',
    text: 'Cada linha é validada antes de entrar. Você vê o que foi aceito, o que foi ignorado e por quê.',
  },
  {
    title: 'Veja onde ganha e onde perde',
    text: 'Lucro por produto e categoria, estoque parado, risco de faltar mercadoria e as ações com maior impacto.',
  },
];

const MODULES = [
  { title: 'Lucratividade', text: 'Receita, custo e margem por produto, categoria e canal, no período que você escolher.' },
  { title: 'Estoque', text: 'Dinheiro parado em produto que não gira e itens perto de acabar, pelo ritmo real de venda.' },
  { title: 'Oportunidades', text: 'Preços, compras e produtos que pedem atenção, em ordem de impacto.' },
  { title: 'Analista de IA', text: 'Pergunte em português. Cada número da resposta é conferido nos seus dados.' },
];

const AUDIENCES = [
  {
    title: 'Lojas e vendedores online',
    text: 'Importe o relatório de vendas do Mercado Livre ou do seu sistema e descubra quais anúncios dão lucro de verdade.',
  },
  {
    title: 'Escritórios de contabilidade',
    text: 'Transforme as notas fiscais que você já recebe dos clientes em uma leitura de lucro e estoque para cada um deles.',
  },
];

export function LandingPage() {
  const paid = PLANS.filter((plan) => plan.monthlyPrice > 0);
  const lowest = Math.min(...paid.map((plan) => plan.monthlyPrice));
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-[60] -translate-y-16 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>

      <LandingHero />

      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <h2 id="como-funciona" className={SECTION_TITLE}>
            Como funciona
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title} className={COLUMN}>
                <span className="text-sm font-semibold text-muted-foreground tabular">{index + 1}</span>
                <h3 className="mt-1 text-xl leading-tight font-bold tracking-[-0.02em] text-foreground">{step.title}</h3>
                <p className="mt-3 max-w-sm text-[15px] leading-7 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="o-que-voce-ve" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <h2 id="o-que-voce-ve" className={SECTION_TITLE}>
              O que você vê
            </h2>
            <ul className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12">
              {MODULES.map((module) => (
                <li key={module.title} className={COLUMN}>
                  <h3 className="text-xl leading-tight font-bold tracking-[-0.02em] text-foreground">{module.title}</h3>
                  <p className="mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">{module.text}</p>
                </li>
              ))}
            </ul>
            <Link href="/demo/visao-geral" className={`mt-12 ${SECONDARY}`}>
              Abrir a demonstração
            </Link>
          </div>
        </section>

        <section aria-labelledby="para-quem" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <h2 id="para-quem" className={SECTION_TITLE}>
              Para quem é
            </h2>
            <ul className="mt-12 grid gap-10 md:grid-cols-2 md:gap-8">
              {AUDIENCES.map((audience) => (
                <li key={audience.title} className={COLUMN}>
                  <h3 className="text-2xl leading-tight font-bold tracking-[-0.03em] text-foreground">{audience.title}</h3>
                  <p className="mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">{audience.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="seus-dados" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <h2 id="seus-dados" className={SECTION_TITLE}>
              Seus dados continuam seus
            </h2>
            <ul className="mt-12 grid gap-x-8 gap-y-6 text-[15px] leading-7 text-foreground sm:grid-cols-2">
              <li className={COLUMN}>Cada empresa vê só os próprios dados, separados no banco de dados.</li>
              <li className={COLUMN}>Você escolhe quem da equipe acessa e com qual papel.</li>
              <li className={COLUMN}>Desfazer uma importação apaga as linhas dela.</li>
              <li className={COLUMN}>
                Tratamento conforme a LGPD. Leia a{' '}
                <Link href="/privacidade" className="font-semibold text-foreground underline underline-offset-4">
                  política de privacidade
                </Link>
                .
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="planos" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <h2 id="planos" className={`${SECTION_TITLE} max-w-3xl`}>
              Comece grátis e mude de plano quando crescer
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Todos os planos têm as mesmas funções. Os pagos começam em {formatPrice(lowest)} por mês e mudam no número de pessoas, de
              linhas guardadas e de perguntas à IA.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className={PRIMARY}>
                Criar conta grátis
              </Link>
              <Link href="/planos" className={SECONDARY}>
                Comparar os planos
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
