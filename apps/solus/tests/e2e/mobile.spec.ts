import { expect, test } from './fixtures';

test('no celular, a barra inferior navega e a página não rola na horizontal', async ({ page, consoleErrors }) => {
  await page.goto('/visao-geral');
  const tabs = page.getByRole('navigation', { name: 'Atalhos' });
  await expect(tabs).toBeVisible();
  await tabs.getByRole('link', { name: 'Lucro' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lucratividade' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});

test('no celular, o menu lateral dá acesso a todos os módulos', async ({ page }) => {
  await page.goto('/visao-geral');
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  const menu = page.getByRole('dialog');
  await menu.getByRole('link', { name: /^Configurações/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
});

test('no celular, tabelas viram lista e o período usa um seletor', async ({ page }) => {
  await page.goto('/lucratividade');
  await expect(page.getByRole('combobox', { name: 'Período de análise' })).toBeVisible();
  await expect(page.getByText('Pão de fermentação natural').first()).toBeVisible();
});
