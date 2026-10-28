'use client';

import { Check, Copy, Database, History, Loader2, Plus, SendHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AnalystData, AnalystMessage, AnalystThread, AnswerBlock } from '@/lib/data/types';
import { formatDateTime } from '@/lib/format';
import { useReturnFocus } from '@/lib/use-return-focus';
import { cn } from '@/lib/utils';
import { AnswerBlocks, answerToText } from './answer-blocks';

const THINKING_STEPS = ['Lendo vendas por item', 'Comparando com o período anterior', 'Separando fatos de hipóteses'];
const DATA_SCOPE = [
  { name: 'Vendas por item', detail: '730 dias' },
  { name: 'Posição de estoque', detail: 'Diária' },
  { name: 'Custos de compra', detail: 'Notas fiscais' },
  { name: 'Cadastro de produtos', detail: '44 itens' },
];

type Feedback = 'up' | 'down';

function demoNotice(data: AnalystData): AnswerBlock[] {
  return [
    {
      kind: 'summary',
      text: 'Nesta demonstração, o analista responde às perguntas sugeridas com análises roteirizadas sobre os dados fictícios. Perguntas livres serão respondidas quando o modelo de IA for conectado, em uma fase posterior.',
    },
    { kind: 'next', items: data.suggestions.map((s) => s.question) },
  ];
}

