import type { PublicAdmin } from '@/lib/auth/types';

/**
 * Registro de ações administrativas ("Admin 1 alterou o estoque da camisa X").
 *
 * Hoje fica no navegador (dados simulados). Ao conectar o banco, crie uma
 * implementação de `AdminActivityRepository` que grave no servidor — com o
 * autor vindo da SESSÃO no backend, nunca de um valor enviado pelo cliente.
 */

export type AdminActivityKind = 'auth' | 'produto' | 'estoque' | 'pedido' | 'configuracao';

export interface AdminActivity {
  id: string;
  adminId: string;
  adminName: string;
  kind: AdminActivityKind;
  message: string;
  at: string;
}

export interface AdminActivityRepository {
  list(limit?: number): AdminActivity[];
  add(entry: AdminActivity): void;
}

const KEY = 'futzone:admin-activity:v1';
const MAX = 200;

const read = (): AdminActivity[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as AdminActivity[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const localActivityRepository: AdminActivityRepository = {
  list(limit = MAX) {
    return read().slice(0, limit);
  },
  add(entry) {
    try {
      localStorage.setItem(KEY, JSON.stringify([entry, ...read()].slice(0, MAX)));
    } catch {
      /* armazenamento indisponível: o registro é apenas visual nesta etapa */
    }
  },
};

export function makeActivity(admin: PublicAdmin, kind: AdminActivityKind, message: string): AdminActivity {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
  return { id, adminId: admin.id, adminName: admin.name, kind, message, at: new Date().toISOString() };
}

/** Último acesso por administrador neste navegador (o anterior à sessão atual). */
const ACCESS_KEY = (id: string) => `futzone:admin-access:${id}`;

export function trackAccess(adminId: string, sessionStart: string): { previous: string | null; isNewSession: boolean } {
  try {
    const stored = JSON.parse(localStorage.getItem(ACCESS_KEY(adminId)) ?? 'null') as { current: string; previous: string | null } | null;
    if (stored?.current === sessionStart) return { previous: stored.previous, isNewSession: false };
    const previous = stored?.current ?? null;
    localStorage.setItem(ACCESS_KEY(adminId), JSON.stringify({ current: sessionStart, previous }));
    return { previous, isNewSession: true };
  } catch {
    return { previous: null, isNewSession: false };
  }
}
