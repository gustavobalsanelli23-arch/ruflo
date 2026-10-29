import { expect, test } from './fixtures';

/** Server without Supabase settings: nothing private is reachable, the demo is. */

const PRIVATE = [
  '/visao-geral',
  '/lucratividade',
  '/estoque',
  '/oportunidades',
  '/analista',
  '/dados',
  '/configuracoes?secao=membros',
  '/organizacoes/nova',
  `/convite/${'a'.repeat(64)}`,
];

test('acesso sem autenticação a qualquer rota privada leva à tela de entrar', async ({ page }) => {
  for (const path of PRIVATE) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/entrar$/);
  }
});

test('sem Supabase configurado, o acesso é desativado com um aviso honesto e a demonstração segue disponível', async ({ page, consoleErrors }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Acesso ainda não configurado' })).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  await page.getByRole('link', { name: 'Explorar a demonstração' }).click();
  await expect(page).toHaveURL(/\/demo\/visao-geral$/);
  await expect(page.getByRole('complementary', { name: 'Aviso de demonstração' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('respostas HTML trazem CSP com nonce e os cabeçalhos de segurança', async ({ page }) => {
  const response = await page.goto('/entrar');
  const headers = response!.headers();
  const csp = headers['content-security-policy'] ?? '';
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("form-action 'self'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-powered-by']).toBeUndefined();

  // Every inline script carries this request's nonce.
  const inline = await page.locator('script:not([src])').evaluateAll((scripts) => scripts.map((s) => (s as HTMLScriptElement).nonce));
  expect(inline.length).toBeGreaterThan(0);
  expect(inline.every((value) => value === nonce)).toBe(true);
});

test('cada resposta recebe um nonce diferente', async ({ request }) => {
  const nonces = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const response = await request.get('/entrar');
    nonces.add(/'nonce-([^']+)'/.exec(response.headers()['content-security-policy'] ?? '')?.[1] ?? '');
  }
  expect(nonces.size).toBe(3);
});

test('rotas do analista recusam outra origem e ficam desligadas sem a chave da IA', async ({ request, baseURL }) => {
  const question = { mode: 'chat', question: 'Como foram as vendas?', threadId: null, opportunityId: null };
  const foreign = await request.post('/api/analista', { data: question, headers: { origin: 'https://evil.example' } });
  expect(foreign.status()).toBe(403);
  const own = { origin: baseURL! };
  const tenant = await request.post('/api/analista', { data: question, headers: own });
  expect(tenant.status()).toBe(503);
  expect(tenant.headers()['cache-control']).toContain('no-store');
  const demo = await request.post('/api/demo/analista', { data: { ...question, history: [] }, headers: own });
  expect(demo.status()).toBe(403);
  const unlock = await request.post('/api/demo/acesso', { data: { code: 'qualquer-codigo' }, headers: own });
  expect(unlock.status()).toBe(404);
});

test('redefinir senha sem sessão de recuperação volta para o pedido de link', async ({ page }) => {
  await page.goto('/redefinir-senha');
  await expect(page).toHaveURL(/\/recuperar-senha\?motivo=link-expirado$/);
  await expect(page.getByRole('button', { name: 'Enviar link' })).toBeDisabled();
});

test('link de confirmação incompleto explica o problema e oferece saída', async ({ page }) => {
  await page.goto('/auth/confirm');
  await expect(page.getByText('Este link não pode ser usado')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir para entrar' })).toBeVisible();
  await page.goto('/auth/confirm?error=access_denied&error_code=otp_expired&type=recovery');
  await expect(page.getByRole('link', { name: 'Pedir novo link' })).toBeVisible();
});
