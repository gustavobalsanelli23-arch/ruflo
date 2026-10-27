import { expect, test } from './fixtures';

test('oportunidade abre com evidências e o descarte pede confirmação', async ({ page, consoleErrors }) => {
  await page.goto('/oportunidades');
  await page.getByRole('button', { name: /Renegociar o reajuste/ }).click();
  await expect(page).toHaveURL(/id=op-boa-vista/);
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Por que isso apareceu' })).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Evidências' })).toBeVisible();
  await sheet.getByRole('combobox', { name: 'Status da oportunidade' }).click();
  await page.getByRole('option', { name: 'Descartada' }).click();
  const confirm = page.getByRole('dialog', { name: 'Descartar esta oportunidade?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Manter aberta' }).click();
  await expect(confirm).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test('o link direto abre a oportunidade e fechar limpa a URL', async ({ page }) => {
  await page.goto('/oportunidades?id=op-azeite');
  await expect(page.getByRole('dialog').getByText('Corrigir o preço do azeite português, vendido abaixo do custo')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/oportunidades$/);
});

test('a importação percorre as quatro etapas', async ({ page, consoleErrors }) => {
  await page.goto('/dados');
  await page.getByRole('button', { name: 'Usar o arquivo de exemplo' }).click();
  await page.getByRole('button', { name: 'Mapear colunas' }).click();
  await expect(page.getByText('Campos obrigatórios associados')).toBeVisible();
  await page.getByRole('button', { name: 'Validar arquivo' }).click();
  await expect(page.getByText('Código do produto vazio.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Revisar importação' }).click();
  await page.getByRole('button', { name: /^Importar .* linhas$/ }).click();
  await expect(page.getByText('Importação iniciada')).toBeVisible();
  await expect(page.getByRole('cell', { name: /vendas_outubro\.csv/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('o mapeamento bloqueia o avanço sem campo obrigatório', async ({ page }) => {
  await page.goto('/dados');
  await page.getByRole('button', { name: 'Usar o arquivo de exemplo' }).click();
  await page.getByRole('button', { name: 'Mapear colunas' }).click();
  await page.getByRole('combobox', { name: 'Campo para a coluna cod_produto' }).click();
  await page.getByRole('option', { name: 'Não importar' }).click();
  await expect(page.getByText('Faltam campos obrigatórios')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Validar arquivo' })).toBeDisabled();
});

test('o analista responde a uma sugestão separando fatos de hipóteses', async ({ page, consoleErrors }) => {
  await page.goto('/analista');
  await page.getByRole('button', { name: 'Nova análise' }).first().click();
  await page.getByRole('button', { name: /Quais produtos mais contribuem para o lucro/ }).click();
  const answer = page.getByRole('article', { name: 'Resposta do analista' }).last();
  await expect(answer.getByRole('heading', { name: 'Fatos verificados nos dados' })).toBeVisible({ timeout: 10_000 });
  await expect(answer.getByRole('heading', { name: 'Hipóteses a validar' })).toBeVisible();
  await expect(answer.getByText('Dados utilizados')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('pergunta livre recebe um aviso honesto de demonstração', async ({ page }) => {
  await page.goto('/analista');
  await page.getByRole('textbox', { name: 'Pergunta para o analista' }).fill('Qual a melhor loja?');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Perguntas livres serão respondidas quando o modelo de IA for conectado/)).toBeVisible({ timeout: 10_000 });
});

test('convidar membro valida o e-mail', async ({ page, consoleErrors }) => {
  await page.goto('/configuracoes?secao=membros');
  await page.getByRole('button', { name: 'Convidar membro' }).click();
  const dialog = page.getByRole('dialog', { name: 'Convidar membro' });
  await dialog.getByLabel('E-mail').fill('sem-arroba');
  await dialog.getByRole('button', { name: 'Enviar convite' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Informe um e-mail válido');
  await dialog.getByLabel('E-mail').fill('nova.pessoa@lumen.example');
  await dialog.getByRole('button', { name: 'Enviar convite' }).click();
  await expect(page.getByRole('cell', { name: /nova\.pessoa@lumen\.example/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('excluir organização exige digitar o nome', async ({ page }) => {
  await page.goto('/configuracoes?secao=geral');
  await page.getByRole('button', { name: 'Excluir organização' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Excluir definitivamente' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Nome da organização').fill('Empório Lumen');
  await expect(confirm).toBeEnabled();
});
