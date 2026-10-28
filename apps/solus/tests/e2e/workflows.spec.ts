import { expect, test } from './fixtures';

test('oportunidade abre com fatos, estimativa e plano, e o descarte pede confirmação', async ({ page, consoleErrors }) => {
  await page.goto('/demo/oportunidades');
  await page.getByRole('button', { name: /Renegociar o reajuste/ }).click();
  await expect(page).toHaveURL(/id=op-boa-vista/);
  const sheet = page.getByRole('dialog');
  for (const heading of ['O que foi identificado', 'Dados que sustentam', 'Impacto estimado', 'Por que merece atenção', 'Ação recomendada']) {
    await expect(sheet.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(sheet.getByText('Não é um ganho garantido', { exact: false })).toBeVisible();
  await sheet.getByRole('combobox', { name: 'Status da oportunidade' }).click();
  await page.getByRole('option', { name: 'Descartada' }).click();
  const confirm = page.getByRole('dialog', { name: 'Descartar esta oportunidade?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Manter aberta' }).click();
  await expect(confirm).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test('o link direto abre a oportunidade e fechar limpa a URL', async ({ page }) => {
  await page.goto('/demo/oportunidades?id=op-azeite');
  await expect(page.getByRole('dialog').getByText('Corrigir o preço do azeite português, vendido abaixo do custo')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/demo\/oportunidades$/);
});

test('filtrar oportunidades por tipo e mudar o status atualiza os cartões', async ({ page, consoleErrors }) => {
  await page.goto('/demo/oportunidades');
  const list = page.getByRole('region', { name: 'Oportunidades' }).getByRole('list').first();
  await expect(list.getByRole('article')).toHaveCount(7);
  await page.getByRole('button', { name: /^Estoque/ }).click();
  await expect(list.getByRole('article')).toHaveCount(2);
  await expect(page.getByText('2 oportunidades de estoque', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar todos os tipos' }).click();
  await expect(list.getByRole('article')).toHaveCount(7);

  await page.getByRole('button', { name: /Repor o Café especial/ }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Status da oportunidade' }).click();
  await page.getByRole('option', { name: 'Concluída' }).click();
  await expect(page.getByText('Status alterado para concluída')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list.getByRole('article')).toHaveCount(6);
  expect(consoleErrors).toEqual([]);
});

test('a oportunidade leva à análise completa no analista', async ({ page }) => {
  await page.goto('/demo/oportunidades?id=op-boa-vista');
  await page.getByRole('link', { name: 'Ver a análise completa no analista' }).click();
  await expect(page).toHaveURL(/pergunta=q-frios/);
  const answer = page.getByRole('article', { name: 'Resposta do analista' }).last();
  await expect(answer.getByRole('heading', { name: 'O que fazer' })).toBeVisible({ timeout: 10_000 });
});

test('a importação percorre as seis etapas até o resultado', async ({ page, consoleErrors }) => {
  await page.goto('/demo/dados');
  await page.getByRole('button', { name: 'Usar o arquivo de exemplo' }).click();
  await page.getByRole('button', { name: 'Pré-visualizar arquivo' }).click();
  await expect(page.getByRole('region', { name: 'Tabela: primeiras linhas do arquivo' })).toBeVisible();
  await page.getByRole('button', { name: 'Mapear colunas' }).click();
  await expect(page.getByText('Campos obrigatórios associados')).toBeVisible();
  await page.getByRole('button', { name: 'Validar arquivo' }).click();
  await expect(page.getByText('Código do produto vazio.', { exact: false })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Revisar importação' }).click();
  await page.getByRole('button', { name: /^Importar .* linhas$/ }).click();
  await expect(page.getByText('Importação iniciada')).toBeVisible();
  await expect(page.getByText('Importação concluída')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('cell', { name: /vendas_outubro\.csv/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('arquivo que não é planilha mostra o erro e como resolver', async ({ page }) => {
  await page.goto('/demo/dados');
  await page.locator('input[type=file]').setInputFiles({ name: 'notas.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(page.getByRole('alert').filter({ hasText: 'notas.pdf' })).toContainText('não é uma planilha aceita. Envie um arquivo .csv, .xlsx ou .xls.');
  await expect(page.getByRole('button', { name: 'Pré-visualizar arquivo' })).toBeDisabled();
});

test('o mapeamento bloqueia o avanço sem campo obrigatório', async ({ page }) => {
  await page.goto('/demo/dados');
  await page.getByRole('button', { name: 'Usar o arquivo de exemplo' }).click();
  await page.getByRole('button', { name: 'Pré-visualizar arquivo' }).click();
  await page.getByRole('button', { name: 'Mapear colunas' }).click();
  await page.getByRole('combobox', { name: 'Campo para a coluna cod_produto' }).click();
  await page.getByRole('option', { name: 'Não importar' }).click();
  await expect(page.getByText('Faltam campos obrigatórios')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Validar arquivo' })).toBeDisabled();
});

test('o histórico explica uma importação que falhou', async ({ page }) => {
  await page.goto('/demo/dados');
  await page.getByRole('button', { name: /1, ver detalhes/ }).click();
  const dialog = page.getByRole('dialog', { name: 'A importação falhou' });
  await expect(dialog).toContainText('coluna de CNPJ');
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

test('pergunta livre recebe um aviso honesto de demonstração', async ({ page }) => {
  await page.goto('/demo/analista');
  await page.getByRole('textbox', { name: 'Pergunta para o analista' }).fill('Qual a melhor loja?');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Perguntas livres serão respondidas quando o modelo de IA for conectado/)).toBeVisible({ timeout: 10_000 });
});

test('o sinal de ruptura filtra a tabela de estoque pela URL', async ({ page, consoleErrors }) => {
  await page.goto('/demo/estoque');
  await page.getByRole('region', { name: 'Risco de ruptura' }).getByRole('link', { name: 'Ver na tabela' }).click();
  await expect(page).toHaveURL(/filtro=ruptura/);
  await expect(page.getByRole('radio', { name: /Ruptura/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('region', { name: 'Tabela: Posição de estoque por produto' }).getByRole('row')).toHaveCount(4);
  expect(consoleErrors).toEqual([]);
});

test('convidar membro valida o e-mail', async ({ page, consoleErrors }) => {
  await page.goto('/demo/configuracoes?secao=membros');
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
  await page.goto('/demo/configuracoes?secao=geral');
  await page.getByRole('button', { name: 'Excluir organização' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Excluir definitivamente' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Nome da organização').fill('Empório Lumen');
  await expect(confirm).toBeEnabled();
});
