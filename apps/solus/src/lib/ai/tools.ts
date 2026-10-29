import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { evolution, groupSummary, opportunityQuery, periodSummary, productRanking, stockQuery, STOCK_LABEL, type Failure } from './queries';
import type { AnalystDataSource, SourceContext, ToolOutput } from './types';

/**
 * Tools offered to the model. All of them only read; none writes or reaches
 * anything outside the data source. Schemas are strict (the API guarantees
 * the shape) and inputs are validated again here, with limits the JSON
 * Schema subset cannot express.
 */

const nullableString = (description: string) => ({ anyOf: [{ type: 'string' }, { type: 'null' }], description });

const PERIOD_PROPERTIES = {
  periodo: {
    type: 'string',
    enum: ['7d', '30d', '90d', '12m', 'ytd', 'personalizado'],
    description:
      'Período que termina no último dia com vendas importadas: 7d, 30d, 90d, 12m (meses inteiros) ou ytd (ano até a data). "personalizado" usa inicio e fim.',
  },
  inicio: nullableString('Início (AAAA-MM-DD) quando periodo = "personalizado"; senão null.'),
  fim: nullableString('Fim (AAAA-MM-DD) quando periodo = "personalizado"; senão null.'),
};
const PERIOD_REQUIRED = ['periodo', 'inicio', 'fim'];

const object = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object' as const,
  properties,
  required,
  additionalProperties: false,
});

export const RESPOND_TOOL = 'responder';

