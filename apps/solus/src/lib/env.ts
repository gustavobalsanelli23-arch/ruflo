import { z } from 'zod';

/**
 * Runtime configuration. Only names are documented in .env.example; values
 * live in the environment (Vercel project settings or a local .env.local).
 *
 * Every Supabase call runs on the server, so none of these variables uses the
 * NEXT_PUBLIC_ prefix: they are read at runtime and never inlined into a
 * browser bundle. The URL and publishable key are not secret (RLS protects
 * the data); the secret key is read only in src/lib/supabase/admin.ts.
 * The legacy names set by the Vercel ↔ Supabase integration
 * (SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) are accepted as fallbacks.
 */

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const supabaseSchema = z.object({
  url: z
    .url()
    .refine((value) => {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname));
    }, 'precisa usar https (http só em localhost)')
    .transform((value) => value.replace(/\/+$/, '')),
  publishableKey: z.string().min(20, 'parece incompleta'),
});

let reported = false;

/**
 * Returns the Supabase connection settings, or null when they are absent or
 * malformed. Never throws: the demo must keep working without a backend.
 */
export function getSupabaseConfig(): SupabasePublicConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url && !publishableKey) return null;

  const parsed = supabaseSchema.safeParse({ url, publishableKey });
  if (!parsed.success) {
    if (!reported) {
      reported = true;
      const fields = parsed.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`).join('; ');
      console.error(`[solus] Configuração do Supabase inválida (${fields}). Autenticação desativada.`);
    }
    return null;
  }
  return parsed.data;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

/**
 * Absolute origin used in links sent by e-mail (confirmation, recovery,
 * invitations). Never derived from the request's Host header, which a client
 * controls.
 */
export function getSiteUrl() {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit && z.url().safeParse(explicit).success) return explicit.replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
