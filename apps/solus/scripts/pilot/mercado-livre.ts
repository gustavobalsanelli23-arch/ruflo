/**
 * Mercado Livre sales report (Vendas > Exportar, .xlsx) -> SOLUS sales
 * spreadsheet (CSV), for the pilot with e-commerce sellers.
 *
 * The report has title rows above the header and buyer columns (name, CPF,
 * address). This keeps only sale number, date, SKU, ad title, units and price;
 * buyer columns are never read, as the pilot consent form promises.
 *
 * Which rows become sales: every row with SKU (or ad number) and units.
 * Cancelled and returned sales are left out and counted, so the revenue
 * matches what the seller actually kept. Pack summary rows (no units) are
 * skipped. Mercado Livre fees and shipping are added up and shown in the
 * summary: SOLUS has no column for them yet, so profit there does not
 * subtract them.
 *
 * Column names vary between report versions; they are matched by words, and
 * the script stops listing the headers it found if a required one is missing.
 *
 *   node scripts/pilot/mercado-livre.ts <relatorio.xlsx> [saida.csv]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { convertMercadoLivre, MlFormatError, toCsv, type Cell, type MlConversion } from '../../src/lib/ingest/sources/mercado-livre.ts';

export * from '../../src/lib/ingest/sources/mercado-livre.ts';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function main() {
  const [input, output = 'vendas-mercado-livre.csv'] = process.argv.slice(2);
  if (!input) {
    console.error('Uso: node scripts/pilot/mercado-livre.ts <relatorio.xlsx> [saida.csv]');
    process.exit(1);
  }
  const { default: readXlsxFile } = await import('read-excel-file/node');
  const sheets = (await readXlsxFile(resolve(input))) as unknown as { sheet: string; data: Cell[][] }[];
  let result: MlConversion | null = null;
  let lastError: Error | null = null;
  for (const sheet of sheets) {
    try {
      result = convertMercadoLivre(sheet.data);
      break;
    } catch (error) {
      if (!(error instanceof MlFormatError)) throw error;
      lastError = error;
    }
  }
  if (!result) {
    console.error(lastError?.message ?? 'Planilha vazia.');
    process.exit(1);
  }
  writeFileSync(resolve(output), toCsv(result.lines));
  const revenue = result.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  console.log(`${result.lines.length} linhas de venda (${brl(revenue)}) -> ${output}`);
  const { canceladas, devolvidas, semUnidades, dataIlegivel } = result.skipped;
  if (canceladas) console.log(`  ${canceladas} vendas canceladas ficaram fora`);
  if (devolvidas) console.log(`  ${devolvidas} vendas devolvidas ou em mediação ficaram fora`);
  if (semUnidades) console.log(`  ${semUnidades} linhas sem SKU, unidades ou preço (resumo de pacote?) ficaram fora`);
  if (dataIlegivel) console.log(`  ${dataIlegivel} linhas com data ilegível ficaram fora`);
  if (result.fees !== null || result.shipping !== null) {
    console.log(
      `Tarifas do Mercado Livre no período: ${brl(result.fees ?? 0)} de venda e ${brl(result.shipping ?? 0)} de envio.` +
        ' O SOLUS ainda não desconta esses valores do lucro.',
    );
  }
  console.log('Colunas do comprador (nome, CPF, endereço) não foram lidas nem gravadas.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
