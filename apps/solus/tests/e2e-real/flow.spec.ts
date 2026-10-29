import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

const SUPABASE_URL = process.env.SOLUS_E2E_SUPABASE_URL;
const SECRET = process.env.SOLUS_E2E_SUPABASE_SECRET_KEY;
const READY = Boolean(process.env.SOLUS_E2E_BASE_URL && SUPABASE_URL && SECRET);

test.skip(!READY, 'Defina SOLUS_E2E_BASE_URL, SOLUS_E2E_SUPABASE_URL e SOLUS_E2E_SUPABASE_SECRET_KEY (projeto de TESTE).');

const admin = READY ? createClient(SUPABASE_URL!, SECRET!, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const run = Date.now().toString(36);
// The sign-up form makes Supabase send a real e-mail: use a domain the test
// project's SMTP accepts (see docs/testes.md).
const domain = process.env.SOLUS_E2E_EMAIL_DOMAIN ?? 'example.com';
const owner = { name: 'Olga Teste', email: `solus-e2e-owner-${run}@${domain}`, password: `Senha-${run}-1` };
const analyst = { name: 'Ana Teste', email: `solus-e2e-analyst-${run}@${domain}`, password: `Senha-${run}-2` };
const orgName = `Mercearia E2E ${run}`;
const createdUsers: string[] = [];
// The session test resets the owner's password; later tests sign in with this.
let ownerPassword = owner.password;

/** Creates the account through the app form, then confirms it with an admin-generated link. */
async function signUpAndConfirm(page: Page, person: typeof owner) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill(person.name);
  await page.getByLabel('E-mail de trabalho').fill(person.email);
  await page.getByLabel('Senha', { exact: true }).fill(person.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible();

  const { data, error } = await admin!.auth.admin.generateLink({ type: 'signup', email: person.email, password: person.password });
  if (error) throw error;
  createdUsers.push(data.user.id);
  await page.goto(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=${data.properties.verification_type}`);
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click();
}

async function signIn(page: Page, person: typeof owner) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(person.email);
  await page.getByLabel('Senha', { exact: true }).fill(person.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: /^Conta de/ }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar\?motivo=saiu$/);
}

test.afterAll(async () => {
  if (!admin) return;
  const { data: orgs } = await admin.from('organizations').select('id').like('name', `%${run}%`);
  if (orgs?.length) await admin.from('organizations').delete().in('id', orgs.map((o) => o.id));
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
});

test('cadastro, confirmação, criação da organização e convite com papéis', async ({ page, browser }) => {
  // Owner: sign up, confirm, create the organization.
  await signUpAndConfirm(page, owner);
  await expect(page).toHaveURL(/\/organizacoes\/nova$/);
  await page.getByLabel('Nome da empresa').fill(orgName);
  await page.getByRole('button', { name: 'Criar organização' }).click();
  await expect(page).toHaveURL(/\/visao-geral$/);
  await expect(page.getByRole('button', { name: new RegExp(`Organização ativa: ${orgName}`) })).toBeVisible();
  await expect(page.getByText('Proprietário', { exact: false }).first()).toBeVisible();

  // Analytic modules show empty states, never invented figures.
  await page.goto('/lucratividade');
  await expect(page.getByText('Ainda não há vendas e custos para analisar')).toBeVisible();

  // Invite an analyst.
  await page.goto('/configuracoes?secao=membros');
  await page.getByRole('button', { name: 'Convidar pessoa' }).click();
  await page.getByLabel('E-mail').fill(analyst.email);
  await page.getByRole('button', { name: 'Gerar link de convite' }).click();
  const link = await page.getByLabel('Link do convite').inputValue();
  expect(link).toMatch(/\/convite\/[0-9a-f]{64}$/);
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByText(analyst.email)).toBeVisible();
  await signOut(page);

  // Wrong password: generic message.
  await signIn(page, { ...owner, password: 'senha-errada-1' });
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();

  // Analyst: opens the invitation before having an account.
  const analystContext = await browser.newContext();
  const analystPage = await analystContext.newPage();
  await analystPage.goto(new URL(link).pathname);
  await expect(analystPage).toHaveURL(/\/entrar\?next=/);
  await signUpAndConfirm(analystPage, analyst);
  await expect(analystPage).toHaveURL(/\/convite\/[0-9a-f]{64}$/);
  await expect(analystPage.getByRole('heading', { name: `Convite para ${orgName}` })).toBeVisible();
  await analystPage.getByRole('button', { name: 'Aceitar convite' }).click();
  await expect(analystPage).toHaveURL(/\/visao-geral$/);

  // Analyst sees the team but cannot manage it.
  await analystPage.goto('/configuracoes?secao=membros');
  await expect(analystPage.getByText(owner.email)).toBeVisible();
  await expect(analystPage.getByRole('button', { name: 'Convidar pessoa' })).toHaveCount(0);
  await expect(analystPage.getByRole('combobox', { name: /^Papel de/ })).toHaveCount(0);

  // The used link cannot be reused.
  await analystPage.goto(new URL(link).pathname);
  await expect(analystPage.getByText('Este convite já foi usado')).toBeVisible();
  await analystContext.close();
});

test('sessão: proteção de rotas, saída e recuperação de senha', async ({ page }) => {
  await signIn(page, owner);
  await expect(page).toHaveURL(/\/visao-geral$/);
  await signOut(page);

  // Signed out: private pages are closed again.
  await page.goto('/configuracoes');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fconfiguracoes/);

  // Recovery through an admin-generated link, as if from the e-mail.
  const { data, error } = await admin!.auth.admin.generateLink({ type: 'recovery', email: owner.email });
  if (error) throw error;
  await page.goto(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`);
  await page.getByRole('button', { name: 'Continuar para nova senha' }).click();
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  const newPassword = `${owner.password}-nova`;
  await page.getByLabel('Nova senha').fill(newPassword);
  await page.getByLabel('Repita a nova senha').fill(newPassword);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/\/entrar\?motivo=senha-redefinida$/);

  await signIn(page, owner);
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  await signIn(page, { ...owner, password: newPassword });
  await expect(page).toHaveURL(/\/visao-geral$/);
  ownerPassword = newPassword;

  // Session cookies are HttpOnly.
  const session = (await page.context().cookies()).filter((c) => c.name.startsWith('sb-'));
  expect(session.length).toBeGreaterThan(0);
  expect(session.every((c) => c.httpOnly && c.sameSite === 'Lax')).toBe(true);
});

