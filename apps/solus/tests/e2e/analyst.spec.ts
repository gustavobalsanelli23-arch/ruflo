import { expect, test } from './fixtures';

/**
 * The analyst exists only where the AI is configured. This spec runs against
 * a server with the demo AI switched on (a placeholder key, never called: no
 * test unlocks the AI), so the scripted demo analyst and its entry points are
 * covered for when the feature is turned on.
 */

test('com a IA configurada, o analista volta à navegação, à busca e às oportunidades', async ({ page, consoleErrors }) => {
  await page.goto('/demo/oportunidades?id=op-boa-vista');
  await page.getByRole('link', { name: 'Ver a análise completa no analista' }).click();
  await expect(page).toHaveURL(/pergunta=q-frios/);
  const answer = page.getByRole('article', { name: 'Resposta do analista' }).last();
  await expect(answer.getByRole('heading', { name: 'O que fazer' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^Analista/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Analista');
  expect(consoleErrors).toEqual([]);
});

test('o analista responde a uma sugestão com fatos, hipóteses, tabela e recomendação', async ({ page, consoleErrors }) => {
  await page.goto('/demo/analista');
  await page.getByRole('button', { name: 'Nova análise' }).first().click();
  await page.getByRole('button', { name: /Quais produtos mais contribuem para o lucro/ }).click();
  const answer = page.getByRole('article', { name: 'Resposta do analista' }).last();
  await expect(answer.getByRole('heading', { name: 'Fatos verificados nos dados' })).toBeVisible({ timeout: 10_000 });
  await expect(answer.getByRole('heading', { name: 'Hipóteses a validar' })).toBeVisible();
  await expect(answer.getByRole('heading', { name: 'O que fazer' })).toBeVisible();
  await expect(answer.getByRole('region', { name: /^Tabela: Os 5 produtos/ })).toBeVisible();
  await expect(answer.getByText('Dados utilizados')).toBeVisible();
  const useful = answer.getByRole('button', { name: 'Resposta útil' });
  await useful.click();
  await expect(useful).toHaveAttribute('aria-pressed', 'true');
  expect(consoleErrors).toEqual([]);
});

test('sem o código, pergunta livre recebe um aviso honesto e o convite para ativar a IA', async ({ page }) => {
  await page.goto('/demo/analista');
  await page.getByRole('button', { name: 'Nova análise' }).first().click();
  await expect(page.getByLabel(/Ativar a IA nesta demonstração/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Pergunta para o analista' }).fill('Qual a melhor loja?');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Ative a IA com o código de acesso para fazer perguntas livres/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Resposta de demonstração').last()).toBeVisible();
});

test('código errado não libera a IA', async ({ page }) => {
  await page.goto('/demo/analista');
  await page.getByRole('button', { name: 'Nova análise' }).first().click();
  await page.getByLabel(/Ativar a IA nesta demonstração/).fill('codigo-errado');
  await page.getByRole('button', { name: 'Ativar' }).click();
  await expect(page.getByText('Código de acesso incorreto.')).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === 'solus-demo-ia')).toBeUndefined();
});
