'use client';

import Link from 'next/link';
import { MessageSquareText, Radar, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Panel } from '@/components/data/panel';
import { Segmented } from '@/components/data/segmented';
import { Stat, StatStrip } from '@/components/data/stat';
import { EmptyState } from '@/components/data/states';
import { OPPORTUNITY_CATEGORY, OPPORTUNITY_STATUS, PRIORITY } from '@/components/data/status';
import type { Opportunity, OpportunityCategory, OpportunityStatus } from '@/lib/data/types';
import { formatCurrency, pluralize } from '@/lib/format';
import { useReturnFocus } from '@/lib/use-return-focus';
import { cn } from '@/lib/utils';
import { monthlyEquivalent } from './impact';
import { OpportunityCard } from './opportunity-card';
import { PriorityMap } from './opportunity-charts';
import { OpportunityDetail, OpportunityFacts } from './opportunity-detail';

type View = 'open' | 'new' | 'progress' | 'closed';
type Sort = 'priority' | 'impact' | 'confidence';
type TypeFilter = OpportunityCategory | 'all';

const VIEW_FILTER: Record<View, (status: OpportunityStatus) => boolean> = {
  open: (s) => s !== 'done' && s !== 'dismissed',
  new: (s) => s === 'new',
  progress: (s) => s === 'reviewing' || s === 'in-progress',
  closed: (s) => s === 'done' || s === 'dismissed',
};

const STATUS_ORDER: OpportunityStatus[] = ['new', 'reviewing', 'in-progress', 'done', 'dismissed'];
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

