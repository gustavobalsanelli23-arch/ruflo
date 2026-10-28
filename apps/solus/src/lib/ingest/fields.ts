import type { Dataset } from './types';

/**
 * The fields of each dataset: what the import understands, which are
 * required and the header names recognized automatically (compared without
 * accents, case or punctuation).
 */

export type FieldType = 'date' | 'decimal' | 'integer' | 'text' | 'sku' | 'boolean' | 'kind';

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  hint: string;
  synonyms: string[];
  maxLength?: number;
}

const SKU_SYNONYMS = ['sku', 'codigo', 'cod', 'codigo produto', 'cod produto', 'codigo do produto', 'cod item', 'codigo item', 'referencia', 'ref', 'ean', 'gtin', 'codigo de barras', 'product code', 'item code', 'id produto'];
const NAME_SYNONYMS = ['produto', 'descricao', 'descricao produto', 'descricao do produto', 'nome produto', 'nome do produto', 'item', 'nome', 'product', 'product name', 'description'];
const COST_SYNONYMS = ['custo', 'custo unitario', 'custo medio', 'custo unit', 'vl custo', 'valor custo', 'preco custo', 'preco de custo', 'cmv unitario', 'cost', 'unit cost'];
const LEAD_TIME_SYNONYMS = ['prazo', 'prazo entrega', 'prazo de entrega', 'prazo reposicao', 'prazo de reposicao', 'dias reposicao', 'lead time', 'leadtime'];