/** Sales CSV dated two days ago (inside the default 30-day period), Brazilian number and date format. */
function salesCsv() {
  const day = new Date(Date.now() - 2 * 86_400_000);
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(day);
  return Buffer.from(
    [
      'Data;Pedido;Código;Produto;Qtde;Vlr. Unitário;Desconto',
      `${date};E2E-1;A-1;Azeite 500 ml;2;39,90;0`,
      `${date};E2E-1;B-7;Café 250 g;1;18,50;1,50`,
      `${date};E2E-2;A-1;Azeite 500 ml;1;39,90;`,
    ].join('\r\n'),
  );
}

async function importSales(page: Page) {
  await page.goto('/dados');
  await page.locator('input[type="file"]').setInputFiles({ name: 'vendas-e2e.csv', mimeType: 'text/csv', buffer: salesCsv() });
  await page.getByRole('button', { name: 'Enviar e pré-visualizar' }).click();
  await page.getByRole('button', { name: 'Mapear colunas' }).click();
  await page.getByRole('button', { name: 'Validar no servidor' }).click();
  await page.getByRole('button', { name: 'Revisar e confirmar' }).click({ timeout: 30_000 });
}

const figure = (page: Page, label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');

test('importação de vendas: do arquivo aos painéis, sem duplicar, e desfeita', async ({ page }) => {
  await signIn(page, { ...owner, password: ownerPassword });
  await expect(page.getByText('Primeiros passos')).toBeVisible();

  // First import: three lines, two orders.
  await importSales(page);
  await expect(figure(page, 'Linhas a gravar')).toHaveText('3');
  await page.getByRole('button', { name: 'Confirmar e gravar' }).click();
  await expect(page.getByText('Importação concluída')).toBeVisible({ timeout: 60_000 });
  await expect(figure(page, 'Registros gravados')).toHaveText('3');

  // The overview now reads the metric layer: 2×39,90 + 18,50 − 1,50 + 39,90 = 136,60.
  await page.goto('/visao-geral');
  await expect(page.getByText(/Receita líquida, últimos 30 dias/)).toBeVisible();
  await expect(page.getByText('R$ 136,60').first()).toBeVisible();

  // Same file again: warned in the preview, every line recognised as already imported.
  await page.goto('/dados');
  await page.locator('input[type="file"]').setInputFiles({ name: 'vendas-e2e.csv', mimeType: 'text/csv', buffer: salesCsv() });
  await page.getByRole('button', { name: 'Enviar e pré-visualizar' }).click();
  await expect(page.getByText('Este mesmo arquivo já foi importado')).toBeVisible();
  await page.getByRole('button', { name: 'Mapear colunas' }).click();
  await page.getByRole('button', { name: 'Validar no servidor' }).click();
  await page.getByRole('button', { name: 'Revisar e confirmar' }).click({ timeout: 30_000 });
  await expect(page.getByText('3 linhas já estão nos dados e serão ignoradas')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar e gravar' }).click();
  await expect(figure(page, 'Registros gravados')).toHaveText('0', { timeout: 60_000 });
  await expect(figure(page, 'Ignorados (duplicados)')).toHaveText('3');

  // Undo the first import from the history: the overview goes back to empty.
  await page.goto('/dados');
  const completed = page.getByRole('row').filter({ hasText: 'vendas-e2e.csv' }).filter({ hasText: 'Concluída' });
  await completed.last().getByRole('button', { name: 'Ações para vendas-e2e.csv' }).click();
  await page.getByRole('menuitem', { name: 'Desfazer' }).click();
  await page.getByRole('button', { name: 'Desfazer importação' }).click();
  await expect(page.getByText('Importação desfeita')).toBeVisible({ timeout: 60_000 });
  await page.goto('/visao-geral');
  await expect(page.getByText('Primeiros passos')).toBeVisible();
});
