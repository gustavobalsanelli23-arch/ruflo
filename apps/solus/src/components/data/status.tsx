import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleHelp,
  CircleX,
  Clock,
  Gauge,
  Hourglass,
  Loader2,
  OctagonAlert,
  PackageOpen,
  PackageX,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
  ImportStatus,
  MarginBand,
  OpportunityCategory,
  OpportunityStatus,
  Priority,
  StockStatus,
} from '@/lib/data/types';
import { cn } from '@/lib/utils';

type BadgeVariant = 'neutral' | 'brand' | 'positive' | 'warning' | 'critical';

export interface StatusSpec {
  label: string;
  variant: BadgeVariant;
  icon: LucideIcon;
}

export const STOCK_STATUS: Record<StockStatus, StatusSpec> = {
  rupture: { label: 'Ruptura', variant: 'critical', icon: OctagonAlert },
  'rupture-risk': { label: 'Risco de ruptura', variant: 'critical', icon: OctagonAlert },
  stalled: { label: 'Parado', variant: 'warning', icon: PackageX },
  'low-turnover': { label: 'Baixo giro', variant: 'warning', icon: Hourglass },
  'medium-turnover': { label: 'Giro médio', variant: 'positive', icon: Gauge },
  'high-turnover': { label: 'Giro alto', variant: 'positive', icon: Zap },
  healthy: { label: 'Saudável', variant: 'positive', icon: CircleCheck },
  'no-stock': { label: 'Sem estoque e sem venda', variant: 'neutral', icon: PackageOpen },
  'insufficient-data': { label: 'Dados insuficientes', variant: 'neutral', icon: CircleHelp },
};

export const MARGIN_BAND: Record<MarginBand, StatusSpec> = {
  negative: { label: 'Negativa', variant: 'critical', icon: OctagonAlert },
  low: { label: 'Baixa', variant: 'warning', icon: TriangleAlert },
  healthy: { label: 'Saudável', variant: 'positive', icon: CircleCheck },
  unknown: { label: 'Sem custo', variant: 'neutral', icon: CircleHelp },
};

export const IMPORT_STATUS: Record<ImportStatus, StatusSpec> = {
  completed: { label: 'Concluída', variant: 'positive', icon: CircleCheck },
  processing: { label: 'Processando', variant: 'brand', icon: Loader2 },
  'with-errors': { label: 'Com erros', variant: 'warning', icon: TriangleAlert },
  failed: { label: 'Falhou', variant: 'critical', icon: CircleX },
};

export const OPPORTUNITY_STATUS: Record<OpportunityStatus, StatusSpec> = {
  new: { label: 'Nova', variant: 'brand', icon: CircleDot },
  reviewing: { label: 'Em análise', variant: 'neutral', icon: Clock },
  'in-progress': { label: 'Em andamento', variant: 'warning', icon: CircleDashed },
  done: { label: 'Concluída', variant: 'positive', icon: CircleCheck },
  dismissed: { label: 'Descartada', variant: 'neutral', icon: CircleX },
};

export const PRIORITY: Record<Priority, { label: string; bars: number; className: string }> = {
  critical: { label: 'Crítica', bars: 4, className: 'text-critical-text' },
  high: { label: 'Alta', bars: 3, className: 'text-critical-text' },
  medium: { label: 'Média', bars: 2, className: 'text-warning-text' },
  low: { label: 'Baixa', bars: 1, className: 'text-muted-foreground' },
};

export const PRIORITY_WEIGHT: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export const OPPORTUNITY_CATEGORY: Record<OpportunityCategory, string> = {
  pricing: 'Precificação',
  purchasing: 'Compras',
  inventory: 'Estoque',
  rupture: 'Ruptura',
  mix: 'Mix de produtos',
  performance: 'Desempenho',
};

export function StatusBadge({ spec, className }: { spec: StatusSpec; className?: string }) {
  const spin = spec.icon === Loader2;
  return (
    <Badge variant={spec.variant} className={className}>
      <spec.icon aria-hidden="true" className={cn(spin && 'animate-spin')} />
      {spec.label}
    </Badge>
  );
}

/** Priority as a four-step signal plus its word, readable without colour. */
export function PriorityMark({ priority, short = false, className }: { priority: Priority; short?: boolean; className?: string }) {
  const spec = PRIORITY[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', spec.className, className)}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn('w-[3px] rounded-[1px]', step <= spec.bars ? 'bg-current' : 'bg-current opacity-20')}
            style={{ height: 3 + step * 2.5 }}
          />
        ))}
      </span>
      {short ? spec.label : `Prioridade ${spec.label.toLowerCase()}`}
    </span>
  );
}