export const DATASET_FIELDS: Record<Dataset, FieldSpec[]> = {
  sales: [
    { key: 'sold_at', label: 'Data da venda', type: 'date', required: true, hint: 'DD/MM/AAAA ou AAAA-MM-DD', synonyms: ['data', 'data venda', 'data da venda', 'dt venda', 'data emissao', 'data de emissao', 'data do pedido', 'data pedido', 'emissao', 'dia', 'date', 'sale date'] },
    { key: 'order_id', label: 'Nº do pedido ou cupom', type: 'text', required: false, maxLength: 64, hint: 'Identifica a venda. Sem ele, não há contagem de vendas nem ticket médio.', synonyms: ['pedido', 'numero pedido', 'numero do pedido', 'n pedido', 'no pedido', 'cupom', 'numero cupom', 'nota', 'nf', 'nfe', 'nfce', 'documento', 'numero documento', 'id venda', 'cod venda', 'codigo venda', 'order', 'order id', 'ticket'] },
    { key: 'sku', label: 'SKU / código do produto', type: 'sku', required: true, maxLength: 64, hint: 'Mesmo código do cadastro de produtos.', synonyms: SKU_SYNONYMS },
    { key: 'product_name', label: 'Nome do produto', type: 'text', required: false, maxLength: 200, hint: 'Usado se o SKU ainda não tiver cadastro.', synonyms: NAME_SYNONYMS },
    { key: 'quantity', label: 'Quantidade', type: 'decimal', required: true, hint: 'Negativa conta como devolução.', synonyms: ['quantidade', 'qtd', 'qtde', 'qt', 'quant', 'unidades', 'quantidade vendida', 'qtd vendida', 'quantity', 'qty'] },
    { key: 'unit_price', label: 'Preço unitário', type: 'decimal', required: false, hint: 'Preço de venda por unidade, antes do desconto. Ou informe o valor total.', synonyms: ['preco', 'preco unitario', 'preco unit', 'preco venda', 'preco de venda', 'valor unitario', 'vl unitario', 'vlr unitario', 'vl unit', 'vlr unit', 'unit price', 'price', 'pv'] },
    { key: 'line_total', label: 'Valor total da linha', type: 'decimal', required: false, hint: 'Valor cobrado (já com desconto). Usado quando não há preço unitário.', synonyms: ['total', 'valor total', 'vl total', 'vlr total', 'valor liquido', 'total liquido', 'subtotal', 'valor', 'amount', 'line total'] },
    { key: 'discount', label: 'Desconto (R$)', type: 'decimal', required: false, hint: 'Valor do desconto na linha, em reais.', synonyms: ['desconto', 'desc', 'vl desconto', 'valor desconto', 'valor do desconto', 'discount'] },
    { key: 'unit_cost', label: 'Custo unitário', type: 'decimal', required: false, hint: 'Custo na data da venda. Sem ele, usamos o custo do cadastro no momento da importação.', synonyms: COST_SYNONYMS },
    { key: 'kind', label: 'Tipo (venda ou devolução)', type: 'kind', required: false, hint: 'Venda, devolução, estorno…', synonyms: ['tipo', 'tipo movimento', 'tipo de movimento', 'operacao', 'movimento', 'natureza', 'type'] },
    { key: 'channel', label: 'Canal ou loja', type: 'text', required: false, maxLength: 60, hint: 'Loja física, e-commerce…', synonyms: ['canal', 'canal venda', 'canal de venda', 'loja', 'origem', 'channel', 'store'] },
  ],
  products: [
    { key: 'sku', label: 'SKU / código do produto', type: 'sku', required: true, maxLength: 64, hint: 'Identificador único do produto.', synonyms: SKU_SYNONYMS },
    { key: 'name', label: 'Nome do produto', type: 'text', required: true, maxLength: 200, hint: '', synonyms: NAME_SYNONYMS },
    { key: 'category', label: 'Categoria', type: 'text', required: false, maxLength: 120, hint: '', synonyms: ['categoria', 'grupo', 'departamento', 'secao', 'familia', 'linha', 'category'] },
    { key: 'supplier', label: 'Fornecedor', type: 'text', required: false, maxLength: 160, hint: '', synonyms: ['fornecedor', 'fabricante', 'nome fornecedor', 'supplier', 'vendor'] },
    { key: 'unit', label: 'Unidade', type: 'text', required: false, maxLength: 20, hint: 'un, kg, cx…', synonyms: ['unidade', 'un', 'und', 'unid', 'unidade medida', 'medida', 'unit'] },
    { key: 'cost', label: 'Custo unitário atual', type: 'decimal', required: false, hint: 'Não altera o custo de vendas já importadas.', synonyms: COST_SYNONYMS },
    { key: 'price', label: 'Preço de venda atual', type: 'decimal', required: false, hint: '', synonyms: ['preco', 'preco venda', 'preco de venda', 'preco unitario', 'valor venda', 'pv', 'price'] },
    { key: 'lead_time_days', label: 'Prazo de reposição (dias)', type: 'integer', required: false, hint: 'Usado no risco de ruptura.', synonyms: LEAD_TIME_SYNONYMS },
    { key: 'perishable', label: 'Perecível', type: 'boolean', required: false, hint: 'Sim/Não', synonyms: ['perecivel', 'perishable'] },
    { key: 'active', label: 'Ativo', type: 'boolean', required: false, hint: 'Sim/Não', synonyms: ['ativo', 'situacao', 'status', 'active'] },
  ],
  inventory: [
    { key: 'sku', label: 'SKU / código do produto', type: 'sku', required: true, maxLength: 64, hint: '', synonyms: SKU_SYNONYMS },
    { key: 'product_name', label: 'Nome do produto', type: 'text', required: false, maxLength: 200, hint: 'Usado se o SKU ainda não tiver cadastro.', synonyms: NAME_SYNONYMS },
    { key: 'snapshot_date', label: 'Data da posição', type: 'date', required: false, hint: 'Sem a coluna, informe a data da contagem.', synonyms: ['data', 'data estoque', 'data posicao', 'data da posicao', 'data inventario', 'data contagem', 'data da contagem', 'date'] },
    { key: 'quantity', label: 'Quantidade em estoque', type: 'decimal', required: true, hint: '', synonyms: ['quantidade', 'qtd', 'qtde', 'estoque', 'estoque atual', 'saldo', 'saldo estoque', 'saldo atual', 'qtd estoque', 'quantidade estoque', 'on hand', 'stock', 'quantity'] },
    { key: 'unit_cost', label: 'Custo unitário', type: 'decimal', required: false, hint: 'Sem ele, usamos o custo do cadastro.', synonyms: COST_SYNONYMS },
  ],
  suppliers: [
    { key: 'name', label: 'Nome do fornecedor', type: 'text', required: true, maxLength: 160, hint: '', synonyms: ['fornecedor', 'nome', 'nome fornecedor', 'razao social', 'nome fantasia', 'supplier', 'name'] },
    { key: 'code', label: 'Código', type: 'text', required: false, maxLength: 64, hint: '', synonyms: ['codigo', 'cod', 'codigo fornecedor', 'id fornecedor', 'code'] },
    { key: 'lead_time_days', label: 'Prazo de entrega (dias)', type: 'integer', required: false, hint: 'Vale para os produtos sem prazo próprio.', synonyms: LEAD_TIME_SYNONYMS },
  ],
};

export const DATASET_LABEL: Record<Dataset, string> = {
  sales: 'Vendas',
  products: 'Produtos',
  inventory: 'Estoque',
  suppliers: 'Fornecedores',
};

export const DATASET_DESCRIPTION: Record<Dataset, string> = {
  sales: 'Uma linha por item vendido ou devolvido: data, SKU, quantidade e preço.',
  products: 'Cadastro: SKU, nome, categoria, fornecedor, custo e preço atuais.',
  inventory: 'Posição de estoque por SKU em uma data.',
  suppliers: 'Fornecedores e prazos de entrega.',
};

export function fieldsOf(dataset: Dataset) {
  return DATASET_FIELDS[dataset];
}
