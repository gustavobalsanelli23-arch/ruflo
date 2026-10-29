import type { Permission, Role } from '@/lib/data/types';

/**
 * What each role may do. This table drives the interface (which buttons
 * appear); the database enforces the same rules with RLS policies, column
 * privileges and the membership guard trigger. Keep both in sync: see
 * docs/papeis-e-permissoes.md.
 */

export const ROLES: readonly Role[] = ['owner', 'admin', 'analyst', 'viewer'];

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  analyst: 'Analista',
  viewer: 'Leitor',
};

const RANK: Record<Role, number> = { owner: 4, admin: 3, analyst: 2, viewer: 1 };

export function hasRole(role: Role, minimum: Role) {
  return RANK[role] >= RANK[minimum];
}

export type Capability =
  | 'view'
  | 'analyze'
  | 'import'
  | 'manageImports'
  | 'configureAnalysis'
  | 'export'
  | 'manageMembers'
  | 'manageAdmins'
  | 'updateOrganization'
  | 'deleteOrganization';

const CAPABILITIES: Record<Capability, { minimum: Role; label: string; description: string }> = {
  view: { minimum: 'viewer', label: 'Ver painéis e análises', description: 'Visão executiva, lucratividade, estoque e oportunidades.' },
  analyze: { minimum: 'analyst', label: 'Usar o analista e tratar oportunidades', description: 'Fazer perguntas sobre os dados e mudar o status das oportunidades.' },
  import: { minimum: 'analyst', label: 'Importar dados', description: 'Enviar planilhas, validar, gravar e desfazer as próprias importações.' },
  manageImports: {
    minimum: 'admin',
    label: 'Gerenciar todas as importações',
    description: 'Continuar, cancelar e desfazer importações de qualquer pessoa e removê-las do histórico.',
  },
  configureAnalysis: { minimum: 'admin', label: 'Ajustar os parâmetros de análise', description: 'Margem mínima, limites de estoque e de queda que definem as oportunidades.' },
  export: { minimum: 'admin', label: 'Exportar dados', description: 'Baixar tabelas e relatórios.' },
  manageMembers: { minimum: 'admin', label: 'Gerenciar analistas e leitores', description: 'Convidar, remover e alterar o papel de analistas e leitores.' },
  manageAdmins: { minimum: 'owner', label: 'Gerenciar administradores e proprietários', description: 'Convidar administradores e conceder ou retirar a propriedade.' },
  updateOrganization: { minimum: 'admin', label: 'Editar a organização', description: 'Nome e dados cadastrais.' },
  deleteOrganization: { minimum: 'owner', label: 'Excluir a organização', description: 'Remove a organização, os membros e os dados. Não pode ser desfeito.' },
};

export function can(role: Role, capability: Capability) {
  return hasRole(role, CAPABILITIES[capability].minimum);
}

/** The permission table shown in Settings (same data for demo and real). */
export const PERMISSION_MATRIX: Permission[] = (Object.keys(CAPABILITIES) as Capability[]).map((id) => ({
  id,
  label: CAPABILITIES[id].label,
  description: CAPABILITIES[id].description,
  roles: ROLES.filter((role) => can(role, id)),
}));

/** Roles `actor` may hand out in an invitation. Nobody invites an owner. */
export function invitableRoles(actor: Role): Role[] {
  if (actor === 'owner') return ['admin', 'analyst', 'viewer'];
  if (actor === 'admin') return ['analyst', 'viewer'];
  return [];
}

/**
 * Roles `actor` may set on a member who currently has `target`, or an empty
 * list when that member is out of reach. Mirrors private.guard_membership_change.
 */
export function assignableRoles(actor: Role, target: Role, isSelf: boolean): Role[] {
  if (actor === 'owner') return [...ROLES];
  if (actor === 'admin' && !isSelf && (target === 'analyst' || target === 'viewer')) return ['analyst', 'viewer'];
  return [];
}

/** Whether `actor` may remove a member with role `target` (leaving is separate). */
export function canRemoveMember(actor: Role, target: Role) {
  if (actor === 'owner') return true;
  return actor === 'admin' && (target === 'analyst' || target === 'viewer');
}
