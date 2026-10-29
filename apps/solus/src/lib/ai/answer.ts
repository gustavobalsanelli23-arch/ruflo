import type { AnswerBlock } from '@/lib/data/types';
import { sentences, unverified, type Ground } from './grounding';
import type { AnswerDraft } from './tools';
import type { ToolOutput } from './types';

/**
 * Turns the model's draft into the answer the interface renders. Metric
 * cards, tables and charts are built here from the tool results the draft
 * points to (by ref): the model chooses what to show but never transcribes
 * those numbers. Its text is checked against the same results.
 */

export interface ResolvedAnswer {
  blocks: AnswerBlock[];
  /** Passages withheld because a number or date was not in the data. */
  removed: string[];
  /** Visualizations the draft asked for that do not exist in the results. */
  dropped: string[];
  /** Plain text of the answer, used as context for follow-up questions. */
  text: string;
}

const textsOf = (draft: AnswerDraft) => [
  draft.resumo,
  ...draft.blocos.map((block) => block.titulo),
  ...draft.fatos,
  ...draft.hipoteses,
  ...draft.recomendacoes,
  ...draft.limitacoes,
  ...draft.perguntas_seguintes,
];

/** Numbers and dates in the draft that do not appear in the results. */
export function checkDraft(draft: AnswerDraft, ground: Ground): string[] {
  return [...new Set(textsOf(draft).flatMap((text) => unverified(text, ground)))];
}

const DEFAULT_METRICS = ['receita_liquida', 'lucro_bruto', 'margem_bruta', 'ticket_medio'];

function visual(block: AnswerDraft['blocos'][number], output: ToolOutput | undefined, title: string): AnswerBlock | string {
  if (!output) return `"${block.titulo}": consulta ${block.ref} inexistente`;
  if (block.tipo === 'indicadores') {
    if (!output.metrics) return `"${block.titulo}": ${block.ref} não tem indicadores`;
    const wanted = block.campos.length > 0 ? block.campos : DEFAULT_METRICS;
    const items = wanted
      .map((id) => output.metrics!.find((metric) => metric.id === id))
      .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))
      .slice(0, 4)
      .map(({ label, value, delta, tone }) => ({ label, value, delta, tone }));
    return items.length > 0 ? { kind: 'metrics', items } : `"${block.titulo}": indicadores desconhecidos`;
  }
  if (block.tipo === 'tabela') {
    if (!output.table || output.table.rows.length === 0) return `"${block.titulo}": ${block.ref} não tem linhas para mostrar`;
    const [first, ...others] = output.table.columns;
    const chosen = block.campos.length > 0 ? others.filter((column) => block.campos.includes(column.key)) : others;
    return { kind: 'table', title, columns: [first!, ...chosen], rows: output.table.rows, note: `Fonte: ${output.source.name}, ${output.source.detail}.` };
  }
  if (!output.series) return `"${block.titulo}": ${block.ref} não é uma série no tempo`;
  const serie = block.campos[0] ?? 'receita_liquida';
  if (!['receita_liquida', 'lucro_bruto', 'margem_bruta'].includes(serie)) return `"${block.titulo}": série ${serie} desconhecida`;
  const points = output.series
    .map((point) => ({ label: point.label, value: point.values[serie] }))
    .filter((point): point is { label: string; value: number } => typeof point.value === 'number');
  if (points.length < 2) return `"${block.titulo}": pontos insuficientes para um gráfico`;
  return { kind: 'chart', title, unit: serie === 'margem_bruta' ? 'percent' : 'currency', points, layout: 'line' };
}

/**
 * With `strip`, passages carrying an unverified number are removed (sentences
 * of the summary, whole list items) and the answer says so.
 */
export function resolveAnswer(draft: AnswerDraft, outputs: ToolOutput[], ground: Ground, strip: boolean): ResolvedAnswer {
  const removed: string[] = [];
  const keep = (text: string) => {
    if (!strip || unverified(text, ground).length === 0) return true;
    removed.push(text);
    return false;
  };
  const summaryParts = sentences(draft.resumo).filter(keep);
  const summary = summaryParts.length > 0 ? summaryParts.join(' ') : 'Não foi possível confirmar nos dados consultados os números desta resposta.';
  const list = (items: string[]) => items.filter(keep);
  const facts = list(draft.fatos);
  const hypotheses = list(draft.hipoteses);
  const recommendations = list(draft.recomendacoes);
  const limitations = list(draft.limitacoes);
  const next = list(draft.perguntas_seguintes);

  const byRef = new Map(outputs.map((output) => [output.ref, output]));
  const dropped: string[] = [];
  const visuals: AnswerBlock[] = [];
  for (const block of draft.blocos) {
    const output = byRef.get(block.ref);
    const title = !strip || unverified(block.titulo, ground).length === 0 ? block.titulo || (output?.source.name ?? '') : (output?.source.name ?? '');
    const result = visual(block, output, title);
    if (typeof result === 'string') dropped.push(result);
    else visuals.push(result);
  }

  // Limitações vindas das próprias consultas entram mesmo que o modelo não as cite.
  const fromTools = outputs.flatMap((output) => (Array.isArray(output.data.limitacoes) ? (output.data.limitacoes as string[]) : []));
  const notes = [...new Set([...limitations, ...fromTools])];

  const blocks: AnswerBlock[] = [{ kind: 'summary', text: summary }, ...visuals];
  if (facts.length > 0 || hypotheses.length > 0) blocks.push({ kind: 'findings', facts, hypotheses });
  if (recommendations.length > 0) blocks.push({ kind: 'recommendation', items: recommendations });
  if (notes.length > 0) blocks.push({ kind: 'notice', tone: 'info', title: 'Limitações dos dados', items: notes });
  if (removed.length > 0) {
    blocks.push({
      kind: 'notice',
      tone: 'warning',
      title: 'Trechos retirados da resposta',
      items: [
        `${removed.length} ${removed.length === 1 ? 'trecho trazia' : 'trechos traziam'} números que não aparecem nos dados consultados e ${removed.length === 1 ? 'foi retirado' : 'foram retirados'}. Pergunte de novo de forma mais específica, se precisar deles.`,
      ],
    });
  }
  const sources = [...new Map(outputs.map((output) => [`${output.source.name}|${output.source.detail}`, output.source])).values()];
  if (sources.length > 0) blocks.push({ kind: 'sources', items: sources });
  if (next.length > 0) blocks.push({ kind: 'next', items: next });

  const text = [summary, ...facts.map((fact) => `- ${fact}`)].join('\n');
  return { blocks, removed, dropped, text };
}
