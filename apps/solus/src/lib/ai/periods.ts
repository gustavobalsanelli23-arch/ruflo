import type { PeriodKey } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { addDays, daysBetween, PERIOD_OPTIONS, resolvePeriod } from '@/lib/period';
import type { DateRange, SourceContext } from './types';

/** Period input shared by the data tools. */
export type PeriodInput = { periodo: PeriodKey | 'personalizado'; inicio: string | null; fim: string | null };

export interface ResolvedPeriod {
  current: DateRange;
  previous: DateRange;
  days: number;
  label: string;
  granularity: 'day' | 'week' | 'month';
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUSTOM_DAYS = 731;

/**
 * Periods end on the last day with imported sales (as on the screens). A
 * custom period must fall inside the imported history and is compared with
 * the same number of days right before it.
 */
export function resolveRange(input: PeriodInput, context: SourceContext): ResolvedPeriod | { error: string } {
  const last = context.lastSale;
  if (!last || !context.firstSale) return { error: 'Não há vendas importadas: nenhum período disponível.' };

  if (input.periodo !== 'personalizado') {
    const period = resolvePeriod(input.periodo, last);
    return {
      current: { start: period.start, end: period.end },
      previous: { start: period.previousStart, end: period.previousEnd },
      days: daysBetween(period.start, period.end),
      label: `${PERIOD_OPTIONS.find((option) => option.key === input.periodo)?.label ?? ''} (${formatDate(period.start)} a ${formatDate(period.end)})`,
      granularity: period.granularity,
    };
  }

  const { inicio, fim } = input;
  if (!inicio || !fim || !ISO.test(inicio) || !ISO.test(fim) || Number.isNaN(Date.parse(inicio)) || Number.isNaN(Date.parse(fim))) {
    return { error: 'Período personalizado exige início e fim no formato AAAA-MM-DD.' };
  }
  if (inicio > fim) return { error: 'O início do período é depois do fim.' };
  if (fim < context.firstSale || inicio > last) {
    return { error: `Sem vendas nesse período. Os dados vão de ${context.firstSale} a ${last}.` };
  }
  const start = inicio < context.firstSale ? context.firstSale : inicio;
  const end = fim > last ? last : fim;
  const days = daysBetween(start, end);
  if (days > MAX_CUSTOM_DAYS) return { error: `Período longo demais: no máximo ${MAX_CUSTOM_DAYS} dias.` };
  const previousEnd = addDays(start, -1);
  return {
    current: { start, end },
    previous: { start: addDays(previousEnd, -(days - 1)), end: previousEnd },
    days,
    label: `${formatDate(start)} a ${formatDate(end)}`,
    granularity: days <= 31 ? 'day' : days <= 120 ? 'week' : 'month',
  };
}
