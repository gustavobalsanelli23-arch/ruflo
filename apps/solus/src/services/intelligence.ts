import 'server-only';
import { runEngine } from '@/lib/intelligence/engine';
import { buildEngineInput, toSyncPayload, type MetricsReader } from '@/lib/intelligence/input';
import { ENGINE_VERSION } from '@/lib/intelligence/scoring';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SolusClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import { getAllInventory, getAllProducts, getCoverage, getInventoryTotals, getParameters, getTotals } from './analytics';

/**
 * Runs the Intelligence Engine for an organization:
 *   1. reads the metric layer with the user's session (RLS);
 *   2. applies the deterministic rules (src/lib/intelligence);
 *   3. writes the result with public.sync_opportunities, which only the
 *      secret key can execute. The caller must have checked that the user is
 *      analyst or above in this organization; the database checks again.
 */

export function supabaseMetricsReader(supabase: SolusClient, organizationId: string): MetricsReader {
  return {
    coverage: () => getCoverage(supabase, organizationId),
    parameters: () => getParameters(supabase, organizationId),
    totals: (window) => getTotals(supabase, organizationId, window),
    products: (window) => getAllProducts(supabase, organizationId, window),
    inventory: (asOf) => getAllInventory(supabase, organizationId, asOf),
    inventoryTotals: (asOf) => getInventoryTotals(supabase, organizationId, asOf),
  };
}

export type AnalysisOutcome =
  | { ok: true; detected: number; created: number; resolved: number; limitations: string[] }
  | { ok: false; reason: 'not_configured' | 'failed' };

export async function runAnalysis(args: {
  supabase: SolusClient;
  organizationId: string;
  actorId: string;
  trigger: 'import' | 'manual' | 'revert' | 'settings';
  importId?: string | null;
}): Promise<AnalysisOutcome> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, reason: 'not_configured' };
  try {
    const input = await buildEngineInput(supabaseMetricsReader(args.supabase, args.organizationId));
    const result = runEngine(input);
    const { data, error } = await admin.rpc('sync_opportunities', {
      p_organization_id: args.organizationId,
      p_actor: args.actorId,
      p_trigger: args.trigger,
      p_import_id: args.importId ?? null,
      p_engine_version: ENGINE_VERSION,
      p_period_start: input.window?.start ?? input.inventory?.asOf ?? null,
      p_period_end: input.window?.end ?? input.inventory?.asOf ?? null,
      p_limitations: result.limitations as Json,
      p_items: result.opportunities.map(toSyncPayload) as unknown as Json,
    });
    const run = data?.[0];
    if (error || !run) {
      logServerError('análise: gravar oportunidades', error);
      return { ok: false, reason: 'failed' };
    }
    return { ok: true, detected: Number(run.detected), created: Number(run.created), resolved: Number(run.resolved), limitations: result.limitations };
  } catch (error) {
    logServerError('análise: executar', error);
    return { ok: false, reason: 'failed' };
  }
}
