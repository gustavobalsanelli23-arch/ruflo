import { AppLink as Link } from '@/components/shell/base-path';
import { ArrowRight, CircleCheck, Hourglass, OctagonAlert, PackageX, type LucideIcon } from 'lucide-react';
import type { ProductStock } from '@/lib/data/types';
import { formatCurrency, formatDays, formatDecimal, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tone = 'critical' | 'warning' | 'positive';

const TONE: Record<Tone, { icon: string; chip: string; label: string }> = {
  critical: { icon: 'text-critical-text', chip: 'bg-critical-soft text-critical-text', label: 'Crítico' },
  warning: { icon: 'text-warning-text', chip: 'bg-warning-soft text-warning-text', label: 'Atenção' },
  positive: { icon: 'text-positive-text', chip: 'bg-positive-soft text-positive-text', label: 'Saudável' },
};

/**
 * One inventory signal: the status word and icon carry the tone (never the
 * figure's colour), the list names the items, the link filters the table.
 */
function Signal({
  tone,
  icon: Icon,
  title,
  figure,
  caption,
  items,
  filter,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  figure: string;
  caption: string;
  items: { name: string; detail: string }[];
  filter?: { id: string; label: string };
}) {
  const t = TONE[tone];
  const headingId = `sinal-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className="surface flex flex-col rounded-xl p-5">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className={cn('size-4', t.icon)} />
        <h2 id={headingId} className="text-sm font-medium text-foreground">
          {title}
        </h2>
        <span className={cn('ml-auto rounded-md px-1.5 py-0.5 text-2xs font-medium', t.chip)}>{t.label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-foreground">{figure}</p>
      <p className="text-sm text-muted-foreground">{caption}</p>
      <ul className="mt-4 flex flex-1 flex-col divide-y border-t text-sm">
        {items.map((item) => (
          <li key={item.name} className="py-2">
            <span className="block truncate text-foreground">{item.name}</span>
            <span className="block text-xs tabular text-muted-foreground">{item.detail}</span>
          </li>
        ))}
      </ul>
      {filter && (
        <Link
          href={`/estoque?filtro=${filter.id}#itens`}
          className="group/link mt-3 inline-flex w-fit items-center gap-1 rounded text-sm font-medium text-brand outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {filter.label}
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}

const FAST = new Set<ProductStock['status']>(['healthy', 'high-turnover', 'medium-turnover']);

export function InventorySignals({
  items,
  stalledDays = 60,
  lowTurnoverDays = 120,
}: {
  items: ProductStock[];
  /** Limits shown in the captions (the organization's analysis parameters). */
  stalledDays?: number;
  lowTurnoverDays?: number;
}) {
  const rupture = items
    .filter((s) => s.status === 'rupture-risk' || s.status === 'rupture')
    .sort((a, b) => (a.coverageDays ?? 0) - (b.coverageDays ?? 0));
  const stalled = items.filter((s) => s.status === 'stalled');
  const slow = items.filter((s) => s.status === 'low-turnover');
  const fastest = items
    .filter((s): s is ProductStock & { turnover: number } => FAST.has(s.status) && !s.perishable && s.turnover !== null)
    .sort((a, b) => b.turnover - a.turnover)
    .slice(0, 3);
  const sum = (list: ProductStock[]) => list.reduce((total, s) => total + s.stockValue, 0);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Signal
        tone="critical"
        icon={OctagonAlert}
        title="Risco de ruptura"
        figure={pluralize(rupture.length, 'item', 'itens')}
        caption="O estoque acaba antes da próxima entrega."
        items={rupture.map((s) => ({
          name: s.name,
          detail: s.status === 'rupture' ? `sem estoque, entrega em ${formatDays(s.leadTimeDays)}` : `cobre ${formatDays(s.coverageDays ?? 0)}, entrega em ${formatDays(s.leadTimeDays)}`,
        }))}
        filter={{ id: 'ruptura', label: 'Ver na tabela' }}
      />
      <Signal
        tone="warning"
        icon={PackageX}
        title="Produtos parados"
        figure={formatCurrency(sum(stalled), { whole: true })}
        caption={`${pluralize(stalled.length, 'item', 'itens')} sem nenhuma venda há ${formatDays(stalledDays)} ou mais.`}
        items={stalled.map((s) => ({
          name: s.name,
          detail: s.daysSinceLastSale === null ? 'sem venda no histórico importado' : `última venda há ${formatDays(s.daysSinceLastSale)}`,
        }))}
        filter={{ id: 'parados', label: 'Ver na tabela' }}
      />
      <Signal
        tone="warning"
        icon={Hourglass}
        title="Baixo giro"
        figure={formatCurrency(sum(slow), { whole: true })}
        caption={`${pluralize(slow.length, 'item', 'itens')} com estoque para mais de ${formatDays(lowTurnoverDays)}.`}
        items={slow.map((s) => ({ name: s.name, detail: `cobre ${formatDays(s.coverageDays ?? 0)}` }))}
        filter={{ id: 'baixo-giro', label: 'Ver na tabela' }}
      />
      <Signal
        tone="positive"
        icon={CircleCheck}
        title="Maior giro"
        figure={`${formatDecimal(fastest[0]?.turnover ?? 0)}× ao ano`}
        caption="Não perecíveis que mais renovam o estoque."
        items={fastest.map((s) => ({ name: s.name, detail: `gira ${formatDecimal(s.turnover)}× ao ano` }))}
      />
    </div>
  );
}
