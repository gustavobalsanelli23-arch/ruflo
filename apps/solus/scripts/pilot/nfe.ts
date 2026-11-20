/**
 * NF-e / NFC-e XML -> SOLUS sales spreadsheet (CSV), for the pilot with
 * accounting firms.
 *
 * Keeps only what the import needs: date, note number, product code and name,
 * quantity, price and discount. The recipient block (<dest>: CPF/CNPJ, name,
 * address, e-mail) is never read, as the pilot consent form promises, so no
 * consumer data reaches the spreadsheet.
 *
 * Which notes become rows:
 *   - authorized sales (tpNF=1, finNFe=1) -> "venda";
 *   - customer returns (tpNF=0, finNFe=4) -> "devolução";
 *   - everything else (purchases, returns to suppliers, complementary or
 *     adjustment notes, notes cancelled by an event in the same folder,
 *     notes without an authorization protocol of status 100) is skipped
 *     and counted in the summary.
 * One CSV per issuer, so a folder with several clients yields one file each.
 *
 *   node scripts/pilot/nfe.ts <pasta-com-xml> [pasta-de-saida]
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { combine, parseNfe, SKIP_LABEL, toCsv } from '../../src/lib/ingest/sources/nfe.ts';

export * from '../../src/lib/ingest/sources/nfe.ts';

function xmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return xmlFiles(path);
    return entry.toLowerCase().endsWith('.xml') ? [path] : [];
  });
}

function main() {
  const [input, output = 'planilhas-solus'] = process.argv.slice(2);
  if (!input) {
    console.error('Uso: node scripts/pilot/nfe.ts <pasta-com-xml> [pasta-de-saida]');
    process.exit(1);
  }
  const files = xmlFiles(resolve(input));
  if (files.length === 0) {
    console.error('Nenhum arquivo .xml nessa pasta.');
    process.exit(1);
  }
  const result = combine(files.map((file) => parseNfe(readFileSync(file, 'utf8'))));
  mkdirSync(resolve(output), { recursive: true });

  console.log(`${files.length} arquivos lidos, ${result.notes} notas aproveitadas.`);
  for (const [issuer, group] of result.byIssuer) {
    const file = join(resolve(output), `vendas-${issuer || 'sem-documento'}.csv`);
    if (!file.startsWith(resolve(output) + sep)) throw new Error(`Caminho de saída inválido: ${file}`);
    writeFileSync(file, toCsv(group.lines));
    console.log(`  ${group.name || issuer}: ${group.lines.length} linhas -> ${basename(file)}`);
  }
  const skipped = Object.entries(result.skipped);
  if (skipped.length > 0) {
    console.log('Fora da planilha:');
    for (const [reason, total] of skipped) console.log(`  ${total} ${SKIP_LABEL[reason as keyof typeof SKIP_LABEL]}`);
  }
  console.log('Dados do destinatário (CPF/CNPJ, nome, endereço) não foram lidos nem gravados.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
