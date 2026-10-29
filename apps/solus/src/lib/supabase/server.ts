import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/env';
import type { Database } from '@/types/database';
import { hardenCookie, SESSION_COOKIE_OPTIONS } from './cookies';

export type SolusClient = SupabaseClient<Database>;

/**
 * Supabase client bound to the signed-in user's cookies. Every query made
 * with it runs as that user, so Row Level Security applies. Returns null
 * when Supabase is not configured.
 */
export async function createSupabaseServerClient(): Promise<SolusClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  const store = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, hardenCookie(options));
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the
          // session on every request, so nothing is lost here.
        }
      },
    },
  });
}
