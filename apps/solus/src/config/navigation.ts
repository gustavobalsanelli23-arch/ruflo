import {
  Boxes,
  CircleGauge,
  Coins,
  Database,
  MessageSquareText,
  Radar,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type ModuleId = 'overview' | 'profit' | 'inventory' | 'opportunities' | 'analyst' | 'data' | 'settings';

export interface NavItem {
  id: ModuleId;
  href: string;
  /** Label shown in navigation. Product module names live in `module`. */
  label: string;
  short: string;
  module: string;
  description: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const item = (value: NavItem) => value;

export const NAV_ITEMS = {
  overview: item({
    id: 'overview',
    href: '/visao-geral',
    label: 'Visão executiva',
    short: 'Visão',
    module: 'Executive Overview',
    description: 'Situação da empresa no período, em uma tela.',
    icon: CircleGauge,
  }),
  profit: item({
    id: 'profit',
    href: '/lucratividade',
    label: 'Lucratividade',
    short: 'Lucro',
    module: 'Profit Analytics',
    description: 'Margem por produto, categoria e fornecedor.',
    icon: Coins,
  }),
  inventory: item({
    id: 'inventory',
    href: '/estoque',
    label: 'Estoque',
    short: 'Estoque',
    module: 'Inventory Intelligence',
    description: 'Giro, cobertura, ruptura e capital parado.',
    icon: Boxes,
  }),
  opportunities: item({
    id: 'opportunities',
    href: '/oportunidades',
    label: 'Oportunidades',
    short: 'Oport.',
    module: 'Opportunity Center',
    description: 'Ganhos encontrados nos dados, por impacto.',
    icon: Radar,
  }),
  analyst: item({
    id: 'analyst',
    href: '/analista',
    label: 'Analista',
    short: 'Analista',
    module: 'AI Analyst',
    description: 'Perguntas sobre os dados, com fontes.',
    icon: MessageSquareText,
  }),
  data: item({
    id: 'data',
    href: '/dados',
    label: 'Dados',
    short: 'Dados',
    module: 'Data Hub',
    description: 'Importações, mapeamento e validação.',
    icon: Database,
  }),
  settings: item({
    id: 'settings',
    href: '/configuracoes',
    label: 'Configurações',
    short: 'Ajustes',
    module: 'Settings',
    description: 'Organização, membros e preferências.',
    icon: Settings,
  }),
} satisfies Record<ModuleId, NavItem>;

export const NAV_GROUPS: NavGroup[] = [
  { id: 'analysis', label: 'Análise', items: [NAV_ITEMS.overview, NAV_ITEMS.profit, NAV_ITEMS.inventory] },
  { id: 'intelligence', label: 'Inteligência', items: [NAV_ITEMS.opportunities, NAV_ITEMS.analyst] },
  { id: 'data', label: 'Dados', items: [NAV_ITEMS.data] },
];

/** Bottom bar on phones: the five destinations used daily. */
export const MOBILE_TABS: NavItem[] = [
  NAV_ITEMS.overview,
  NAV_ITEMS.profit,
  NAV_ITEMS.inventory,
  NAV_ITEMS.opportunities,
  NAV_ITEMS.analyst,
];

export function moduleForPath(pathname: string): NavItem | undefined {
  return Object.values(NAV_ITEMS).find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
}
