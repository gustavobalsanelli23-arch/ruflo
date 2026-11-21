'use server';

import { z } from 'zod';
import { logServerError } from '@/lib/log';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** The signed-in person's choice about the weekly summary e-mail (on unless switched off). */
export async function getDigestPreferenceAction(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return true;
  const { data } = await supabase.auth.getUser();
  return data.user?.user_metadata?.weekly_digest !== false;
}

export async function setDigestPreferenceAction(enabled: unknown): Promise<{ ok: boolean }> {
  const parsed = z.boolean().safeParse(enabled);
  if (!parsed.success) return { ok: false };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };
  const { error } = await supabase.auth.updateUser({ data: { weekly_digest: parsed.data } });
  if (error) logServerError('resumo semanal: preferência', error);
  return { ok: !error };
}
