'use client';

import { History, Loader2, Plus, SendHorizontal } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { AnalystData, AnalystMessage, AnalystThread, AnswerBlock } from '@/lib/data/types';
import { formatDateTime } from '@/lib/format';
import { useReturnFocus } from '@/lib/use-return-focus';
import { loadThreadAction } from './actions';
import { AnswerHeader, ThreadList, Thinking, type Feedback, type ScopeInfo } from './analyst-parts';
import { AnswerBlocks } from './answer-blocks';
import { DemoUnlock } from './demo-unlock';
import { historyOf, noticeBlocks, streamAnswer } from './live';

/**
 * The analyst. Three modes:
 *   scripted   demo without AI: suggested questions get prepared answers
 *   live/demo  AI over the fictitious dataset (unlocked with an access code)
 *   live/tenant AI over the organization's data; conversations are saved
 */
export type AnalystMode = { kind: 'scripted'; unlockable?: boolean } | { kind: 'live'; scope: 'tenant' | 'demo' };

const SCRIPTED_STEPS = ['Lendo vendas por item', 'Comparando com o período anterior', 'Separando fatos de hipóteses'];

const SCOPES: Record<'scripted' | 'demo' | 'tenant', ScopeInfo> = {
  scripted: {
    items: [
      { name: 'Vendas por item', detail: '730 dias' },
      { name: 'Posição de estoque', detail: 'Diária' },
      { name: 'Custos de compra', detail: 'Notas fiscais' },
      { name: 'Cadastro de produtos', detail: '44 itens' },
    ],
    note: 'Demonstração: respostas roteirizadas sobre dados fictícios. Nenhum modelo de IA é chamado.',
  },
  demo: {
    items: [
      { name: 'Métricas de vendas', detail: '730 dias' },
      { name: 'Posição de estoque', detail: 'Atual' },
      { name: 'Oportunidades', detail: 'Abertas' },
    ],
    note: 'Demonstração com IA (Claude, da Anthropic) sobre dados fictícios. Cada número da resposta é conferido com os dados consultados.',
  },
  tenant: {
    items: [
      { name: 'Métricas de vendas', detail: 'Importações concluídas' },
      { name: 'Posição de estoque', detail: 'Última importada' },
      { name: 'Oportunidades', detail: 'Central' },
    ],
    note: 'As perguntas e os dados consultados para respondê-las são enviados à Anthropic (Claude) para gerar a resposta. Cada número é conferido com os dados; nada é calculado pela IA.',
  },
};

function demoNotice(data: AnalystData, unlockable: boolean): AnswerBlock[] {
  return [
    {
      kind: 'summary',
      text: unlockable
        ? 'Sem a IA ativada, o analista desta demonstração responde só às perguntas sugeridas, com análises roteirizadas. Ative a IA com o código de acesso para fazer perguntas livres.'
        : 'Nesta demonstração, o analista responde às perguntas sugeridas com análises roteirizadas sobre os dados fictícios.',
    },
    { kind: 'next', items: data.suggestions.map((s) => s.question) },
  ];
}

