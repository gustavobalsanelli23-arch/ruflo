import { expect, test } from './fixtures';

test('no celular, a barra inferior navega e a página não rola na horizontal', async ({ page, consoleErrors }) => {
  await page.goto('/demo/visao-geral');
  const tabs = page.getByRole('navigation', { name: 'Atalhos' });
  await expect(tabs).toBeVisible();
  await tabs.getByRole('link', { name: 'Lucro' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lucratividade' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});

test('no celular, o menu lateral dá acesso a todos os módulos', async ({ page }) => {
  await page.goto('/demo/visao-geral');
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  const menu = page.getByRole('dialog');
  await menu.getByRole('link', { name: /^Configurações/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
});

test('no celular, tabelas viram lista e o período usa um seletor', async ({ page }) => {
  await page.goto('/demo/lucratividade');
  await expect(page.getByRole('combobox', { name: 'Período de análise' })).toBeVisible();
  await expect(page.getByText('Pão de fermentação natural').first()).toBeVisible();
});

test('no celular, nenhum módulo rola na horizontal', async ({ page }) => {
  for (const path of ['/demo/visao-geral', '/demo/lucratividade', '/demo/estoque', '/demo/oportunidades', '/demo/dados', '/demo/configuracoes']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('no celular, a importação mostra a etapa atual', async ({ page }) => {
  await page.goto('/demo/dados');
  await expect(page.locator('p', { hasText: 'Etapa 1 de 6: Arquivo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Etapa 1 de 6: Arquivo' })).toBeAttached();
  await page.getByRole('button', { name: 'Usar o arquivo de exemplo' }).click();
  await page.getByRole('button', { name: 'Pré-visualizar arquivo' }).click();
  await expect(page.locator('p', { hasText: 'Etapa 2 de 6: Pré-visualização' })).toBeVisible();
});

test('no celular, a busca usa fonte de 16px (o Safari do iPhone dá zoom ao focar campos menores)', async ({ page }) => {
  await page.goto('/demo/visao-geral');
  await page.getByRole('button', { name: 'Buscar' }).click();
  const field = page.getByRole('dialog').getByRole('combobox');
  await expect(field).toBeVisible();
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
});

test('no celular, o detalhe da oportunidade ocupa a tela e mostra os fatos sem cortar', async ({ page }) => {
  await page.goto('/demo/oportunidades?id=op-baixo-giro');
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('70% (moderada)')).toBeVisible();
  const { sheetWidth, viewport, cut } = await sheet.evaluate((el) => {
    const facts = el.querySelector('dl')!.getBoundingClientRect();
    const cut = [...el.querySelectorAll('dl *')]
      .filter((child) => child.getBoundingClientRect().right > facts.right + 0.5)
      .map((child) => child.textContent);
    return { sheetWidth: el.getBoundingClientRect().width, viewport: window.innerWidth, cut };
  });
  expect(sheetWidth).toBe(viewport);
  expect(cut).toEqual([]);
});

test('no celular, links de texto têm alvo de toque de pelo menos 24px e recebem o toque em toda a área', async ({ page }) => {
  await page.goto('/demo/visao-geral');
  for (const name of ['Ver todas', 'Ver estoque', 'Ver lucratividade']) {
    const link = page.getByRole('link', { name });
    await link.scrollIntoViewIfNeeded();
    const result = await link.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const reaches = (y: number) => el.contains(document.elementFromPoint(r.left + r.width / 2, y));
      return { height: r.height, top: reaches(r.top + 1), bottom: reaches(r.bottom - 1) };
    });
    expect(result, name).toEqual({ height: expect.any(Number), top: true, bottom: true });
    expect(result.height, name).toBeGreaterThanOrEqual(24);
  }
});

test('no celular, as telas de acesso cabem sem rolagem horizontal', async ({ page }) => {
  for (const path of ['/entrar', '/cadastro', '/recuperar-senha', '/auth/confirm']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
