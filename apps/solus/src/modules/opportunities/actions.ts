'use server';

import { revalidatePath } from 'next/cache';
import { logServerError } from '@/lib/log';
import { mapDatabaseError, type MappedError } from '@/lib/supabase/errors';
import { analysisSettingsSchema, opportunityStatusSchema } from '@/schemas/imports';
import { fieldErrors } from '@/schemas/auth';
import { runAnalysis } from '@/services/intelligence';
import { authorize } from '@/services/workspace';
import type { FormState } from '@/modules/auth/form-state';
import { toDbStatus } from './mapping';

/**
 * Opportunity Server Actions. The engine's output is written only by the
 * server (public.sync_opportunities, secret key); people change the status
 * (analyst or above) and owners/admins tune the analysis parameters.
 */

type Result = { ok: true; message: string } | { ok: false; error: MappedError };

const NO_SECRET: MappedError = {
  code: 'unavailable',
  message: 'A análise automática precisa da chave secreta do Supabase configurada no servidor (SUPABASE_SECRET_KEY).',
};

export async function setOpportunityStatusAction(input: unknown): Promise<Result> {
  const parsed = opportunityStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: { code: 'validation', message: 'Escolha um status válido.' } };
  const auth = await authorize('analyst');
  if (!auth.ok) return auth;
  const { error } = await auth.supabase.rpc('set_opportunity_status', {
    p_opportunity_id: parsed.data.opportunityId,
    p_status: toDbStatus(parsed.data.status),
    p_note: parsed.data.note || null,
  });
  if (error) {
    const mapped = mapDatabaseError(error);
    if (mapped.code === 'unknown') logServerError('oportunidade: status', error);
    return { ok: false, error: mapped };
  }
  revalidatePath('/oportunidades');
  revalidatePath('/visao-geral');
  return { ok: true, message: 'Status atualizado.' };
}

export async function runAnalysisAction(): Promise<Result> {
  const auth = await authorize('analyst');
  if (!auth.ok) return auth;
  const outcome = await runAnalysis({
    supabase: auth.supabase,
    organizationId: auth.workspace.active.organizationId,
    actorId: auth.workspace.user.id,
    trigger: 'manual',
  });
  if (!outcome.ok) {
    return { ok: false, error: outcome.reason === 'not_configured' ? NO_SECRET : { code: 'unknown', message: 'A análise não terminou. Tente de novo em instantes.' } };
  }
  revalidatePath('/', 'layout');
  return {
    ok: true,
    message:
      outcome.detected === 0
        ? 'Análise concluída: nenhuma oportunidade com evidência suficiente.'
        : `Análise concluída: ${outcome.detected} oportunidades detectadas (${outcome.created} novas, ${outcome.resolved} resolvidas).`,
  };
}

/** Analysis parameters (owner/admin). Percentages arrive as 0–100 and are stored as ratios. */
export async function saveAnalysisSettingsAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  const parsed = analysisSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', message: 'Revise os campos destacados.', fieldErrors: fieldErrors(parsed.error), values: raw };
  }
  const auth = await authorize('admin');
  if (!auth.ok) return { status: 'error', code: auth.error.code, message: auth.error.message, values: raw };

  const settings = {
    ...parsed.data,
    min_margin: parsed.data.min_margin / 100,
    max_discount_rate: parsed.data.max_discount_rate / 100,
    drop_threshold: parsed.data.drop_threshold / 100,
  };
  const { error } = await auth.supabase.rpc('save_analysis_settings', { p_organization_id: auth.workspace.active.organizationId, p_settings: settings });
  if (error) {
    const mapped = mapDatabaseError(error);
    if (mapped.code === 'unknown') logServerError('análises: parâmetros', error);
    return { status: 'error', code: mapped.code, message: mapped.message, values: raw };
  }

  const outcome = await runAnalysis({
    supabase: auth.supabase,
    organizationId: auth.workspace.active.organizationId,
    actorId: auth.workspace.user.id,
    trigger: 'settings',
  });
  revalidatePath('/', 'layout');
  return {
    status: 'success',
    message: outcome.ok ? 'Parâmetros salvos e oportunidades recalculadas.' : 'Parâmetros salvos. As oportunidades serão recalculadas na próxima análise.',
  };
}
