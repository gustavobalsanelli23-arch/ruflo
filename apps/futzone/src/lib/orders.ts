import type { OrderStatus } from '@/types/commerce';
import type { BadgeTone } from '@/components/ui/Badge';

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone; color: string }> = {
  pendente: { label: 'Pendente', tone: 'warn', color: 'var(--color-warn)' },
  preparacao: { label: 'Processando', tone: 'brand', color: 'var(--color-brand-400)' },
  enviado: { label: 'Enviado', tone: 'violet', color: 'var(--color-violet)' },
  entregue: { label: 'Concluído', tone: 'success', color: 'var(--color-success)' },
  cancelado: { label: 'Cancelado', tone: 'danger', color: 'var(--color-danger)' },
};
