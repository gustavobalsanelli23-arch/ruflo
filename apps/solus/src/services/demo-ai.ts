import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDemoAiCode } from '@/lib/ai/config';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { clientIp, consumeRateLimits, fingerprint, type RateRule } from './rate-limit';

/**
 * Access to the analyst inside /demo. The demonstration is public, so the
 * analyst there is off unless SOLUS_DEMO_AI=on and an access code is set;
 * visitors unlock it with the code (an HttpOnly cookie keeps it unlocked).
 * Usage is limited per IP and per day: in PostgreSQL when the secret key is
 * configured (shared by every instance), otherwise in this instance's memory.
 */

export const DEMO_AI_COOKIE = 'solus-demo-ia';

const tokenFor = (code: string) => createHash('sha256').update(`solus-demo-ai:${code}`).digest('hex');

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function demoAiEnabled() {
  return getDemoAiCode() !== null;
}

export async function demoAiUnlocked() {
  const code = getDemoAiCode();
  if (!code) return false;
  const value = (await cookies()).get(DEMO_AI_COOKIE)?.value;
  return Boolean(value && equal(value, tokenFor(code)));
}

export function checkDemoCode(candidate: string) {
  const code = getDemoAiCode();
  return Boolean(code && equal(tokenFor(candidate.trim()), tokenFor(code)));
}

export async function unlockDemoAi() {
  const code = getDemoAiCode();
  if (!code) return;
  (await cookies()).set(DEMO_AI_COOKIE, tokenFor(code), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

/* ---------- limites ---------- */

const memory = new Map<string, { count: number; resetAt: number }>();

function hitMemory(rule: RateRule): boolean {
  const now = Date.now();
  const entry = memory.get(rule.bucket);
  if (!entry || entry.resetAt <= now) {
    memory.set(rule.bucket, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    if (memory.size > 5000) for (const [key, value] of memory) if (value.resetAt <= now) memory.delete(key);
    return true;
  }
  entry.count += 1;
  return entry.count <= rule.limit;
}

async function allow(rules: RateRule[]): Promise<boolean> {
  if (createSupabaseAdminClient()) return (await consumeRateLimits(rules)) === 'allowed';
  return rules.every(hitMemory);
}

export async function allowDemoQuestion() {
  const ip = fingerprint(await clientIp());
  return allow([
    { bucket: `demo-ai:ip:${ip}`, limit: 12, windowSeconds: 3600 },
    { bucket: 'demo-ai:day', limit: 150, windowSeconds: 86_400 },
  ]);
}

export async function allowDemoUnlock() {
  const ip = fingerprint(await clientIp());
  return allow([{ bucket: `demo-ai:unlock:${ip}`, limit: 5, windowSeconds: 900 }]);
}
