import { CircleCheck, Hourglass, OctagonAlert, PackageX, type LucideIcon } from 'lucide-react';
import type { ProductStock } from '@/lib/data/types';
import { formatCurrency, formatDays, formatDecimal } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tone = 'critical' | 'warning' | 'positive';

const TONE: Record<Tone, { icon: string; rule: string; label: string }> = {
  critical: { icon: 'text-critical-text', rule: 'bg-critical', label: 'Crítico' },
  warning: { icon: 'text-warning-text', rule: 'bg-warning', label: 'Atenção' },
  positive: { icon: 'text-positive-text', rule: 'bg-positive', label: 'Positivo' },
};

function Signal({
  tone,
  icon: Icon,
  title,
  figure,
  caption,
  items,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  figure: string;
  caption: string;
  items: { name: string; detail: string }[];
}) {
  const t = TONE[tone];
  return (
    <section aria-label={`${t.label}: ${title}`} className="surface relative flex flex-col overflow-hidden rounded-xl p-5">
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-0.5', t.rule)} />
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className={cn('size-4', t.icon)} />
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className={cn('ml-auto text-2xs font-medium', t.icon)}>{t.label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-foreground">{figure}</p>
      <p className="text-sm text-muted-foreground">{caption}</p>
      <ul className="mt-4 flex flex-col divide-y border-t text-sm">
        {items.map((item) => (
          <li key={item.name} className="py-2">
            <span className="block truncate text-foreground">{item.name}</span>
            <span className="block text-xs tabular text-muted-foreground">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InventorySignals({ items }: { items: ProductStock[] }) {
  const rupture = items.filter((s) => s.status === 'rupture-risk');
  const stalled = items.filter((s) => s.status === 'stalled');
  const slow = items.filter((s) => s.status === 'low-turnover');
  const fastest = [...items].filter((s) => s.status === 'healthy' && !s.perishable).sort((a, b) => b.turnover - a.turnover).slice(0, 4);
  const sum = (list: ProductStock[]) => list.reduce((total, s) => total + s.stockValue, 0);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Signal
        tone="critical"
        icon={OctagonAlert}
        title="Risco de ruptura"
        figure={`${rupture.length} itens`}
        caption="Estoque acaba antes da próxima entrega."
        items={rupture.map((s) => ({
          name: s.name,
          detail: `cobre ${formatDays(s.coverageDays ?? 0)}, prazo ${formatDays(s.leadTimeDays)}`,
        }))}
      />
      <Signal
        tone="warning"
        icon={PackageX}
        title="Produtos parados"
        figure={formatCurrency(sum(stalled), { whole: true })}
        caption="Sem nenhuma venda há mais de 60 dias."
        items={stalled.map((s) => ({ name: s.name, detail: `há ${formatDays(s.daysSinceLastSale)}` }))}
      />
      <Signal
        tone="warning"
        icon={Hourglass}
        title="Baixo giro"
        figure={formatCurrency(sum(slow), { whole: true })}
        caption="Estoque para mais de 4 meses de venda."
        items={slow.map((s) => ({ name: s.name, detail: formatDays(s.coverageDays ?? 0) }))}
      />
      <Signal
        tone="positive"
        icon={CircleCheck}
        title="Maior giro"
        figure={`${formatDecimal(fastest[0]?.turnover ?? 0)}× ao ano`}
        caption="Não perecíveis que mais renovam o estoque."
        items={fastest.map((s) => ({ name: s.name, detail: `${formatDecimal(s.turnover)}×` }))}
      />
    </div>
  );
}
