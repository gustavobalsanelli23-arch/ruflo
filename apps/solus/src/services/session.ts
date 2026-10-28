import 'server-only';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * The signed-in user for this request, or null. Identity comes from
 * getClaims(), which verifies the JWT (signature and expiry) instead of
 * trusting the cookie's contents. Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || claims.role !== 'authenticated') return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
});
