import { ArrowRight, Boxes, Calculator, FileSpreadsheet, Lightbulb, LineChart, MessageSquareText, ShieldCheck, Store } from 'lucide-react';
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
const PRIMARY = `inline-flex h-11 items-center justify-center gap-2 bg-primary px-5 text-[15px] font-medium text-primary-foreground hover:bg-primary/85 ${FOCUS}`;
const SECONDARY = `inline-flex h-11 items-center justify-center gap-2 border border-border px-5 text-[15px] font-medium text-foreground hover:bg-muted ${FOCUS}`;

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Envie as planilhas que você já tem',
    text: 'Vendas, produtos e estoque em CSV ou Excel, exportados do seu sistema, do Mercado Livre ou da contabilidade. Sem integração e sem instalar nada.',
  },
  {
    icon: LineChart,
    title: 'O SOLUS confere e calcula',
    text: 'Cada linha é validada antes de entrar. Você vê o que foi aceito, o que foi ignorado e por quê.',
  },
  {
    icon: Lightbulb,
    title: 'Veja onde ganha e onde perde',
    text: 'Lucro por produto e categoria, estoque parado, risco de faltar mercadoria e as ações com maior impacto.',
  },
];

const MODULES = [
  { icon: LineChart, title: 'Lucratividade', text: 'Receita, custo e margem por produto, categoria e canal, no período que você escolher.' },
  { icon: Boxes, title: 'Estoque', text: 'Dinheiro parado em produto que não gira e itens perto de acabar, pelo ritmo real de venda.' },
  { icon: Lightbulb, title: 'Oportunidades', text: 'Preços, compras e produtos que pedem atenção, em ordem de impacto.' },
  { icon: MessageSquareText, title: 'Analista de IA', text: 'Pergunte em português. Cada número da resposta é conferido nos seus dados.' },
];

const AUDIENCES = [
  {
    icon: Store,
    title: 'Lojas e vendedores online',
    text: 'Importe o relatório de vendas do Mercado Livre ou do seu sistema e descubra quais anúncios dão lucro de verdade.',
  },
  {
    icon: Calculator,
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
        className="fixed top-2 left-2 z-[60] -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>

      <LandingHero />

      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 id="como-funciona" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center bg-brand/10 text-sm font-semibold text-brand">{index + 1}</span>
                  <step.icon aria-hidden="true" className="size-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="o-que-voce-ve" className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 id="o-que-voce-ve" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              O que você vê
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {MODULES.map((module) => (
                <li key={module.title} className="flex gap-4 border border-border bg-card p-6">
                  <module.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{module.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{module.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/demo/visao-geral" className={`mt-8 ${SECONDARY}`}>
              Abrir a demonstração
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="para-quem" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 id="para-quem" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Para quem é
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <li key={audience.title} className="border border-border bg-card p-6">
                <audience.icon aria-hidden="true" className="size-6 text-brand" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{audience.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{audience.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="seus-dados" className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 id="seus-dados" className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              <ShieldCheck aria-hidden="true" className="size-7 shrink-0 text-brand" />
              Seus dados continuam seus
            </h2>
            <ul className="mt-8 grid gap-4 text-[15px] leading-7 text-foreground sm:grid-cols-2">
              <li className="border-l-2 border-brand pl-4">Cada empresa vê só os próprios dados, separados no banco de dados.</li>
              <li className="border-l-2 border-brand pl-4">Você escolhe quem da equipe acessa e com qual papel.</li>
              <li className="border-l-2 border-brand pl-4">Desfazer uma importação apaga as linhas dela.</li>
              <li className="border-l-2 border-brand pl-4">
                Tratamento conforme a LGPD. Leia a{' '}
                <Link href="/privacidade" className="font-medium text-brand underline underline-offset-4">
                  política de privacidade
                </Link>
                .
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="planos" className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 id="planos" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Comece grátis e mude de plano quando crescer
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Todos os planos têm as mesmas funções. Os pagos começam em {formatPrice(lowest)} por mês e mudam no número de pessoas, de
            linhas guardadas e de perguntas à IA.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className={PRIMARY}>
              Criar conta grátis
            </Link>
            <Link href="/planos" className={SECONDARY}>
              Comparar os planos
            </Link>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