export function AnalystWorkspace({
  data,
  mode = { kind: 'scripted' },
  opportunity = null,
}: {
  data: AnalystData;
  mode?: AnalystMode;
  /** Opportunity to explain right away (deep link from the Opportunity Center). */
  opportunity?: { id: string; title: string } | null;
}) {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const live = mode.kind === 'live' ? mode : null;
  const [threads, setThreads] = useState<AnalystThread[]>(data.threads);
  const [activeId, setActiveId] = useState<string | null>(live ? null : (data.threads[0]?.id ?? null));
  const [draft, setDraft] = useState('');
  const [steps, setSteps] = useState<string[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const asked = useRef(false);
  const scrollOnNext = useRef(false);
  const returnFocus = useReturnFocus();

  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const messageCount = active?.messages.length ?? 0;
  const busy = steps !== null;
  const scope = SCOPES[live ? live.scope : 'scripted'];
  const badge = live
    ? live.scope === 'demo'
      ? ({ label: 'IA sobre dados fictícios', variant: 'warning' } as const)
      : ({ label: 'Gerada por IA, números conferidos', variant: 'neutral' } as const)
    : ({ label: 'Resposta de demonstração', variant: 'warning' } as const);

  const appendTo = (threadId: string, message: AnalystMessage) =>
    setThreads((previous) => previous.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, message], updatedAt: message.at } : t)));

  /** Adds the question to the open conversation (or a new one) and returns its id. */
  const startQuestion = (text: string, fresh: boolean) => {
    const now = new Date().toISOString();
    const userMessage: AnalystMessage = { id: `u-${now}`, role: 'user', at: now, text };
    const current = fresh ? null : active;
    const threadId = current?.id ?? `local-${now}`;
    if (!current) {
      setThreads((previous) => [{ id: threadId, title: text.slice(0, 120), updatedAt: now, messages: [userMessage] }, ...previous]);
      setActiveId(threadId);
    } else {
      appendTo(threadId, userMessage);
    }
    setDraft('');
    scrollOnNext.current = true;
    return { threadId, thread: current };
  };

  const askScripted = (text: string, fresh: boolean) => {
    const { threadId } = startQuestion(text, fresh);
    setSteps(SCRIPTED_STEPS);
    setCurrent(0);
    const scripted = data.suggestions.find((s) => s.question === text);
    const blocks = scripted ? data.scriptedAnswers[scripted.id] : undefined;
    const stepMs = reduce ? 150 : 520;
    SCRIPTED_STEPS.forEach((_, index) => window.setTimeout(() => setCurrent(index), index * stepMs));
    window.setTimeout(() => {
      const at = new Date().toISOString();
      appendTo(threadId, { id: `a-${at}`, role: 'analyst', at, blocks: blocks ?? demoNotice(data, mode.kind === 'scripted' && Boolean(mode.unlockable)) });
      setSteps(null);
    }, SCRIPTED_STEPS.length * stepMs);
  };

  const askLive = async (text: string, fresh: boolean, opportunityId: string | null) => {
    if (!live) return;
    const { threadId: localId, thread } = startQuestion(text, fresh);
    let threadId = localId;
    setSteps(['Lendo a pergunta']);
    setCurrent(0);
    const body =
      live.scope === 'tenant'
        ? { mode: 'chat', question: text, threadId: thread && !thread.id.startsWith('local-') ? thread.id : null, opportunityId }
        : { mode: 'chat', question: text, history: historyOf(thread), opportunityId };
    let answered = false;
    let count = 1;
    await streamAnswer(live.scope === 'tenant' ? '/api/analista' : '/api/demo/analista', body, (event) => {
      if (event.type === 'thread' && event.id !== threadId) {
        // The updaters run later, so they get fixed copies of both ids.
        const previousId = threadId;
        const serverId = event.id;
        setThreads((previous) => previous.map((t) => (t.id === previousId ? { ...t, id: serverId } : t)));
        setActiveId((id) => (id === previousId ? serverId : id));
        threadId = serverId;
      } else if (event.type === 'step') {
        setSteps((previous) => [...(previous ?? []), event.label]);
        setCurrent(count++);
      } else if (event.type === 'answer' || event.type === 'error') {
        if (answered) return;
        answered = true;
        const at = event.type === 'answer' ? event.at : new Date().toISOString();
        appendTo(threadId, { id: `a-${at}`, role: 'analyst', at, blocks: event.type === 'answer' ? event.blocks : noticeBlocks(event.message) });
      }
    });
    setSteps(null);
  };

  const ask = (question: string, options: { fresh?: boolean; opportunityId?: string } = {}) => {
    const text = question.trim();
    if (!text || busy) return;
    if (live) void askLive(text, Boolean(options.fresh), options.opportunityId ?? null);
    else askScripted(text, Boolean(options.fresh));
  };

  // A new question or answer scrolls to its start, so reading begins at the top of what changed.
  useEffect(() => {
    if (!scrollOnNext.current) return;
    lastMessageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!busy) scrollOnNext.current = false;
  }, [messageCount, busy, reduce]);

  // Deep links: /analista?pergunta=<suggestion id> (any mode) and ?oportunidade=<id> (live).
  useEffect(() => {
    if (asked.current) return;
    const suggestion = data.suggestions.find((s) => s.id === params.get('pergunta'));
    if (opportunity && live) {
      asked.current = true;
      const timer = window.setTimeout(() => ask(`Explique a oportunidade: ${opportunity.title}`, { fresh: true, opportunityId: opportunity.id }), 0);
      return () => window.clearTimeout(timer);
    }
    if (!suggestion) return;
    asked.current = true;
    const timer = window.setTimeout(() => ask(suggestion.question, { fresh: true }), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, opportunity]);

  const startNew = () => {
    setActiveId(null);
    setHistoryOpen(false);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  };

  const select = async (id: string) => {
    setActiveId(id);
    setHistoryOpen(false);
    const thread = threads.find((t) => t.id === id);
    if (live?.scope !== 'tenant' || !thread || thread.messages.length > 0) return;
    const result = await loadThreadAction(id);
    if (!result.ok) {
      toast.error('Não foi possível abrir a conversa', { description: result.message });
      return;
    }
    setThreads((previous) => previous.map((t) => (t.id === id ? { ...t, messages: result.messages } : t)));
  };

  const rate = (messageId: string, value: Feedback) => {
    setFeedback((previous) => {
      const next = { ...previous };
      if (previous[messageId] === value) delete next[messageId];
      else next[messageId] = value;
      return next;
    });
    if (feedback[messageId] !== value) {
      toast.success(value === 'up' ? 'Obrigado pelo retorno' : 'Retorno registrado', { description: 'Ambiente de demonstração: a avaliação não é salva.' });
    }
  };

  const list = <ThreadList threads={threads} activeId={activeId} onSelect={(id) => void select(id)} onNew={startNew} scope={scope} />;

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
              {mode.kind === 'scripted' && mode.unlockable && <DemoUnlock />}
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
                  <AnswerHeader
                    message={message}
                    badge={badge}
                    feedback={feedback[message.id]}
                    onFeedback={live ? undefined : (value) => rate(message.id, value)}
                  />
                  <AnswerBlocks blocks={message.blocks ?? []} onFollowUp={(text) => ask(text)} />
                </article>
              );
            })}
            {steps && <Thinking steps={steps} current={current} />}
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
              maxLength={2000}
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
            <Button type="submit" size="icon" aria-label="Enviar pergunta" disabled={!draft.trim() || busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <SendHorizontal aria-hidden="true" />}
            </Button>
          </div>
          <p className="hidden px-2 pt-1 pb-0.5 text-2xs text-subtle-foreground sm:block">
            Enter envia, Shift + Enter quebra a linha.{' '}
            {live ? 'Respostas geradas por IA; os números vêm dos dados e são conferidos.' : 'Respostas desta demonstração são roteirizadas.'}
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
