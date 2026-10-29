'use client';

import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Panel } from '@/components/data/panel';
import { Button } from '@/components/ui/button';
import type { AnswerBlock, PeriodKey } from '@/lib/data/types';
import { formatDateTime } from '@/lib/format';
import { AnswerBlocks } from '@/modules/analyst/answer-blocks';
import { noticeBlocks, streamAnswer } from '@/modules/analyst/live';

/**
 * Executive summary written by the AI from the period's metrics. Generated on
 * request (it costs a model call), stored per period for the whole
 * organization and marked as outdated when new data arrives. Every number in
 * it was checked against the metric layer.
 */
export function AiSummary({
  endpoint,
  period,
  initial,
  canGenerate,
}: {
  endpoint: '/api/analista' | '/api/demo/analista';
  period: PeriodKey;
  initial: { blocks: AnswerBlock[]; createdAt: string; stale: boolean } | null;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<AnswerBlock[] | null>(initial?.blocks ?? null);
  const [meta, setMeta] = useState(initial ? { createdAt: initial.createdAt, stale: initial.stale } : null);
  const [steps, setSteps] = useState<string[] | null>(null);

  const generate = async () => {
    setSteps(['Lendo as métricas do período']);
    await streamAnswer(endpoint, { mode: 'summary', period }, (event) => {
      if (event.type === 'step') setSteps((previous) => [...(previous ?? []), event.label]);
      if (event.type === 'answer') {
        setBlocks(event.blocks);
        setMeta({ createdAt: event.at, stale: false });
      }
      if (event.type === 'error') setBlocks(noticeBlocks(event.message));
    });
    setSteps(null);
    if (endpoint === '/api/analista') router.refresh();
  };

  const visible = (blocks ?? []).filter((block) => block.kind !== 'next' && block.kind !== 'sources');
  return (
    <Panel
      title="Resumo da IA"
      description="Escrito pela IA a partir das métricas do período. Cada número foi conferido com os dados; a IA não calcula valores."
      action={
        canGenerate ? (
          <Button size="sm" variant={blocks ? 'outline' : 'default'} onClick={() => void generate()} disabled={steps !== null}>
            {steps ? <Loader2 aria-hidden="true" className="animate-spin" /> : blocks ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {blocks ? 'Gerar de novo' : 'Gerar resumo'}
          </Button>
        ) : undefined
      }
    >
      {steps ? (
        <ol role="status" aria-label="Gerando o resumo" className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {steps.map((label, index) => (
            <li key={`${label}-${index}`} className="flex items-center gap-2">
              {index < steps.length - 1 ? <Check aria-hidden="true" className="size-3.5 text-positive-text" /> : <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-brand" />}
              {label}…
            </li>
          ))}
        </ol>
      ) : blocks ? (
        <div className="flex flex-col gap-3">
          <AnswerBlocks blocks={visible} />
          {meta && (
            <p className="text-xs text-subtle-foreground">
              Gerado em <time dateTime={meta.createdAt}>{formatDateTime(meta.createdAt)}</time>.
              {meta.stale && ' Há dados novos desde então: gere de novo para atualizar.'}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum resumo deste período ainda. Ele usa uma chamada ao modelo de IA e fica disponível para toda a equipe.</p>
      )}
    </Panel>
  );
}
