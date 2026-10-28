import { expect, test } from './fixtures';

const MODULES = [
  { path: '/demo/visao-geral', heading: /Helena/, nav: 'Visão executiva' },
  { path: '/demo/lucratividade', heading: 'Lucratividade', nav: 'Lucratividade' },
  { path: '/demo/estoque', heading: 'Estoque', nav: 'Estoque' },
  { path: '/demo/oportunidades', heading: 'Oportunidades', nav: 'Oportunidades' },
  { path: '/demo/analista', heading: 'Analista', nav: 'Analista' },
  { path: '/demo/dados', heading: 'Dados', nav: 'Dados' },
  { path: '/demo/configuracoes', heading: 'Configurações', nav: 'Configurações' },
];

test.describe('módulos', () => {
  for (const entry of MODULES) {
    test(`${entry.path} carrega com um único h1, marcação de demonstração e navegação ativa`, async ({ page, consoleErrors }) => {
      await page.goto(entry.path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(entry.heading);
      await expect(page.getByText('Demonstração', { exact: true })).toBeVisible();
      const nav = page.getByRole('navigation', { name: 'Principal' }).first();
      await expect(nav.getByRole('link', { name: new RegExp(`^${entry.nav}`) }).or(page.getByRole('link', { name: new RegExp(`^${entry.nav}`) }).first()).first()).toBeVisible();
      expect(consoleErrors).toEqual([]);
    });
  }

  test('a raiz leva quem não entrou para a tela de entrar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('rota inexistente mostra a página 404 com saída', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { name: 'Esta página não existe' })).toBeVisible();
    await page.getByRole('link', { name: 'Ir para a visão executiva' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('links internos da demonstração continuam dentro da demonstração', async ({ page }) => {
    await page.goto('/demo/visao-geral');
    const hrefs = await page.locator('main a[href^="/"], aside a[href^="/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    const outside = hrefs.filter((href) => href && !href.startsWith('/demo/') && !['/entrar', '/cadastro', '/visao-geral'].includes(href));
    expect(outside).toEqual([]);
    await expect(page.getByRole('complementary', { name: 'Aviso de demonstração' })).toContainText('números fictícios');
  });
});

test('o link de pular para o conteúdo aparece no primeiro Tab', async ({ page }) => {
  await page.goto('/demo/visao-geral');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
});

test('a navegação lateral leva a cada módulo', async ({ page, consoleErrors }) => {
  await page.goto('/demo/visao-geral');
  const nav = page.locator('aside').getByRole('navigation', { name: 'Principal' });
  await nav.getByRole('link', { name: /^Lucratividade/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lucratividade' })).toBeVisible();
  await expect(nav.getByRole('link', { name: /^Lucratividade/ })).toHaveAttribute('aria-current', 'page');
  expect(consoleErrors).toEqual([]);
});

test('trocar o período atualiza a URL e os números', async ({ page, consoleErrors }) => {
  await page.goto('/demo/visao-geral');
  await expect(page.getByText('Receita, últimos 30 dias')).toBeVisible();
  await page.getByRole('radio', { name: 'Últimos 90 dias' }).click();
  await expect(page).toHaveURL(/periodo=90d/);
  await expect(page.getByText('Receita, últimos 90 dias')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('o menu de comandos abre com Ctrl+K e navega', async ({ page, consoleErrors }) => {
  await page.goto('/demo/visao-geral');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox').fill('estoque');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/demo\/estoque$/);
  expect(consoleErrors).toEqual([]);
});

test('o tema alterna entre Midnight e Daylight', async ({ page, consoleErrors }) => {
  await page.goto('/demo/visao-geral');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Alterar tema' }).click();
  await page.getByRole('menuitemradio', { name: /Daylight/ }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  expect(consoleErrors).toEqual([]);
});

test('a visão em tabela mostra os mesmos dados do gráfico', async ({ page }) => {
  await page.goto('/demo/visao-geral');
  await page.getByRole('radio', { name: 'Ver tabela' }).first().click();
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Média de 7 dias' })).toBeVisible();
});

test('o menu lateral recolhe e lembra a escolha', async ({ page, consoleErrors }) => {
  await page.goto('/demo/visao-geral');
  const aside = page.getByRole('complementary', { name: 'Navegação lateral' });
  const width = async () => (await aside.boundingBox())?.width ?? 0;
  await expect.poll(width).toBeGreaterThan(200);
  await page.getByRole('button', { name: 'Recolher menu lateral' }).click();
  await expect.poll(width).toBeLessThan(80);
  await page.reload();
  await expect.poll(width).toBeLessThan(80);
  await page.getByRole('button', { name: 'Expandir menu lateral' }).click();
  await expect.poll(width).toBeGreaterThan(200);
  expect(consoleErrors).toEqual([]);
});

test('uma oportunidade abre e fecha só com o teclado', async ({ page }) => {
  await page.goto('/demo/oportunidades');
  await page.getByRole('button', { name: /Corrigir o preço do azeite/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Corrigir o preço do azeite/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: /Corrigir o preço do azeite/ })).toBeFocused();
});
