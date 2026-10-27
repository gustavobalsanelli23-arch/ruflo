'use client';

import { ChevronRight, Radar } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HeroFigure } from '@/components/data/stat';
import { Panel } from '@/components/data/panel';
import { Segmented } from '@/components/data/segmented';
import { EmptyState } from '@/components/data/states';
import { OPPORTUNITY_CATEGORY, OPPORTUNITY_STATUS, PriorityMark, StatusBadge } from '@/components/data/status';
import type { Opportunity, OpportunityStatus } from '@/lib/data/types';
import { formatCurrency, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { impactShort } from './impact';
import { ConfidenceMeter, OpportunityDetail } from './opportunity-detail';
import { PriorityMap, monthlyEquivalent } from './opportunity-charts';

type View = 'open' | 'new' | 'progress' | 'closed';

const VIEW_FILTER: Record<View, (status: OpportunityStatus) => boolean> = {
  open: (s) => s !== 'done' && s !== 'dismissed',
  new: (s) => s === 'new',
  progress: (s) => s === 'reviewing' || s === 'in-progress',
  closed: (s) => s === 'done' || s === 'dismissed',
};

export function OpportunityCenter({
  opportunities,
  productNames,
}: {
  opportunities: Opportunity[];
  productNames: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get('id');
  const [view, setView] = useState<View>('open');
  // Demo only: status edits live in memory until the data layer exists.
  const [statuses, setStatuses] = useState<Record<string, OpportunityStatus>>(() =>
    Object.fromEntries(opportunities.map((op) => [op.id, op.status])),
  );

  const statusOf = (op: Opportunity) => statuses[op.id] ?? op.status;
  const open = opportunities.filter((op) => VIEW_FILTER.open(statusOf(op)));
  const visible = opportunities.filter((op) => VIEW_FILTER[view](statusOf(op)));
  const featured = open[0];
  const selected = opportunities.find((op) => op.id === selectedId) ?? null;
  const monthly = open.filter((op) => op.impactKind === 'monthly').reduce((sum, op) => sum + op.impact, 0);
  const oneOff = open.filter((op) => op.impactKind === 'one-off').reduce((sum, op) => sum + op.impact, 0);
  const maxImpact = Math.max(...opportunities.map(monthlyEquivalent));

  const counts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(VIEW_FILTER) as View[]).map((key) => [key, opportunities.filter((op) => VIEW_FILTER[key](statuses[op.id] ?? op.status)).length]),
      ) as Record<View, number>,
    [opportunities, statuses],
  );

  const select = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set('id', id);
    else next.delete('id');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const [pendingDismiss, setPendingDismiss] = useState<Opportunity | null>(null);

  const changeStatus = (op: Opportunity, status: OpportunityStatus, confirmed = false) => {
    if (status === 'dismissed' && !confirmed) {
      setPendingDismiss(op);
      return;
    }
    setStatuses((previous) => ({ ...previous, [op.id]: status }));
    toast.success(`Status alterado para ${OPPORTUNITY_STATUS[status].label.toLowerCase()}`, {
      description: 'Ambiente de demonstração: a alteração não é salva.',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section aria-label="Resumo das oportunidades" className="surface flex flex-col justify-between gap-6 rounded-xl p-5 xl:col-span-5">
          <HeroFigure
            label="Ganho mensal em aberto"
            value={formatCurrency(monthly, { whole: true })}
            footnote={`Mais ${formatCurrency(oneOff, { whole: true })} em ganhos pontuais, como estoque que volta a ser caixa.`}
          />
          <dl className="grid grid-cols-3 gap-4 border-t pt-4">
            <div>
              <dt className="text-xs text-muted-foreground">Em aberto</dt>
              <dd className="mt-0.5 text-xl font-semibold">{counts.open}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Novas</dt>
              <dd className="mt-0.5 text-xl font-semibold">{counts.new}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Concluídas</dt>
              <dd className="mt-0.5 text-xl font-semibold">{counts.closed}</dd>
            </div>
          </dl>
          {featured && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Comece por aqui</p>
              <p className="mt-1 text-base font-semibold leading-6 text-foreground">{featured.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{featured.summary}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <PriorityMark priority={featured.priority} />
                <Button size="sm" onClick={() => select(featured.id)}>
                  Ver evidências e plano
                </Button>
              </div>
            </div>
          )}
        </section>
        <Panel
          className="xl:col-span-7"
          title="Mapa de prioridade"
          description="Confiança da análise contra o ganho mensal equivalente. Ganhos pontuais entram divididos por 12."
        >
          <PriorityMap items={open} selectedId={selectedId} onSelect={select} />
        </Panel>
      </div>

      <Panel
        title="Todas as oportunidades"
        description="Ordenadas por prioridade e valor esperado. Selecione uma para ver evidências e plano."
        action={
          <Segmented
            value={view}
            onChange={setView}
            label="Filtrar oportunidades"
            options={[
              { value: 'open', label: 'Abertas', count: counts.open },
              { value: 'new', label: 'Novas', count: counts.new },
              { value: 'progress', label: 'Em andamento', count: counts.progress },
              { value: 'closed', label: 'Encerradas', count: counts.closed },
            ]}
          />
        }
        bodyClassName="px-2 pb-2"
      >
        {visible.length === 0 ? (
          <EmptyState icon={Radar} title="Nenhuma oportunidade nesta visão" description="Troque o filtro para ver as demais." />
        ) : (
          <ol className="flex flex-col">
            <AnimatePresence initial={false}>
              {visible.map((op) => {
                const rank = open.indexOf(op) + 1;
                const impact = impactShort(op);
                const status = statusOf(op);
                return (
                  <motion.li
                    key={op.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      type="button"
                      onClick={() => select(op.id)}
                      aria-haspopup="dialog"
                      className={cn(
                        'group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg px-3 py-3.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
                        'lg:grid-cols-[auto_minmax(0,1fr)_10rem_9rem_7rem_auto]',
                        op.id === selectedId && 'bg-accent',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-7 place-items-center rounded-md text-xs font-semibold tabular',
                          rank > 0 ? 'bg-brand-soft text-brand' : 'bg-neutral-soft text-muted-foreground',
                        )}
                        aria-label={rank > 0 ? `Posição ${rank}` : 'Encerrada'}
                      >
                        {rank > 0 ? rank : '–'}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-5 text-foreground">{op.title}</span>
                        <span className="mt-1 block truncate text-sm text-muted-foreground">{op.summary}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 lg:hidden">
                          <PriorityMark priority={op.priority} />
                          <StatusBadge spec={OPPORTUNITY_STATUS[status]} />
                        </span>
                      </span>
                      <span className="hidden lg:block">
                        <span className="block text-sm font-semibold tabular text-foreground">
                          {impact.value} <span className="text-xs font-normal text-subtle-foreground">{impact.suffix}</span>
                        </span>
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-neutral-soft" aria-hidden="true">
                          <span className="block h-full rounded-full bg-series-1" style={{ width: `${(monthlyEquivalent(op) / maxImpact) * 100}%` }} />
                        </span>
                        <span className="mt-1 block text-2xs text-subtle-foreground">{OPPORTUNITY_CATEGORY[op.category]}</span>
                      </span>
                      <span className="hidden flex-col gap-1.5 lg:flex">
                        <PriorityMark priority={op.priority} />
                        <ConfidenceMeter value={op.confidence} />
                      </span>
                      <span className="hidden lg:block">
                        <StatusBadge spec={OPPORTUNITY_STATUS[status]} />
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-right text-sm font-semibold tabular lg:hidden">{impact.value}</span>
                        <ChevronRight aria-hidden="true" className="size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        )}
        <p className="px-3 pt-2 pb-1 text-xs text-subtle-foreground">
          {pluralize(visible.length, 'oportunidade', 'oportunidades')} nesta visão. Impactos são estimativas com as premissas descritas em cada uma.
        </p>
      </Panel>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && select(null)}>
        <SheetContent className="w-full overflow-y-auto overscroll-contain sm:max-w-2xl" aria-describedby="op-summary">
          {selected && (
            <>
              <SheetHeader className="gap-2 border-b px-6 pt-6 pb-5">
                <p className="text-xs text-muted-foreground">{OPPORTUNITY_CATEGORY[selected.category]}</p>
                <SheetTitle className="pr-8 text-xl leading-7 font-semibold tracking-[-0.01em]">{selected.title}</SheetTitle>
                <SheetDescription id="op-summary" className="text-sm">
                  {selected.summary}
                </SheetDescription>
              </SheetHeader>
              <div className="px-6 pt-5 pb-8">
                <OpportunityDetail
                  opportunity={selected}
                  status={statusOf(selected)}
                  onStatusChange={(status) => changeStatus(selected, status)}
                  productNames={productNames}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={pendingDismiss !== null} onOpenChange={(open) => !open && setPendingDismiss(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Descartar esta oportunidade?</DialogTitle>
            <DialogDescription>
              {pendingDismiss?.title}. Ela sai da lista de abertas e do mapa de prioridade. Você pode reabri-la depois pelo filtro Encerradas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Manter aberta</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDismiss) changeStatus(pendingDismiss, 'dismissed', true);
                setPendingDismiss(null);
              }}
            >
              Descartar oportunidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
