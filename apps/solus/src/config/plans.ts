/**
 * Plans of SOLUS. The limits are enforced by the database (migration
 * 20261113110000_plans.sql, function private.plan_limit); keep both in sync.
 * Changing a price here changes only what the pricing page shows.
 */

export type PlanId = 'free' | 'basic' | 'pro' | 'premium';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in BRL; 0 is free. */
  monthlyPrice: number;
  description: string;
  limits: {
    /** Members plus pending invitations. */
    members: number;
    /** Sales and stock rows kept in the organization. */
    rows: number;
    /** Questions and summaries asked to the AI analyst per day (Brasília time). */
    aiPerDay: number;
  };
  highlight?: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    description: 'Para conhecer o SOLUS com os dados de uma loja pequena.',
    limits: { members: 1, rows: 5_000, aiPerDay: 5 },
  },
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 49,
    description: 'Para quem acompanha lucro e estoque toda semana.',
    limits: { members: 3, rows: 50_000, aiPerDay: 30 },
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    description: 'Para equipes que decidem compras e preços com os dados.',
    limits: { members: 10, rows: 200_000, aiPerDay: 100 },
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 399,
    description: 'Para operações maiores, com mais pessoas e mais histórico.',
    limits: { members: 30, rows: 1_000_000, aiPerDay: 300 },
  },
];

/** Features every plan has; the plans differ only in the limits above. */
export const COMMON_FEATURES = [
  'Importação de planilhas CSV e Excel',
  'Lucratividade, estoque e oportunidades',
  'Analista de IA com cada número conferido nos seus dados',
  'Papéis de acesso (proprietário, administrador, analista, leitor)',
] as const;

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0]!;
}

export function formatPrice(value: number) {
  return value === 0 ? 'Grátis' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('pt-BR')} milhão${value >= 2_000_000 ? 'ões' : ''}`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('pt-BR')} mil`;
  return value.toLocaleString('pt-BR');
}