export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'resumo_periodo',
    description:
      'Totais de um período e do período anterior de mesmo tamanho: receita bruta, descontos, devoluções, receita líquida, CMV, lucro bruto, margem bruta, número de vendas, ticket médio, unidades e a variação de cada um. Use para perguntas sobre desempenho geral.',
    strict: true,
    input_schema: object(PERIOD_PROPERTIES, PERIOD_REQUIRED),
  },
  {
    name: 'evolucao',
    description: 'Série de receita líquida, lucro bruto e margem bruta por dia, semana ou mês, com a receita do período anterior equivalente. Use para tendências e gráficos.',
    strict: true,
    input_schema: object(
      {
        ...PERIOD_PROPERTIES,
        granularidade: { anyOf: [{ type: 'string', enum: ['dia', 'semana', 'mes'] }, { type: 'null' }], description: 'null escolhe pelo tamanho do período.' },
      },
      [...PERIOD_REQUIRED, 'granularidade'],
    ),
  },
  {
    name: 'produtos',
    description:
      'Produtos de um período ordenados por uma métrica, com receita, variação contra o período anterior, lucro bruto, margem, unidades, desconto e quanto da receita tem custo conhecido. Filtros por categoria, fornecedor ou texto (nome ou SKU). No máximo 20 linhas.',
    strict: true,
    input_schema: object(
      {
        ...PERIOD_PROPERTIES,
        ordenar_por: { type: 'string', enum: ['receita_liquida', 'lucro_bruto', 'margem_bruta', 'unidades', 'desconto', 'variacao_receita'] },
        ordem: { type: 'string', enum: ['maior', 'menor'], description: '"maior" lista do maior para o menor.' },
        limite: { type: 'integer', description: 'Quantidade de linhas, de 1 a 20.' },
        categoria: nullableString('Parte do nome da categoria, ou null.'),
        fornecedor: nullableString('Parte do nome do fornecedor, ou null.'),
        busca: nullableString('Parte do nome ou do SKU do produto, ou null.'),
      },
      [...PERIOD_REQUIRED, 'ordenar_por', 'ordem', 'limite', 'categoria', 'fornecedor', 'busca'],
    ),
  },
  {
    name: 'grupos',
    description: 'Receita líquida, variação, participação, lucro bruto e margem por categoria ou por fornecedor em um período.',
    strict: true,
    input_schema: object({ ...PERIOD_PROPERTIES, agrupar_por: { type: 'string', enum: ['categoria', 'fornecedor'] } }, [...PERIOD_REQUIRED, 'agrupar_por']),
  },
  {
    name: 'estoque',
    description:
      'Última posição de estoque: capital total, giro anual, itens por situação (ruptura, risco de ruptura, parado, giro baixo/médio/alto…) e os itens filtrados, com estoque, capital, venda média por dia, cobertura em dias, dias sem venda e prazo de reposição. No máximo 20 linhas.',
    strict: true,
    input_schema: object(
      {
        situacoes: {
          type: 'array',
          items: { type: 'string', enum: Object.keys(STOCK_LABEL) },
          description: 'Situações a listar; lista vazia lista todas.',
        },
        categoria: nullableString('Parte do nome da categoria, ou null.'),
        ordenar_por: { type: 'string', enum: ['capital', 'cobertura', 'dias_sem_venda'] },
        ordem: { type: 'string', enum: ['maior', 'menor'] },
        limite: { type: 'integer', description: 'Quantidade de linhas, de 1 a 20.' },
      },
      ['situacoes', 'categoria', 'ordenar_por', 'ordem', 'limite'],
    ),
  },
  {
    name: 'oportunidades',
    description:
      'Oportunidades detectadas pelo motor de regras (margem, estoque, ruptura, queda de vendas), com prioridade, confiança e impacto estimado. Com id, traz os fatos, as hipóteses e as recomendações daquela oportunidade.',
    strict: true,
    input_schema: object(
      { situacao: { type: 'string', enum: ['abertas', 'todas'] }, id: nullableString('Id de uma oportunidade específica, ou null.') },
      ['situacao', 'id'],
    ),
  },
  {
    name: RESPOND_TOOL,
    description:
      'Entrega a resposta final. Chame uma única vez, sozinha, depois de consultar os dados. Todo número no texto deve ter vindo de uma consulta. Os blocos mostram tabelas, gráficos e indicadores a partir do "ref" de uma consulta.',
    strict: true,
    input_schema: object(
      {
        resumo: { type: 'string', description: 'Resposta direta em 1 a 3 frases.' },
        blocos: {
          type: 'array',
          description: 'Visualizações, na ordem em que aparecem. Pode ser vazia.',
          items: object(
            {
              tipo: { type: 'string', enum: ['indicadores', 'tabela', 'grafico'] },
              ref: { type: 'string', description: 'O ref de uma consulta desta resposta.' },
              titulo: { type: 'string' },
              campos: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'indicadores: ids das métricas do resumo_periodo (até 4). tabela: chaves de colunas_da_tabela (vazia = todas). grafico: uma série (receita_liquida, lucro_bruto ou margem_bruta).',
              },
            },
            ['tipo', 'ref', 'titulo', 'campos'],
          ),
        },
        fatos: { type: 'array', items: { type: 'string' }, description: 'O que os dados mostram, cada um com o número que o sustenta.' },
        hipoteses: { type: 'array', items: { type: 'string' }, description: 'Explicações possíveis que os dados não confirmam.' },
        recomendacoes: { type: 'array', items: { type: 'string' }, description: 'Ações práticas.' },
        limitacoes: { type: 'array', items: { type: 'string' }, description: 'O que não foi possível avaliar e por quê.' },
        perguntas_seguintes: { type: 'array', items: { type: 'string' }, description: 'Até 3 perguntas que aprofundam a análise.' },
      },
      ['resumo', 'blocos', 'fatos', 'hipoteses', 'recomendacoes', 'limitacoes', 'perguntas_seguintes'],
    ),
  },
];

/* ---------- validação das entradas ---------- */

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const period = { periodo: z.enum(['7d', '30d', '90d', '12m', 'ytd', 'personalizado']), inicio: iso, fim: iso };
const filter = z.string().trim().max(80).nullable();
const limit = z.number().int().min(1).max(20);

