'use client';

import { Check, History, Loader2, Plus, SendHorizontal } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { AnalystData, AnalystMessage, AnalystThread, AnswerBlock } from '@/lib/data/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AnswerBlocks } from './answer-blocks';

const THINKING_STEPS = ['Lendo vendas por item', 'Comparando com o período anterior', 'Separando fatos de hipóteses'];
const DATA_SCOPE = ['Vendas por item, 730 dias', 'Posição de estoque', 'Custos de compra', 'Cadastro de produtos'];

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
    <div className="flex flex-col gap-3">
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
                <span className="block truncate text-sm text-foreground">{thread.title}</span>
                <span className="block text-xs text-subtle-foreground">{formatDateTime(thread.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function AnalystHeader({ at }: { at: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <LogoMark className="size-6 text-brand" />
      <span className="text-sm font-medium text-foreground">Analista SOLUS</span>
      <Badge variant="warning">Resposta de demonstração</Badge>
      <time dateTime={at} className="text-xs text-subtle-foreground">
        {formatDateTime(at)}
      </time>
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
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const active = threads.find((thread) => thread.id === activeId) ?? null;

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || thinking !== null) return;
    const now = new Date().toISOString();
    const userMessage: AnalystMessage = { id: `u-${now}`, role: 'user', at: now, text };
    let threadId = activeId;
    if (!active) {
      threadId = `t-${now}`;
      setThreads((previous) => [{ id: threadId as string, title: text, updatedAt: now, messages: [userMessage] }, ...previous]);
      setActiveId(threadId);
    } else {
      setThreads((previous) => previous.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, userMessage], updatedAt: now } : t)));
    }
    setDraft('');
    setThinking(0);
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [threads, thinking, reduce]);

  // Deep link from the command menu: /analista?pergunta=<suggestion id>.
  useEffect(() => {
    const id = params.get('pergunta');
    const suggestion = data.suggestions.find((s) => s.id === id);
    if (!suggestion || asked.current) return;
    asked.current = true;
    setActiveId(null);
    const timer = window.setTimeout(() => ask(suggestion.question), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const startNew = () => {
    setActiveId(null);
    setHistoryOpen(false);
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-20">{list}</div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="mb-4 flex items-center gap-2 lg:hidden">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History aria-hidden="true" />
            Conversas
          </Button>
          <Button variant="ghost" size="sm" onClick={startNew}>
            <Plus aria-hidden="true" />
            Nova análise
          </Button>
        </div>

        <div className="flex min-h-[50vh] flex-col gap-10 pb-6" aria-live="polite">
          {!active && (
            <section aria-labelledby="analyst-start" className="pt-4">
              <h2 id="analyst-start" className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                O que você quer entender?
              </h2>
              <p className="mt-1 max-w-[60ch] text-base text-muted-foreground">
                Pergunte sobre vendas, margem, estoque ou fornecedores. Cada resposta mostra os números, separa fatos de hipóteses e cita os dados usados.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => ask(suggestion.question)}
                    className="surface rounded-xl p-4 text-left outline-none transition-[border-color,background-color] hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="block text-xs text-subtle-foreground">{suggestion.theme}</span>
                    <span className="mt-1 block text-base font-medium leading-6 text-foreground">{suggestion.question}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-xs text-subtle-foreground">Dados disponíveis para o analista</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {DATA_SCOPE.map((scope) => (
                    <li key={scope} className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
                      {scope}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {active?.messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="border-b pb-4">
                <h2 className="text-xl font-semibold tracking-[-0.015em] text-foreground sm:text-2xl">{message.text}</h2>
              </div>
            ) : (
              <article key={message.id} aria-label="Resposta do analista">
                <AnalystHeader at={message.at} />
                <AnswerBlocks blocks={message.blocks ?? []} onFollowUp={ask} />
              </article>
            ),
          )}

          {thinking !== null && (
            <div role="status" className="rounded-xl border border-dashed p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <LogoMark className="size-6 text-brand" />
                <span className="text-sm font-medium text-foreground">Analisando…</span>
              </div>
              <ol className="flex flex-col gap-1.5 text-sm">
                {THINKING_STEPS.map((step, index) => (
                  <li key={step} className={cn('flex items-center gap-2', index > thinking ? 'text-subtle-foreground' : 'text-muted-foreground')}>
                    {index < thinking ? (
                      <Check aria-hidden="true" className="size-3.5 text-positive-text" />
                    ) : index === thinking ? (
                      <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-brand" />
                    ) : (
                      <span aria-hidden="true" className="size-3.5" />
                    )}
                    {step}…
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
          className="glass sticky bottom-16 z-10 rounded-xl border p-2 shadow-raised lg:bottom-4"
        >
          <label htmlFor="pergunta" className="sr-only">
            Pergunta para o analista
          </label>
          <div className="flex items-end gap-2">
            <Textarea
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
              className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <Button type="submit" size="icon" aria-label="Enviar pergunta" disabled={!draft.trim() || thinking !== null}>
              <SendHorizontal aria-hidden="true" />
            </Button>
          </div>
          <p className="hidden px-2 pt-1 pb-0.5 text-2xs text-subtle-foreground sm:block">
            Enter envia, Shift + Enter quebra a linha. Respostas desta demonstração são roteirizadas.
          </p>
        </form>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[min(86vw,320px)] overscroll-contain p-4">
          <SheetHeader className="p-0 pb-3">
            <SheetTitle>Conversas</SheetTitle>
          </SheetHeader>
          {list}
        </SheetContent>
      </Sheet>
    </div>
  );
}
