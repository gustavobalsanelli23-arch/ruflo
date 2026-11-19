import { ArrowRight, Boxes, Calculator, FileSpreadsheet, Lightbulb, LineChart, MessageSquareText, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';
import { EclipseArt } from '@/components/brand/eclipse';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { formatPrice, PLANS } from '@/config/plans';
import { LegalFooter } from '@/modules/legal/legal-shell';

/**
 * Public home for visitors (signed-in people go straight to the app). Every
 * claim here is something the product does today; no figures, logos or
 * testimonials that SOLUS does not have.
 */

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const PRIMARY = `inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground hover:bg-primary/85 ${FOCUS}`;
const SECONDARY = `inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-[15px] font-medium text-foreground hover:bg-muted ${FOCUS}`;

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

      <header className="relative isolate overflow-hidden bg-[#101923] text-sidebar-foreground">
        <div className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="SOLUS, início" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/70">
            <Logo />
          </Link>
          <nav aria-label="Conta" className="flex items-center gap-2 text-sm sm:gap-4">
            <Link href="/planos" className="hidden rounded-sm px-1 py-1.5 text-sidebar-foreground hover:text-sidebar-accent-foreground sm:inline-block">
              Planos
            </Link>
            <Link href="/entrar" className="rounded-sm px-1 py-1.5 font-medium text-sidebar-accent-foreground hover:underline underline-offset-4">
              Entrar
            </Link>
            <ThemeToggle />
          </nav>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-12 pb-20 sm:px-8 sm:pt-20 sm:pb-28">
          <h1 className="max-w-3xl text-[2.25rem] leading-[1.08] font-medium tracking-[-0.03em] text-sidebar-accent-foreground sm:text-[3.25rem]">
            Veja onde sua empresa ganha e onde perde dinheiro.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-sidebar-foreground">
            O SOLUS lê as planilhas de vendas e estoque que você já tem e mostra lucro, estoque parado e oportunidades. Cada número vem
            dos seus dados, nada é estimado.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className={PRIMARY}>
              Criar conta grátis
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/demo/visao-geral"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-sidebar-border px-5 text-[15px] font-medium text-sidebar-accent-foreground outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sidebar-ring/70"
            >
              Ver a demonstração
            </Link>
          </div>
          <p className="mt-4 text-sm text-sidebar-foreground">O plano Free não pede cartão. A demonstração usa uma empresa fictícia.</p>
        </div>
        <EclipseArt className="absolute -right-[38%] -bottom-[45%] z-0 w-[110%] max-w-[760px] text-sidebar-primary sm:-right-[12%] sm:-bottom-[60%] sm:w-[60%]" />
      </header>

      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 id="como-funciona" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">{index + 1}</span>
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
                <li key={module.title} className="flex gap-4 rounded-xl border border-border bg-card p-6">
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
              <li key={audience.title} className="rounded-xl border border-border bg-card p-6">
                <audience.icon aria-hidden="true" className="size-6 text-brand" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{audience.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{audience.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="seus-dados" className="border-y border-border bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-start md:gap-12">
            <ShieldCheck aria-hidden="true" className="size-8 shrink-0 text-brand" />
            <div>
              <h2 id="seus-dados" className="text-2xl font-semibold tracking-tight text-foreground">
                Seus dados continuam seus
              </h2>
              <ul className="mt-5 grid gap-3 text-[15px] leading-7 text-foreground sm:grid-cols-2">
                <li>Cada empresa vê só os próprios dados, separados no banco de dados.</li>
                <li>Você escolhe quem da equipe acessa e com qual papel.</li>
                <li>Desfazer uma importação apaga as linhas dela.</li>
                <li>
                  Tratamento conforme a LGPD. Leia a{' '}
                  <Link href="/privacidade" className="font-medium text-brand underline underline-offset-4">
                    política de privacidade
                  </Link>
                  .
                </li>
              </ul>
            </div>
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