const SORTS: Record<Sort, { label: string; compare: (a: Opportunity, b: Opportunity) => number }> = {
  priority: {
    label: 'Prioridade',
    compare: (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || monthlyEquivalent(b) * b.confidence - monthlyEquivalent(a) * a.confidence,
  },
  impact: { label: 'Impacto estimado', compare: (a, b) => monthlyEquivalent(b) - monthlyEquivalent(a) },
  confidence: { label: 'Confiança', compare: (a, b) => b.confidence - a.confidence },
};

function TypeBreakdown({
  open,
  active,
  onSelect,
}: {
  open: Opportunity[];
  active: TypeFilter;
  onSelect: (type: TypeFilter) => void;
}) {
  const groups = (Object.keys(OPPORTUNITY_CATEGORY) as OpportunityCategory[])
    .map((type) => {
      const items = open.filter((op) => op.category === type);
      return { type, count: items.length, value: items.reduce((sum, op) => sum + monthlyEquivalent(op), 0) };
    })
    .filter((group) => group.count > 0)
    .sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...groups.map((g) => g.value));
  return (
    <ul className="-mx-2 flex flex-col">
      {groups.map((group) => {
        const pressed = active === group.type;
        return (
          <li key={group.type}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(pressed ? 'all' : group.type)}
              className={cn(
                'w-full rounded-lg px-2 py-2.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60',
                pressed && 'bg-accent',
              )}
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {OPPORTUNITY_CATEGORY[group.type]}
                  <span className="ml-2 text-xs font-normal text-subtle-foreground">{pluralize(group.count, 'oportunidade', 'oportunidades')}</span>
                </span>
                <span className="shrink-0 tabular text-foreground">
                  {formatCurrency(group.value, { whole: true })}
                  <span className="ml-1 text-xs text-subtle-foreground">/mês</span>
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-neutral-soft" aria-hidden="true">
                <span className={cn('block h-full rounded-full', pressed ? 'bg-brand' : 'bg-series-1')} style={{ width: `${(group.value / max) * 100}%` }} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<Sort>('priority');
  const [pendingDismiss, setPendingDismiss] = useState<Opportunity | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useReturnFocus();
  // Demo only: status edits live in memory until the data layer exists.
  const [statuses, setStatuses] = useState<Record<string, OpportunityStatus>>(() =>
    Object.fromEntries(opportunities.map((op) => [op.id, op.status])),
  );

  const statusOf = (op: Opportunity) => statuses[op.id] ?? op.status;
  const open = opportunities.filter((op) => VIEW_FILTER.open(statusOf(op)));
  const rankOf = (op: Opportunity) => {
    const index = open.indexOf(op);
    return index >= 0 ? index + 1 : null;
  };
  const visible = opportunities
    .filter((op) => VIEW_FILTER[view](statusOf(op)) && (type === 'all' || op.category === type))
    .sort(SORTS[sort].compare);
  const selected = opportunities.find((op) => op.id === selectedId) ?? null;

  const counts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(VIEW_FILTER) as View[]).map((key) => [key, opportunities.filter((op) => VIEW_FILTER[key](statuses[op.id] ?? op.status)).length]),
      ) as Record<View, number>,
    [opportunities, statuses],
  );

  const monthly = open.filter((op) => op.impactKind === 'monthly');
  const oneOff = open.filter((op) => op.impactKind === 'one-off');
  const done = opportunities.filter((op) => statusOf(op) === 'done');
  const sum = (list: Opportunity[]) => list.reduce((total, op) => total + op.impact, 0);

  const select = (id: string | null) => {
    if (id) returnFocus.capture();
    const next = new URLSearchParams(params.toString());
    if (id) next.set('id', id);
    else next.delete('id');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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

  const clearFilters = () => {
    setView('open');
    setType('all');
  };

  return (
    <div className="flex flex-col gap-6">
      <StatStrip label="Resumo das oportunidades" className="md:grid-cols-4">
        <Stat
          label="Ganho mensal estimado"
          value={
            <>
              {formatCurrency(sum(monthly), { whole: true })}
              <span className="ml-1 text-sm font-normal text-subtle-foreground">/mês</span>
            </>
          }
          hint={`Estimativa de ${pluralize(monthly.length, 'oportunidade aberta', 'oportunidades abertas')}`}
        />
        <Stat
          label="Ganhos pontuais estimados"
          value={formatCurrency(sum(oneOff), { whole: true })}
          hint={`Caixa liberado ou vendas protegidas, em ${oneOff.length}`}
        />
        <Stat label="Em aberto" value={counts.open} hint={`${counts.new} novas, ${counts.progress} em análise ou andamento`} />
        <Stat
          label="Concluídas"
          value={done.length}
          hint={
            done.length > 0
              ? `${formatCurrency(sum(done.filter((op) => op.impactKind === 'monthly')), { whole: true })} por mês estimados`
              : 'Nenhuma ainda'
          }
        />
      </StatStrip>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          title="Mapa de prioridade"
          description="Confiança da análise contra o ganho mensal equivalente (ganhos pontuais divididos por 12). Selecione um ponto para abrir a oportunidade."
        >
          <PriorityMap items={open} selectedId={selectedId} onSelect={select} />
        </Panel>
        <Panel
          className="xl:col-span-4"
          title="Por tipo"
          description="Valor mensal equivalente das oportunidades abertas. Selecione um tipo para filtrar a lista."
          footer={
            type !== 'all' ? (
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setType('all')}>
                <X aria-hidden="true" />
                Mostrar todos os tipos
              </Button>
            ) : (
              <p className="text-xs text-subtle-foreground">Valores estimados, não ganhos garantidos.</p>
            )
          }
        >
          <TypeBreakdown open={open} active={type} onSelect={setType} />
        </Panel>
      </div>

      <section aria-labelledby="lista-oportunidades" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="lista-oportunidades" className="text-base font-semibold text-foreground">
              Oportunidades
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
              {pluralize(visible.length, 'oportunidade', 'oportunidades')}
              {type !== 'all' && ` de ${OPPORTUNITY_CATEGORY[type].toLowerCase()}`}, ordenadas por {SORTS[sort].label.toLowerCase()}.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Segmented
              value={view}
              onChange={setView}
              label="Filtrar por status"
              className="max-w-full"
              options={[
                { value: 'open', label: 'Abertas', count: counts.open },
                { value: 'new', label: 'Novas', count: counts.new },
                { value: 'progress', label: 'Em andamento', count: counts.progress },
                { value: 'closed', label: 'Encerradas', count: counts.closed },
              ]}
            />
            <Select value={type} onValueChange={(value) => setType(value as TypeFilter)}>
              <SelectTrigger className="w-44 bg-card" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(Object.keys(OPPORTUNITY_CATEGORY) as OpportunityCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {OPPORTUNITY_CATEGORY[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
              <SelectTrigger className="w-48 bg-card" aria-label="Ordenar oportunidades">
                <span className="text-muted-foreground">Ordenar:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORTS) as Sort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORTS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="surface rounded-xl">
            <EmptyState
              icon={Radar}
              title="Nenhuma oportunidade com esses filtros"
              description="Troque o status ou o tipo para ver as demais oportunidades."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Ver todas as abertas
                </Button>
              }
            />
          </div>
        ) : (
          <ol className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((op) => (
                <motion.li
                  key={op.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <OpportunityCard
                    opportunity={op}
                    rank={rankOf(op)}
                    status={statusOf(op)}
                    selected={op.id === selectedId}
                    onOpen={() => select(op.id)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
        <p className="text-xs text-subtle-foreground">
          Impactos são estimativas calculadas com as premissas descritas em cada oportunidade, sobre dados de demonstração. Não são ganhos garantidos.
        </p>
      </section>

      <Sheet open={selected !== null} onOpenChange={(isOpen) => !isOpen && select(null)}>
        <SheetContent
          className="w-full gap-0 p-0 data-[side=right]:sm:max-w-2xl"
          aria-describedby="op-summary"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        >
          {selected && (
            <>
              <SheetHeader className="gap-3 border-b px-6 pt-6 pb-5">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {OPPORTUNITY_CATEGORY[selected.category]}
                  <span aria-hidden="true" className="h-3 w-px bg-border-strong" />
                  <span>Prioridade {PRIORITY[selected.priority].label.toLowerCase()}</span>
                </p>
                <SheetTitle ref={titleRef} tabIndex={-1} className="pr-8 text-xl leading-7 font-semibold tracking-[-0.015em] outline-none">
                  {selected.title}
                </SheetTitle>
                <SheetDescription id="op-summary" className="text-sm">
                  {selected.summary}
                </SheetDescription>
                <OpportunityFacts opportunity={selected} />
              </SheetHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
                <OpportunityDetail opportunity={selected} status={statusOf(selected)} productNames={productNames} />
              </div>
              <div className="flex flex-col gap-3 border-t bg-card/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="op-status" className="text-sm text-muted-foreground">
                    Status
                  </label>
                  <Select value={statusOf(selected)} onValueChange={(value) => changeStatus(selected, value as OpportunityStatus)}>
                    <SelectTrigger id="op-status" className="w-44 bg-card" aria-label="Status da oportunidade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((value) => (
                        <SelectItem key={value} value={value}>
                          {OPPORTUNITY_STATUS[value].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button asChild variant="outline">
                  <Link href={selected.relatedQuestionId ? `/analista?pergunta=${selected.relatedQuestionId}` : '/analista'}>
                    <MessageSquareText aria-hidden="true" />
                    {selected.relatedQuestionId ? 'Ver a análise completa no analista' : 'Perguntar ao analista'}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={pendingDismiss !== null} onOpenChange={(isOpen) => !isOpen && setPendingDismiss(null)}>
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
