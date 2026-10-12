'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IntegrationStatus, ReviewItem, SyncChange, SyncRun, TeamMapRow } from '@/types/supplier';

/** Dados e ações da tela "Integração com fornecedor" (tudo via API do painel). */

export interface SupplierOverview {
  database: boolean;
  message?: string;
  error?: string;
  status?: IntegrationStatus;
  runs?: SyncRun[];
  review?: ReviewItem[];
  pendingChanges?: SyncChange[];
  teams?: TeamMapRow[];
}

export interface ActionResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export async function supplierRequest(url: string, method: 'GET' | 'POST' | 'PUT', payload?: unknown): Promise<ActionResult> {
  try {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: 'Sem conexão com o servidor.' } };
  }
}

export function useSupplierOverview() {
  const [data, setData] = useState<SupplierOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const r = await supplierRequest('/api/admin/fornecedor', 'GET');
    setData(r.ok || r.status === 503 ? (r.body as unknown as SupplierOverview) : { database: true, error: (r.body.error as string) ?? 'Não foi possível carregar a integração.' });
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload };
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
export const formatWhen = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : 'Nunca');

const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
/** Formato curto para os indicadores ("11/10, 14:20"). */
export const formatWhenShort = (iso: string | null | undefined) => (iso ? shortFmt.format(new Date(iso)) : 'Nunca');
