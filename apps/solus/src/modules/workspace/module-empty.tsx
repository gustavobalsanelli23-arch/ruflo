import Link from 'next/link';
import { ArrowUpRight, Boxes, Coins, MessageSquareText, Radar, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * What an analytical module shows before the organization has data. It says
 * what is missing, what the screen will show once it arrives, and offers the
 * demonstration (clearly fictitious) to see it working. No figure is invented.
 */

type ModuleKey = 'profit' | 'inventory' | 'opportunities' | 'analyst';

const MODULES: Record<ModuleKey, { icon: LucideIcon; title: string; body: string; shows: string[]; demo: string }> = {
  profit: {
    icon: Coins,
    title: 'Ainda não há vendas e custos para analisar',
    body: 'A lucratividade é calculada a partir das vendas e do custo de cada produto da sua empresa.',
    shows: ['Margem por produto, categoria e fornecedor', 'Itens vendidos abaixo do custo', 'Evolução da margem no período'],
    demo: '/demo/lucratividade',
  },
  inventory: {
    icon: Boxes,
    title: 'Ainda não há posição de estoque',
    body: 'A inteligência de estoque cruza a posição atual com o ritmo de vendas de cada item.',
    shows: ['Cobertura em dias por produto', 'Risco de ruptura e itens parados', 'Capital empatado por categoria'],
    demo: '/demo/estoque',
  },
  opportunities: {
    icon: Radar,
    title: 'Nenhuma oportunidade por enquanto',
    body: 'Oportunidades são encontradas nos dados da sua empresa, cada uma com a evidência que a sustenta e o impacto estimado.',
    shows: ['Preços abaixo do custo e reajustes de fornecedor', 'Rupturas próximas e estoque parado', 'Fatos separados de estimativas'],
    demo: '/demo/oportunidades',
  },
  analyst: {
    icon: MessageSquareText,
    title: 'O analista precisa dos seus dados para responder',
    body: 'As respostas citam os números da sua empresa e separam fatos de hipóteses. Sem dados, não há o que afirmar com segurança.',
    shows: ['Perguntas em linguagem natural sobre vendas, margem e estoque', 'Tabelas e fontes em cada resposta', 'Recomendações com o que fazer a seguir'],
    demo: '/demo/analista',
  },
};

export function ModuleEmpty({ module }: { module: ModuleKey }) {
  const spec = MODULES[module];
  return (
    <section aria-labelledby="vazio-titulo" className="surface rounded-xl px-6 py-8 sm:px-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <div className="max-w-xl">
          <spec.icon aria-hidden="true" className="size-6 text-brand" strokeWidth={1.5} />
          <h2 id="vazio-titulo" className="mt-4 text-xl font-semibold tracking-[-0.015em] text-foreground">
            {spec.title}
          </h2>
          <p className="mt-2 text-base text-muted-foreground">{spec.body}</p>
          <p className="mt-2 text-base text-muted-foreground">
            A importação de planilhas e o processamento dos dados chegam na próxima etapa da SOLUS.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dados">Ver a área de dados</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={spec.demo}>
                Ver o exemplo na demonstração
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <h3 className="text-sm font-medium text-foreground">Com dados, esta tela mostra</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {spec.shows.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
