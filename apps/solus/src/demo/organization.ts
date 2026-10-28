/**
 * DEMONSTRATION DATA — fictitious organization, people and activity.
 * No real company, person or tax ID is represented here.
 */
import { PERMISSION_MATRIX } from '@/lib/auth/permissions';
import type { ActivityItem, Member, Organization, Permission, UserProfile } from '@/lib/data/types';

export const organization: Organization = {
  id: 'org-demo',
  name: 'Empório Lumen',
  legalName: 'Empório Lumen (organização de demonstração)',
  taxId: '00.000.000/0000-00',
  segment: 'Empório e mercearia fina',
  city: 'Campinas',
  state: 'SP',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  storeCount: 1,
  isDemo: true,
};

export const currentUser: UserProfile = {
  id: 'usr-helena',
  name: 'Helena Prado',
  email: 'helena@lumen.example',
  role: 'owner',
  initials: 'HP',
  jobTitle: 'Sócia-diretora',
};

export const members: Member[] = [
  { id: 'usr-helena', name: 'Helena Prado', email: 'helena@lumen.example', role: 'owner', status: 'active', lastActive: '2026-10-26T18:42:00-03:00' },
  { id: 'usr-rafael', name: 'Rafael Lins', email: 'rafael@lumen.example', role: 'admin', status: 'active', lastActive: '2026-10-26T16:05:00-03:00' },
  { id: 'usr-bianca', name: 'Bianca Moraes', email: 'bianca@lumen.example', role: 'analyst', status: 'active', lastActive: '2026-10-25T11:30:00-03:00' },
  { id: 'usr-otavio', name: 'Otávio Reis', email: 'otavio@lumen.example', role: 'viewer', status: 'active', lastActive: '2026-10-21T09:12:00-03:00' },
  { id: 'usr-lucia', name: 'Lúcia Fontes', email: 'lucia@lumen.example', role: 'analyst', status: 'invited', lastActive: null },
];

/** Same table as real organizations: the demo never advertises different rules. */
export const permissions: Permission[] = PERMISSION_MATRIX;

export const activity: ActivityItem[] = [
  { id: 'a1', kind: 'opportunity', title: 'Nova oportunidade de ruptura', detail: 'Café especial Mirante 250 g cobre menos de 3 dias.', at: '2026-10-26T07:10:00-03:00' },
  { id: 'a2', kind: 'import', title: 'Vendas de 25 out importadas', detail: '1.284 registros, nenhum erro.', at: '2026-10-26T06:02:00-03:00', actor: 'Importação automática' },
  { id: 'a3', kind: 'analysis', title: 'Análise salva no analista', detail: 'Por que a margem de frios caiu em setembro?', at: '2026-10-25T17:48:00-03:00', actor: 'Bianca Moraes' },
  { id: 'a4', kind: 'opportunity', title: 'Oportunidade em andamento', detail: 'Vinhos importados parados: kits de fim de ano.', at: '2026-10-24T15:20:00-03:00', actor: 'Rafael Lins' },
  { id: 'a5', kind: 'alert', title: 'Margem negativa detectada', detail: 'Azeite extravirgem português 500 ml abaixo do custo.', at: '2026-10-19T08:00:00-03:00' },
  { id: 'a6', kind: 'member', title: 'Convite enviado', detail: 'Lúcia Fontes foi convidada como analista.', at: '2026-10-18T10:31:00-03:00', actor: 'Helena Prado' },
];