function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
}: {
  threads: AnalystThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Button variant="outline" className="justify-start" onClick={onNew}>
        <Plus aria-hidden="true" />
        Nova análise
      </Button>
      <nav aria-label="Conversas anteriores">
        <p className="mb-1.5 px-2 text-xs text-subtle-foreground">Recentes</p>
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
      </nav>
      <section aria-labelledby="escopo-dados" className="rounded-lg border p-3">
        <h2 id="escopo-dados" className="text-xs font-medium text-muted-foreground">
          Dados que o analista consulta
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs">
          {DATA_SCOPE.map((scope) => (
            <li key={scope.name} className="flex items-center gap-2">
              <Database aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" />
              <span className="text-foreground">{scope.name}</span>
              <span className="ml-auto text-subtle-foreground">{scope.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t pt-2.5 text-2xs leading-4 text-subtle-foreground">
          Demonstração: respostas roteirizadas sobre dados fictícios. Nenhum modelo de IA é chamado.
        </p>
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

function AnswerHeader({
  message,
  feedback,
  onFeedback,
}: {
  message: AnalystMessage;
  feedback: Feedback | undefined;
  onFeedback: (value: Feedback) => void;
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
      <Badge variant="warning">Resposta de demonstração</Badge>
      <time dateTime={message.at} className="text-xs text-subtle-foreground">
        {formatDateTime(message.at)}
      </time>
      <div className="ml-auto flex items-center gap-0.5">
        <IconAction label={copied ? 'Copiada' : 'Copiar resposta'} onClick={copy}>
          {copied ? <Check aria-hidden="true" className="text-positive-text" /> : <Copy aria-hidden="true" />}
        </IconAction>
        <IconAction label="Resposta útil" pressed={feedback === 'up'} onClick={() => onFeedback('up')}>
          <ThumbsUp aria-hidden="true" />
        </IconAction>
        <IconAction label="Resposta não ajudou" pressed={feedback === 'down'} onClick={() => onFeedback('down')}>
          <ThumbsDown aria-hidden="true" />
        </IconAction>
      </div>
    </div>
  );
}

function Thinking({ step }: { step: number }) {
  return (
    <div role="status" aria-label="Analisando a pergunta" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <LogoMark className="size-6 animate-pulse text-brand motion-reduce:animate-none" />
        <span className="text-sm font-medium text-foreground">Analisando…</span>
      </div>
      <ol className="flex flex-col gap-1.5 text-sm">
        {THINKING_STEPS.map((label, index) => (
          <li key={label} className={cn('flex items-center gap-2', index > step ? 'text-subtle-foreground' : 'text-muted-foreground')}>
            {index < step ? (
              <Check aria-hidden="true" className="size-3.5 text-positive-text" />
            ) : index === step ? (
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

export function AnalystWorkspace({ data }: { data: AnalystData }) {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [threads, setThreads] = useState<AnalystThread[]>(data.threads);
  const [activeId, setActiveId] = useState<string | null>(data.threads[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const asked = useRef(false);
  const scrollOnNext = useRef(false);
  const returnFocus = useReturnFocus();

  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const messageCount = active?.messages.length ?? 0;

  /** `fresh` starts a new conversation even when one is open (deep links always do). */
  const ask = (question: string, options: { fresh?: boolean } = {}) => {
    const text = question.trim();
    if (!text || thinking !== null) return;
    const now = new Date().toISOString();
    const userMessage: AnalystMessage = { id: `u-${now}`, role: 'user', at: now, text };
    const current = options.fresh ? null : active;
    let threadId = current?.id ?? null;
    if (!current) {
      threadId = `t-${now}`;
      setThreads((previous) => [{ id: threadId as string, title: text, updatedAt: now, messages: [userMessage] }, ...previous]);
      setActiveId(threadId);
    } else {
      setThreads((previous) => previous.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, userMessage], updatedAt: now } : t)));
    }
    setDraft('');
    setThinking(0);
    scrollOnNext.current = true;
    const scripted = data.suggestions.find((s) => s.question === text);
    const blocks = scripted ? data.scriptedAnswers[scripted.id] : undefined;
    const stepMs = reduce ? 150 : 520;
    THINKING_STEPS.forEach((_, index) => window.setTimeout(() => setThinking(index), index * stepMs));
    window.setTimeout(() => {
      const at = new Date().toISOString();
      const reply: AnalystMessage = { id: `a-${at}`, role: 'analyst', at, blocks: blocks ?? demoNotice(data) };
      setThreads((previous) => previous.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, reply] } : t)));
      setThinking(null);
    }, THINKING_STEPS.length * stepMs);
  };

  // A new question or answer scrolls to its start, so reading begins at the top of what changed.
  useEffect(() => {
    if (!scrollOnNext.current) return;
    lastMessageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (thinking === null) scrollOnNext.current = false;
  }, [messageCount, thinking, reduce]);

  // Deep link from the command menu or an opportunity: /analista?pergunta=<suggestion id>.
  useEffect(() => {
    const id = params.get('pergunta');
    const suggestion = data.suggestions.find((s) => s.id === id);
    if (!suggestion || asked.current) return;
    asked.current = true;
    const timer = window.setTimeout(() => ask(suggestion.question, { fresh: true }), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const startNew = () => {
    setActiveId(null);
    setHistoryOpen(false);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  };

  const rate = (messageId: string, value: Feedback) => {
    setFeedback((previous) => {
      const next = { ...previous };
      if (previous[messageId] === value) delete next[messageId];
      else next[messageId] = value;
      return next;
    });
    if (feedback[messageId] !== value) {
      toast.success(value === 'up' ? 'Obrigado pelo retorno' : 'Retorno registrado', {
        description: 'Ambiente de demonstração: a avaliação não é salva.',
      });
    }
  };

  const list = (
    <ThreadList
      threads={threads}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        setHistoryOpen(false);
      }}
      onNew={startNew}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Histórico e contexto">
        <div className="sticky top-20">{list}</div>
      </aside>

      <div className="flex min-h-[calc(100dvh-14rem)] min-w-0 flex-col">
        <div className="mb-4 flex items-center gap-2 lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              returnFocus.capture();
              setHistoryOpen(true);
            }}
          >
            <History aria-hidden="true" />
            Conversas
          </Button>
          <Button variant="ghost" size="sm" onClick={startNew}>
            <Plus aria-hidden="true" />
            Nova análise
          </Button>
        </div>

        <div className="flex max-w-4xl flex-1 flex-col gap-10 pb-8">
          {!active && (
            <section aria-labelledby="analyst-start" className="pt-2">
              <h2 id="analyst-start" className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                O que você quer entender?
              </h2>
              <p className="mt-1 max-w-[60ch] text-base text-muted-foreground">
                Pergunte sobre vendas, margem, estoque ou fornecedores. Cada resposta traz os números, separa fatos de hipóteses, recomenda o que fazer e
                cita os dados usados.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onClick={() => ask(suggestion.question)}
                      className="surface group flex h-full w-full flex-col rounded-xl p-4 text-left outline-none transition-[border-color,background-color] hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <span className="text-xs text-subtle-foreground">{suggestion.theme}</span>
                      <span className="mt-1 text-base leading-6 font-medium text-foreground">{suggestion.question}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 group-hover:underline">
                        <SendHorizontal aria-hidden="true" className="size-3.5" />
                        Perguntar
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div aria-live="polite" className="flex flex-col gap-10">
            {active?.messages.map((message, index) => {
              const isLast = index === active.messages.length - 1;
              return message.role === 'user' ? (
                <div key={message.id} ref={isLast ? lastMessageRef : undefined} className="scroll-mt-24 border-b pb-4">
                  <p className="text-xs text-subtle-foreground">
                    Pergunta, <time dateTime={message.at}>{formatDateTime(message.at)}</time>
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.015em] text-foreground sm:text-2xl">{message.text}</h2>
                </div>
              ) : (
                <article key={message.id} ref={isLast ? lastMessageRef : undefined} aria-label="Resposta do analista" className="scroll-mt-24">
                  <AnswerHeader message={message} feedback={feedback[message.id]} onFeedback={(value) => rate(message.id, value)} />
                  <AnswerBlocks blocks={message.blocks ?? []} onFollowUp={ask} />
                </article>
              );
            })}
            {thinking !== null && <Thinking step={thinking} />}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
          className="glass sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 max-w-4xl rounded-xl border p-2 shadow-raised lg:bottom-4"
        >
          <label htmlFor="pergunta" className="sr-only">
            Pergunta para o analista
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              ref={composerRef}
              id="pergunta"
              name="pergunta"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
              rows={1}
              placeholder="Pergunte sobre vendas, margem ou estoque…"
              className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none [field-sizing:content] focus-visible:ring-0 dark:bg-transparent"
            />
            <Button type="submit" size="icon" aria-label="Enviar pergunta" disabled={!draft.trim() || thinking !== null}>
              {thinking !== null ? <Loader2 aria-hidden="true" className="animate-spin" /> : <SendHorizontal aria-hidden="true" />}
            </Button>
          </div>
          <p className="hidden px-2 pt-1 pb-0.5 text-2xs text-subtle-foreground sm:block">
            Enter envia, Shift + Enter quebra a linha. Respostas desta demonstração são roteirizadas.
          </p>
        </form>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[min(86vw,320px)] overflow-y-auto overscroll-contain p-4" onCloseAutoFocus={returnFocus.onCloseAutoFocus}>
          <SheetHeader className="p-0 pb-3">
            <SheetTitle>Conversas</SheetTitle>
          </SheetHeader>
          {list}
        </SheetContent>
      </Sheet>
    </div>
  );
}
