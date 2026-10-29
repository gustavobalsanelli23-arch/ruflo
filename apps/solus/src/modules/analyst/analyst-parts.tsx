'use client';

import { Check, Copy, Database, Loader2, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AnalystMessage, AnalystThread } from '@/lib/data/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { answerToText } from './answer-blocks';

export type Feedback = 'up' | 'down';

export interface ScopeInfo {
  items: { name: string; detail: string }[];
  note: string;
}

export function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  scope,
}: {
  threads: AnalystThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  scope: ScopeInfo;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Button variant="outline" className="justify-start" onClick={onNew}>
        <Plus aria-hidden="true" />
        Nova análise
      </Button>
      <nav aria-label="Conversas anteriores">
        <p className="mb-1.5 px-2 text-xs text-subtle-foreground">Recentes</p>
        {threads.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  aria-current={thread.id === activeId ? 'true' : undefined}
                  className={cn(
                    'w-full rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60',
                    thread.id === activeId && 'bg-accent',
                  )}
                >
                  <span className={cn('block truncate text-sm', thread.id === activeId ? 'font-medium text-foreground' : 'text-foreground/90')}>{thread.title}</span>
                  <span className="block text-xs text-subtle-foreground">{formatDateTime(thread.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <section aria-labelledby="escopo-dados" className="rounded-lg border p-3">
        <h2 id="escopo-dados" className="text-xs font-medium text-muted-foreground">
          Dados que o analista consulta
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs">
          {scope.items.map((item) => (
            <li key={item.name} className="flex items-center gap-2">
              <Database aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" />
              <span className="text-foreground">{item.name}</span>
              <span className="ml-auto text-subtle-foreground">{item.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t pt-2.5 text-2xs leading-4 text-subtle-foreground">{scope.note}</p>
      </section>
    </div>
  );
}

function IconAction({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn('text-muted-foreground hover:text-foreground', pressed && 'bg-accent text-foreground')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AnswerHeader({
  message,
  badge,
  feedback,
  onFeedback,
}: {
  message: AnalystMessage;
  badge: { label: string; variant: 'warning' | 'neutral' | 'brand' };
  feedback?: Feedback;
  onFeedback?: (value: Feedback) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answerToText(message.blocks ?? []));
      setCopied(true);
      toast.success('Resposta copiada', { description: 'Texto com a resposta, os números, os fatos e as recomendações.' });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Não foi possível copiar', { description: 'O navegador bloqueou a área de transferência. Selecione o texto e copie manualmente.' });
    }
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <LogoMark className="size-6 text-brand" />
      <span className="text-sm font-medium text-foreground">Analista SOLUS</span>
      <Badge variant={badge.variant}>{badge.label}</Badge>
      <time dateTime={message.at} className="text-xs text-subtle-foreground">
        {formatDateTime(message.at)}
      </time>
      <div className="ml-auto flex items-center gap-0.5">
        <IconAction label={copied ? 'Copiada' : 'Copiar resposta'} onClick={copy}>
          {copied ? <Check aria-hidden="true" className="text-positive-text" /> : <Copy aria-hidden="true" />}
        </IconAction>
        {onFeedback && (
          <>
            <IconAction label="Resposta útil" pressed={feedback === 'up'} onClick={() => onFeedback('up')}>
              <ThumbsUp aria-hidden="true" />
            </IconAction>
            <IconAction label="Resposta não ajudou" pressed={feedback === 'down'} onClick={() => onFeedback('down')}>
              <ThumbsDown aria-hidden="true" />
            </IconAction>
          </>
        )}
      </div>
    </div>
  );
}

/** Progress while the analyst works: the steps done so far, the current one spinning. */
export function Thinking({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div role="status" aria-label="Analisando a pergunta" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <LogoMark className="size-6 animate-pulse text-brand motion-reduce:animate-none" />
        <span className="text-sm font-medium text-foreground">Analisando…</span>
      </div>
      <ol className="flex flex-col gap-1.5 text-sm">
        {steps.map((label, index) => (
          <li key={`${label}-${index}`} className={cn('flex items-center gap-2', index > current ? 'text-subtle-foreground' : 'text-muted-foreground')}>
            {index < current ? (
              <Check aria-hidden="true" className="size-3.5 text-positive-text" />
            ) : index === current ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-brand" />
            ) : (
              <span aria-hidden="true" className="size-3.5" />
            )}
            {label}…
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="flex flex-col gap-2.5">
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[78%]" />
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="mt-1 h-40 rounded-lg" />
      </div>
    </div>
  );
}
