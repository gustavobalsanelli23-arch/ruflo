import { headers } from 'next/headers';
import { isAuthReady, readAuthConfig, toPublicAdmin } from '@/lib/auth/config';
import { verifyPassword } from '@/lib/auth/password';
import { createMemoryRateLimiter } from '@/lib/auth/rateLimit';
import { isSameOrigin, issueSessionToken, SESSION_COOKIE, SESSION_TTL_SEC, sessionCookieOptions } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const limiter = createMemoryRateLimiter();
// Hash fixo usado quando o e-mail não existe: o tempo de resposta fica igual
// e não revela quais e-mails são de administradores.
const DUMMY_HASH = 'pbkdf2-sha256:600000:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const GENERIC_ERROR = 'E-mail ou senha incorretos.';

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });

export async function POST(request: Request) {
  if (!(await isSameOrigin())) return json({ error: 'Origem não permitida.' }, 403);

  const config = readAuthConfig();
  if (!isAuthReady(config)) return json({ error: 'O acesso administrativo ainda não foi configurado.' }, 503);

  let email = '';
  let password = '';
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    password = typeof body.password === 'string' ? body.password.slice(0, 256) : '';
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }
  if (!email || !password) return json({ error: 'Informe e-mail e senha.' }, 400);

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || h.get('x-real-ip') || 'local';
  const keys = [`ip:${ip}`, `email:${email}`];
  const blocked = keys.map((k) => limiter.check(k)).find((r) => !r.allowed);
  if (blocked) {
    const minutes = Math.ceil(blocked.retryAfterSec / 60);
    return json({ error: `Muitas tentativas. Tente novamente em ${minutes} min.` }, 429, { 'Retry-After': String(blocked.retryAfterSec) });
  }

  const account = config.admins.find((a) => a.email === email);
  const valid = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !valid) {
    keys.forEach((k) => limiter.fail(k));
    return json({ error: GENERIC_ERROR }, 401);
  }

  keys.forEach((k) => limiter.reset(k));
  const { token } = await issueSessionToken(account.id);
  const res = json({ ok: true, admin: toPublicAdmin(account) });
  const opts = sessionCookieOptions(SESSION_TTL_SEC);
  res.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Strict${opts.secure ? '; Secure' : ''}`,
  );
  return res;
}