const INPUTS = {
  resumo_periodo: z.object(period).strict(),
  evolucao: z.object({ ...period, granularidade: z.enum(['dia', 'semana', 'mes']).nullable() }).strict(),
  produtos: z
    .object({
      ...period,
      ordenar_por: z.enum(['receita_liquida', 'lucro_bruto', 'margem_bruta', 'unidades', 'desconto', 'variacao_receita']),
      ordem: z.enum(['maior', 'menor']),
      limite: limit,
      categoria: filter,
      fornecedor: filter,
      busca: filter,
    })
    .strict(),
  grupos: z.object({ ...period, agrupar_por: z.enum(['categoria', 'fornecedor']) }).strict(),
  estoque: z
    .object({
      situacoes: z.array(z.enum(Object.keys(STOCK_LABEL) as [keyof typeof STOCK_LABEL, ...(keyof typeof STOCK_LABEL)[]])).max(8),
      categoria: filter,
      ordenar_por: z.enum(['capital', 'cobertura', 'dias_sem_venda']),
      ordem: z.enum(['maior', 'menor']),
      limite: limit,
    })
    .strict(),
  oportunidades: z.object({ situacao: z.enum(['abertas', 'todas']), id: z.string().max(80).nullable() }).strict(),
} as const;

export type DataToolName = keyof typeof INPUTS;
export const DATA_TOOLS = Object.keys(INPUTS) as DataToolName[];

const text = z.string().trim().max(1200);
const list = (max: number) => z.array(z.string().trim().min(1).max(600)).max(max);

export const answerSchema = z.object({
  resumo: text.min(1),
  blocos: z
    .array(
      z.object({
        tipo: z.enum(['indicadores', 'tabela', 'grafico']),
        ref: z.string().max(10),
        titulo: z.string().trim().max(120),
        campos: z.array(z.string().max(40)).max(12),
      }),
    )
    .max(4),
  fatos: list(8),
  hipoteses: list(5),
  recomendacoes: list(5),
  limitacoes: list(5),
  perguntas_seguintes: list(3),
});
export type AnswerDraft = z.infer<typeof answerSchema>;

/** Short progress label for the interface while a tool runs. */
export function progressLabel(name: string): string {
  switch (name) {
    case 'resumo_periodo':
      return 'Somando os totais do período';
    case 'evolucao':
      return 'Montando a evolução no tempo';
    case 'produtos':
      return 'Comparando produtos';
    case 'grupos':
      return 'Agrupando por categoria ou fornecedor';
    case 'estoque':
      return 'Lendo a posição de estoque';
    case 'oportunidades':
      return 'Consultando a Central de Oportunidades';
    default:
      return 'Organizando a resposta';
  }
}

export async function runDataTool(
  name: string,
  input: unknown,
  ref: string,
  source: AnalystDataSource,
  context: SourceContext,
): Promise<ToolOutput | Failure> {
  if (!(name in INPUTS)) return { error: `Ferramenta desconhecida: ${name}.` };
  const parsed = INPUTS[name as DataToolName].safeParse(input);
  if (!parsed.success) return { error: `Parâmetros inválidos: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'entrada'}: ${issue.message}`).join('; ')}.` };
  const value = parsed.data;
  switch (name as DataToolName) {
    case 'resumo_periodo':
      return periodSummary(source, context, value as z.infer<(typeof INPUTS)['resumo_periodo']>, ref);
    case 'evolucao':
      return evolution(source, context, value as z.infer<(typeof INPUTS)['evolucao']>, ref);
    case 'produtos':
      return productRanking(source, context, value as z.infer<(typeof INPUTS)['produtos']>, ref);
    case 'grupos':
      return groupSummary(source, context, value as z.infer<(typeof INPUTS)['grupos']>, ref);
    case 'estoque':
      return stockQuery(source, value as z.infer<(typeof INPUTS)['estoque']>, ref);
    case 'oportunidades':
      return opportunityQuery(source, value as z.infer<(typeof INPUTS)['oportunidades']>, ref);
  }
}
