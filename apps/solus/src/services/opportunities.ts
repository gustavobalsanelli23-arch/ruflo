import 'server-only';
import type { Opportunity } from '@/lib/data/types';
import { logServerError } from '@/lib/log';
import type { SolusClient } from '@/lib/supabase/server';
import { toOpportunity, type StoredEvent } from '@/modules/opportunities/mapping';
import type { AnalysisRunRow } from '@/types/database-analytics';

/** Stored opportunities of the active organization, read through RLS. */

const LIMIT = 500;

export async function listOpportunities(supabase: SolusClient, organizationId: string): Promise<{ items: Opportunity[]; names: Record<string, string> }> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_detected_at', { ascending: false })
    .limit(LIMIT);
  if (error) {
    logServerError('oportunidades: listar', error);
    throw new Error('Não foi possível carregar as oportunidades.');
  }

  const ids = data.map((row) => row.id);
  const events = new Map<string, StoredEvent[]>();
  if (ids.length > 0) {
    const history = await supabase
      .from('opportunity_events')
      .select('opportunity_id, event, to_status, note, created_at, actor:profiles(full_name, email)')
      .eq('organization_id', organizationId)
      .in('opportunity_id', ids)
      .order('created_at')
      .limit(5000);
    if (history.error) logServerError('oportunidades: histórico', history.error);
    for (const event of history.data ?? []) {
      const list = events.get(event.opportunity_id) ?? [];
      list.push({
        opportunity_id: event.opportunity_id,
        event: event.event,
        to_status: event.to_status,
        note: event.note,
        created_at: event.created_at,
        actor: event.actor ? (event.actor.full_name ?? event.actor.email ?? null) : null,
      });
      events.set(event.opportunity_id, list);
    }
  }

  const names: Record<string, string> = {};
  for (const row of data) if (row.entity_id) names[row.entity_id] = row.entity_label;
  return { items: data.map((row) => toOpportunity(row, events.get(row.id))), names };
}

export async function lastAnalysisRun(supabase: SolusClient, organizationId: string): Promise<AnalysisRunRow | null> {
  const { data, error } = await supabase
    .from('analysis_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) logServerError('análise: última execução', error);
  return data ?? null;
}
