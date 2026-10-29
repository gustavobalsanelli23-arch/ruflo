import { expect, test } from './fixtures';

/**
 * Server with Supabase settings that point at an address where nothing
 * listens. The forms are enabled, so validation, failure handling and the
 * session checks run for real, but no account is ever created. Real
 * sign-up/sign-in are covered by playwright.real.config.ts.
 */

test.describe('entrar', () => {
  test('valida no navegador, marca os campos e foca o primeiro problema', async ({ page, consoleErrors }) => {
    await page.goto('/entrar');
    await page.getByRole('button', { name: 'Entrar' }).click();
    const email = page.getByLabel('E-mail');
    await expect(page.getByText('Informe seu e-mail.')).toBeVisible();
    await expect(page.getByText('Informe sua senha.')).toBeVisible();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAttribute('aria-describedby', 'email-error');
    await expect(email).toBeFocused();

    await email.fill('sem-arroba');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Informe um e-mail válido, como nome@empresa.com.br.')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('sem JavaScript, o servidor valida os mesmos campos', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('sem-arroba');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Informe um e-mail válido, como nome@empresa.com.br.')).toBeVisible();
    await expect(page.getByText('Informe sua senha.')).toBeVisible();
    await expect(page.getByLabel('E-mail')).toHaveValue('sem-arroba');
    await context.close();
  });

  test('com o serviço de acesso fora do ar, mostra um erro claro sem quebrar a tela', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('pessoa@empresa.com.br');
    await page.getByLabel('Senha', { exact: true }).fill('senha-qualquer-1');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível entrar' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('E-mail')).toHaveValue('pessoa@empresa.com.br');
    await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  });

  test('mostrar senha alterna o campo e informa o estado', async ({ page }) => {
    await page.goto('/entrar');
    const password = page.getByLabel('Senha', { exact: true });
    await password.fill('segredo123');
    const toggle = page.getByRole('button', { name: 'Mostrar senha' });
    await toggle.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('redirecionamento após entrar', () => {
  test('aceita só caminhos internos', async ({ page }) => {
    for (const next of ['https://evil.example/x', '//evil.example', '/\\evil.example', 'javascript:alert(1)']) {
      await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
      await expect(page.locator('input[name="next"]'), next).toHaveCount(0);
    }
    await page.goto(`/entrar?next=${encodeURIComponent('/configuracoes?secao=membros')}`);
    await expect(page.locator('input[name="next"]')).toHaveValue('/configuracoes?secao=membros');
    await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', `/cadastro?next=${encodeURIComponent('/configuracoes?secao=membros')}`);
  });

  test('uma rota privada guarda o destino para depois do login', async ({ page }) => {
    await page.goto('/configuracoes?secao=membros');
    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent('/configuracoes?secao=membros')}`);
  });
});

test.describe('sessões inválidas', () => {
  const forged = (claims: Record<string, unknown>) => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const jwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.assinatura-falsa`;
    const session = {
      access_token: jwt,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'refresh-falso',
      user: { id: claims.sub, aud: 'authenticated', role: 'authenticated', email: 'falso@exemplo.test' },
    };
    return `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  };

  for (const [label, value] of [
    ['um cookie de sessão corrompido', 'base64-nao-e-json'],
    [
      'um JWT forjado (assinatura inválida)',
      forged({ sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }),
    ],
  ] as const) {
    test(`${label} não dá acesso e leva a entrar com o aviso de sessão expirada`, async ({ page, context }) => {
      await context.addCookies([{ name: 'sb-127-auth-token', value, domain: 'localhost', path: '/' }]);
      await page.goto('/dados');
      await expect(page).toHaveURL(/\/entrar\?next=%2Fdados&motivo=sessao-expirada$/, { timeout: 15_000 });
      await expect(page.getByText('Sua sessão expirou')).toBeVisible();
    });
  }
});

test('abrir um convite sem estar conectado guarda o convite e pede para entrar', async ({ page, context }) => {
  const token = 'b'.repeat(64);
  await page.goto(`/convite/${token}`);
  await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(`/convite/${token}`)}`);
  const pending = (await context.cookies()).find((cookie) => cookie.name === 'solus-convite');
  expect(pending?.value).toBe(token);
  expect(pending?.httpOnly).toBe(true);
  expect(pending?.sameSite).toBe('Lax');
});

test.describe('cadastro', () => {
  test('exige nome, e-mail válido e senha com letras e números', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('Informe seu nome.')).toBeVisible();
    await page.getByLabel('Nome').fill('Ana Souza');
    await page.getByLabel('E-mail de trabalho').fill('ana@empresa.com.br');
    await page.getByLabel('Senha', { exact: true }).fill('somenteletras');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('Combine letras e números.')).toBeVisible();
    await page.getByLabel('Senha', { exact: true }).fill('a1');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('Use pelo menos 8 caracteres.')).toBeVisible();
  });
});

test.describe('recuperação de senha', () => {
  test('sem o limitador de tentativas disponível, recusa com aviso claro em vez de liberar', async ({ page }) => {
    // Production server without the secret key: the shared rate limiter is
    // unavailable, so the request fails closed. (The same-answer-for-every-
    // e-mail behaviour is covered in tests/unit/auth-actions.test.ts.)
    await page.goto('/recuperar-senha');
    await page.getByLabel('E-mail').fill('qualquer.pessoa@empresa.com.br');
    await page.getByRole('button', { name: 'Enviar link' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível enviar o link' });
    await expect(alert).toContainText('indisponível', { timeout: 15_000 });
    await expect(page.getByLabel('E-mail')).toHaveValue('qualquer.pessoa@empresa.com.br');
  });

  test('o link de recuperação vencido explica o que fazer', async ({ page }) => {
    await page.goto('/redefinir-senha');
    await expect(page).toHaveURL(/\/recuperar-senha\?motivo=link-expirado$/);
    await expect(page.getByText('O link expirou')).toBeVisible();
  });
});
