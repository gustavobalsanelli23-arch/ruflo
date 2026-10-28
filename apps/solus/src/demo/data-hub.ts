/**
 * DEMONSTRATION DATA — import history and a sample spreadsheet used to show
 * the mapping and validation steps in /demo. Nothing is parsed or stored.
 */
import type { DataHubData } from '@/lib/data/types';

export const dataHub: DataHubData = {
  imports: [
    { id: 'imp-1029', fileName: 'vendas_2026-10-25.csv', format: 'csv', dataset: 'Vendas', status: 'completed', records: 1284, errors: 0, uploadedAt: '2026-10-26T06:02:00-03:00', uploadedBy: 'Importação automática' },
    { id: 'imp-1028', fileName: 'estoque_fechamento_out.xlsx', format: 'xlsx', dataset: 'Estoque', status: 'processing', records: 44, errors: 0, uploadedAt: '2026-10-26T05:58:00-03:00', uploadedBy: 'Rafael Lins', progress: 0.62 },
    { id: 'imp-1027', fileName: 'notas_compra_boa_vista.xlsx', format: 'xlsx', dataset: 'Compras', status: 'with-errors', records: 312, errors: 7, uploadedAt: '2026-10-24T14:20:00-03:00', uploadedBy: 'Bianca Moraes', issues: ['7 linhas com código de produto que não existe no cadastro (ex.: FRI-0599). Cadastre os itens ou corrija os códigos e reenvie só essas linhas.'] },
    { id: 'imp-1026', fileName: 'vendas_2026-10-24.csv', format: 'csv', dataset: 'Vendas', status: 'completed', records: 1197, errors: 0, uploadedAt: '2026-10-25T06:01:00-03:00', uploadedBy: 'Importação automática' },
    { id: 'imp-1025', fileName: 'cadastro_produtos_v3.xlsx', format: 'xlsx', dataset: 'Produtos', status: 'completed', records: 44, errors: 0, uploadedAt: '2026-10-20T11:42:00-03:00', uploadedBy: 'Helena Prado' },
    { id: 'imp-1024', fileName: 'fornecedores.csv', format: 'csv', dataset: 'Fornecedores', status: 'failed', records: 0, errors: 1, uploadedAt: '2026-10-18T09:15:00-03:00', uploadedBy: 'Rafael Lins', issues: ['O arquivo não tem a coluna de CNPJ, obrigatória para fornecedores. Adicione a coluna e envie de novo.'] },
  ],
  targetFields: [
    { id: 'date', label: 'Data da venda', required: true },
    { id: 'sku', label: 'Código do produto (SKU)', required: true },
    { id: 'product', label: 'Nome do produto', required: false },
    { id: 'quantity', label: 'Quantidade', required: true },
    { id: 'unit_price', label: 'Preço unitário', required: true },
    { id: 'discount', label: 'Desconto', required: false },
    { id: 'order_id', label: 'Número do pedido', required: false },
    { id: 'store', label: 'Loja', required: false },
  ],
  sample: {
    fileName: 'vendas_outubro.csv',
    sizeBytes: 1_948_000,
    delimiter: ';',
    encoding: 'UTF-8',
    firstDate: '2026-10-01',
    lastDate: '2026-10-26',
    totalRows: 31482,
    columns: ['data', 'cod_produto', 'descricao', 'qtd', 'vlr_unit', 'desc', 'cupom', 'filial'],
    rows: [
      ['2026-10-01', 'PAD-0601', 'Pão de fermentação natural', '2', '22,90', '0,00', '000184', 'Centro'],
      ['2026-10-01', 'CAF-0301', 'Café especial Mirante 250 g', '1', '42,90', '0,00', '000184', 'Centro'],
      ['2026-10-01', 'FRI-0503', 'Queijo brie 150 g', '1', '32,90', '3,29', '000185', 'Centro'],
      ['2026-10-01', 'BEB-0101', 'Água mineral 1,5 L', '6', '4,49', '0,00', '000186', 'Centro'],
      ['01/10/2026', 'MER-0401', 'Azeite extravirgem português 500 ml', '1', '49,90', '0,00', '000187', 'Centro'],
      ['2026-10-01', 'HOR-0701', 'Tomate italiano (kg)', '1,35', '12,90', '0,00', '000187', 'Centro'],
      ['2026-10-01', '', 'Croissant de manteiga', '3', '9,90', '0,00', '000188', 'Centro'],
    ],
    mapping: [
      { source: 'data', sample: '2026-10-01', target: 'date', confidence: 0.98 },
      { source: 'cod_produto', sample: 'PAD-0601', target: 'sku', confidence: 0.95 },
      { source: 'descricao', sample: 'Pão de fermentação natural', target: 'product', confidence: 0.9 },
      { source: 'qtd', sample: '2', target: 'quantity', confidence: 0.93 },
      { source: 'vlr_unit', sample: '22,90', target: 'unit_price', confidence: 0.88 },
      { source: 'desc', sample: '0,00', target: 'discount', confidence: 0.61 },
      { source: 'cupom', sample: '000184', target: 'order_id', confidence: 0.74 },
      { source: 'filial', sample: 'Centro', target: null, confidence: 0.35 },
    ],
    issues: [
      { row: 5, column: 'data', value: '01/10/2026', severity: 'warning', message: 'Formato de data diferente do restante do arquivo. Será convertido para 2026-10-01.' },
      { row: 7, column: 'cod_produto', value: '', severity: 'error', message: 'Código do produto vazio. A linha será ignorada até que o SKU seja informado.' },
      { row: 1842, column: 'qtd', value: '-1', severity: 'error', message: 'Quantidade negativa. Devoluções devem ser enviadas no arquivo de devoluções.' },
      { row: 20511, column: 'vlr_unit', value: '0,00', severity: 'warning', message: 'Preço zerado. Confirme se é uma bonificação.' },
    ],
  },
};
