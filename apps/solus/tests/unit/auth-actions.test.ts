import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Server Actions of the authentication flow, with Supabase replaced by a
 * recorder. These prove the application's own decisions (validation, rate
 * limits, messages, redirects, cookies); Supabase Auth itself is exercised
 * against a real project by playwright.real.config.ts.
 */

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
};
const state = vi.hoisted(() => ({
  configured: true,
  limit: 'allowed' as 'allowed' | 'limited' | 'unavailable',
  user: null as { id: string; email: string } | null,
  recoveryGrant: false,
}));
const limits = vi.fn();
const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => (state.configured ? { auth } : null) }));
vi.mock('@/services/rate-limit', () => ({
  clientIp: async () => '203.0.113.7',
  fingerprint: (value: string) => `fp(${value})`,
  consumeRateLimits: async (rules: unknown) => {
    limits(rules);
    return state.limit;
  },
}));
vi.mock('@/services/session', () => ({ getSessionUser: async () => state.user }));
vi.mock('@/services/recovery', () => ({
  RECOVERY_COOKIE: 'solus-recuperacao',
  RECOVERY_WINDOW_SECONDS: 900,
  hasRecoveryGrant: async () => state.recoveryGrant,
}));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore, headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

const {
  changePasswordAction,
  confirmEmailLinkAction,
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signOutAction,
  signUpAction,
} = await import('@/modules/auth/actions');

const IDLE = { status: 'idle' } as const;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const redirectOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  return null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('SITE_URL', 'https://app.solus.example');
  Object.assign(state, { configured: true, limit: 'allowed', user: null, recoveryGrant: false });
  for (const fn of Object.values(auth)) fn.mockResolvedValue({ data: {}, error: null });
});

describe('entrar', () => {
  it('valida antes de qualquer chamada externa', async () => {
    const result = await signInAction(IDLE, form({ email: 'sem-arroba', password: '' }));
    expect(result.status).toBe('error');
    expect(result.fieldErrors).toMatchObject({ email: expect.any(String), password: 'Informe sua senha.' });
    expect(limits).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('aplica o limite por IP e por e-mail (sem gravar o e-mail em claro)', async () => {
    state.limit = 'limited';
    const result = await signInAction(IDLE, form({ email: 'Ana@Empresa.com.br', password: 'x' }));
    expect(result.message).toMatch(/Muitas tentativas/);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(limits).toHaveBeenCalledWith([
      { bucket: 'signin:ip:203.0.113.7', limit: 30, windowSeconds: 900 },
      { bucket: 'signin:email:fp(ana@empresa.com.br)', limit: 10, windowSeconds: 900 },
    ]);
  });

  it('credenciais erradas recebem uma mensagem genérica e a senha nunca volta para a tela', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials', status: 400 } });
    const result = await signInAction(IDLE, form({ email: 'ana@empresa.com.br', password: 'errada123' }));
    expect(result.message).toBe('E-mail ou senha incorretos.');
    expect(result.values).toEqual({ email: 'ana@empresa.com.br' });
    expect(JSON.stringify(result)).not.toContain('errada123');
  });

  it('e-mail não confirmado leva ao reenvio da confirmação', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'email_not_confirmed', status: 400 } });
    const result = await signInAction(IDLE, form({ email: 'ana@empresa.com.br', password: 'certa123' }));
    expect(result).toMatchObject({ status: 'unconfirmed', email: 'ana@empresa.com.br' });
  });

  it('depois de entrar, volta só para destinos internos', async () => {
    expect(await redirectOf(signInAction(IDLE, form({ email: 'a@b.co', password: 'x', next: '/dados' })))).toBe('/dados');
    expect(await redirectOf(signInAction(IDLE, form({ email: 'a@b.co', password: 'x', next: '//evil.example' })))).toBe('/visao-geral');
  });

  it('sem Supabase configurado, recusa com aviso', async () => {
    state.configured = false;
    const result = await signInAction(IDLE, form({ email: 'a@b.co', password: 'x' }));
    expect(result.message).toMatch(/não foi configurada/);
  });

  it('em produção, sem a chave secreta para o limite, recusa em vez de liberar', async () => {
    state.limit = 'unavailable';
    const result = await signInAction(IDLE, form({ email: 'a@b.co', password: 'x' }));
    expect(result.code).toBe('unavailable');
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('cadastro', () => {
  const valid = { fullName: '  Ana   Souza ', email: 'ana@empresa.com.br', password: 'mercado2026' };

  it('envia o link de confirmação para /auth/confirm em SITE_URL, com o nome nos metadados', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    const result = await signUpAction(IDLE, form(valid));
    expect(result).toEqual({ status: 'success', email: 'ana@empresa.com.br' });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'ana@empresa.com.br',
      password: 'mercado2026',
      options: { emailRedirectTo: 'https://app.solus.example/auth/confirm', data: { full_name: 'Ana Souza' } },
    });
  });

  it('e-mail já cadastrado recebe exatamente a mesma resposta (sem enumeração)', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'fake', identities: [] }, session: null }, error: null });
    expect(await signUpAction(IDLE, form(valid))).toEqual({ status: 'success', email: 'ana@empresa.com.br' });
  });

  it('senha recusada pelo Supabase aparece no campo de senha', async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { code: 'weak_password', status: 422 } });
    const result = await signUpAction(IDLE, form(valid));
    expect(result.fieldErrors?.password).toMatch(/Senha fraca/);
  });
});

describe('recuperação e redefinição de senha', () => {
  it('a resposta é a mesma mesmo quando o Supabase falha ou a conta não existe', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { code: 'user_not_found', status: 404 } });
    const result = await requestPasswordResetAction(IDLE, form({ email: 'ninguem@empresa.com.br' }));
    expect(result).toEqual({ status: 'success', email: 'ninguem@empresa.com.br' });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ninguem@empresa.com.br', {
      redirectTo: 'https://app.solus.example/auth/confirm?fluxo=recuperacao',
    });
  });

  it('o link de recuperação abre uma janela curta, em cookie HttpOnly, para criar a senha', async () => {
    const url = await redirectOf(confirmEmailLinkAction(IDLE, form({ token_hash: 'abcdef123456', type: 'recovery' })));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abcdef123456' });
    expect(url).toBe('/redefinir-senha');
    expect(cookieStore.set).toHaveBeenCalledWith('solus-recuperacao', '1', expect.objectContaining({ httpOnly: true, maxAge: 900, sameSite: 'lax' }));
  });

  it('token malformado nem chega ao Supabase', async () => {
    const result = await confirmEmailLinkAction(IDLE, form({ token_hash: "x' or 1=1", type: 'email' }));
    expect(result.status).toBe('error');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('sem a janela de recuperação, não troca a senha', async () => {
    state.user = { id: 'u1', email: 'ana@empresa.com.br' };
    const result = await resetPasswordAction(IDLE, form({ password: 'novaSenha1', confirmation: 'novaSenha1' }));
    expect(result.status).toBe('error');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('com a janela, troca a senha, encerra todas as sessões e pede novo login', async () => {
    state.user = { id: 'u1', email: 'ana@empresa.com.br' };
    state.recoveryGrant = true;
    const url = await redirectOf(resetPasswordAction(IDLE, form({ password: 'novaSenha1', confirmation: 'novaSenha1' })));
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'novaSenha1' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(cookieStore.delete).toHaveBeenCalledWith('solus-recuperacao');
    expect(url).toBe('/entrar?motivo=senha-redefinida');
  });

  it('trocar a senha nas configurações exige a senha atual', async () => {
    state.user = { id: 'u1', email: 'ana@empresa.com.br' };
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials' } });
    const result = await changePasswordAction(IDLE, form({ currentPassword: 'errada', password: 'novaSenha1', confirmation: 'novaSenha1' }));
    expect(result.fieldErrors?.currentPassword).toBe('Senha atual incorreta.');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});

describe('sair', () => {
  it('encerra só esta sessão, esquece a organização ativa e volta para entrar', async () => {
    const url = await redirectOf(signOutAction());
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(cookieStore.delete).toHaveBeenCalledWith('solus-org');
    expect(url).toBe('/entrar?motivo=saiu');
  });
});
