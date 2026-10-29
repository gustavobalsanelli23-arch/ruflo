import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AnalystData } from '@/lib/data/types';

/**
 * The analyst screen in live mode, with fetch answering an NDJSON stream as
 * the route does. Checks what the browser sends (question, conversation id,
 * history for the demo) and what it shows (steps, answer, errors).
 */

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const loadThread = vi.hoisted(() => vi.fn());
vi.mock('@/modules/analyst/actions', () => ({ loadThreadAction: loadThread }));

const { AnalystWorkspace } = await import('@/modules/analyst/analyst-workspace');
const { AiSummary } = await import('@/modules/overview/ai-summary');

Element.prototype.scrollIntoView = vi.fn();
const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
const data: AnalystData = { threads: [], suggestions: [{ id: 's1', theme: 'Vendas', question: 'Como foram as vendas?' }], scriptedAnswers: {} };
const THREAD = '22222222-2222-4222-8222-222222222222';

function ndjson(events: unknown[], status = 200) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const event of events) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'content-type': 'application/x-ndjson' } });
}

const answer = (text: string) => ({ type: 'answer', status: 'answered', at: '2026-04-02T12:00:00Z', blocks: [{ kind: 'summary', text }] });
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const bodyOf = (call: number) => JSON.parse((fetchMock.mock.calls[call]![1] as { body: string }).body) as Record<string, unknown>;

describe('analista ao vivo', () => {
  it('organização: envia a pergunta, mostra os passos e a resposta, e segue na mesma conversa', async () => {
    fetchMock
      .mockResolvedValueOnce(ndjson([{ type: 'thread', id: THREAD }, { type: 'step', label: 'Somando os totais do período' }, answer('Receita de R$ 1.000,00.')]))
      .mockResolvedValueOnce(ndjson([{ type: 'thread', id: THREAD }, answer('Margem de 25,0%.')]));
    const user = userEvent.setup();
    render(<AnalystWorkspace data={data} mode={{ kind: 'live', scope: 'tenant' }} />);

    await user.type(screen.getByLabelText('Pergunta para o analista'), 'Como foram as vendas?{Enter}');
    expect(await screen.findByText('Receita de R$ 1.000,00.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/analista');
    expect(bodyOf(0)).toEqual({ mode: 'chat', question: 'Como foram as vendas?', threadId: null, opportunityId: null });
    expect(screen.getByText('Gerada por IA, números conferidos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resposta útil' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Pergunta para o analista'), 'E a margem?{Enter}');
    expect(await screen.findByText('Margem de 25,0%.')).toBeInTheDocument();
    expect(bodyOf(1)).toEqual(expect.objectContaining({ question: 'E a margem?', threadId: THREAD }));
    expect(screen.getAllByRole('button', { name: /Como foram as vendas\?/ }).length).toBeGreaterThan(0);
  });

  it('demonstração: envia o histórico da conversa, já que nada fica salvo no servidor', async () => {
    fetchMock.mockResolvedValueOnce(ndjson([answer('Primeira resposta.')])).mockResolvedValueOnce(ndjson([answer('Segunda resposta.')]));
    const user = userEvent.setup();
    render(<AnalystWorkspace data={data} mode={{ kind: 'live', scope: 'demo' }} />);
    await user.type(screen.getByLabelText('Pergunta para o analista'), 'Primeira?{Enter}');
    await screen.findByText('Primeira resposta.');
    await user.type(screen.getByLabelText('Pergunta para o analista'), 'Segunda?{Enter}');
    await screen.findByText('Segunda resposta.');
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/demo/analista');
    expect(bodyOf(1)).toEqual({ mode: 'chat', question: 'Segunda?', history: [{ question: 'Primeira?', answer: 'Primeira resposta.' }], opportunityId: null });
    expect(screen.getAllByText('IA sobre dados fictícios').length).toBe(2);
  });

  it('erro do servidor (limite, configuração) aparece como aviso na conversa', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'A organização chegou ao limite diário.' }, { status: 429 }));
    const user = userEvent.setup();
    render(<AnalystWorkspace data={data} mode={{ kind: 'live', scope: 'tenant' }} />);
    await user.click(screen.getByRole('button', { name: /Como foram as vendas\?/ }));
    expect(await screen.findByText('A organização chegou ao limite diário.')).toBeInTheDocument();
    expect(screen.getByLabelText('Pergunta para o analista')).toBeEnabled();
  });

  it('a conexão que cai sem resposta também vira aviso', async () => {
    fetchMock.mockResolvedValueOnce(ndjson([{ type: 'step', label: 'Comparando produtos' }]));
    const user = userEvent.setup();
    render(<AnalystWorkspace data={data} mode={{ kind: 'live', scope: 'tenant' }} />);
    await user.type(screen.getByLabelText('Pergunta para o analista'), 'Oi{Enter}');
    expect(await screen.findByText('A conexão caiu antes da resposta. Tente de novo.')).toBeInTheDocument();
  });

  it('abrir uma conversa salva carrega as mensagens dela', async () => {
    loadThread.mockResolvedValueOnce({
      ok: true,
      messages: [
        { id: 'm1', role: 'user', at: '2026-04-01T10:00:00Z', text: 'Pergunta antiga' },
        { id: 'm2', role: 'analyst', at: '2026-04-01T10:00:05Z', blocks: [{ kind: 'summary', text: 'Resposta antiga.' }] },
      ],
    });
    const user = userEvent.setup();
    render(
      <AnalystWorkspace
        data={{ ...data, threads: [{ id: THREAD, title: 'Pergunta antiga', updatedAt: '2026-04-01T10:00:05Z', messages: [] }] }}
        mode={{ kind: 'live', scope: 'tenant' }}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: /Pergunta antiga/ })[0]!);
    await waitFor(() => expect(loadThread).toHaveBeenCalledWith(THREAD));
    expect(await screen.findByText('Resposta antiga.')).toBeInTheDocument();
  });

  it('modo roteirizado com IA disponível oferece o desbloqueio', () => {
    render(<AnalystWorkspace data={data} mode={{ kind: 'scripted', unlockable: true }} />);
    expect(screen.getByLabelText(/Ativar a IA nesta demonstração/)).toBeInTheDocument();
  });
});

describe('resumo da visão geral', () => {
  it('gera o resumo do período e mostra quando foi gerado', async () => {
    fetchMock.mockResolvedValueOnce(ndjson([{ type: 'step', label: 'Somando os totais do período' }, answer('Mês com receita estável.')]));
    const user = userEvent.setup();
    render(<AiSummary endpoint="/api/analista" period="30d" initial={null} canGenerate />);
    await user.click(screen.getByRole('button', { name: 'Gerar resumo' }));
    expect(await screen.findByText('Mês com receita estável.')).toBeInTheDocument();
    expect(bodyOf(0)).toEqual({ mode: 'summary', period: '30d' });
    expect(screen.getByRole('button', { name: 'Gerar de novo' })).toBeEnabled();
    expect(screen.getByText(/Gerado em/)).toBeInTheDocument();
  });

  it('resumo salvo e desatualizado avisa; sem permissão não há botão', () => {
    render(
      <AiSummary
        endpoint="/api/analista"
        period="30d"
        initial={{ blocks: [{ kind: 'summary', text: 'Resumo anterior.' }], createdAt: '2026-04-01T10:00:00Z', stale: true }}
        canGenerate={false}
      />,
    );
    expect(screen.getByText('Resumo anterior.')).toBeInTheDocument();
    expect(screen.getByText(/Há dados novos desde então/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('erro vira aviso no painel', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Limite atingido.' }, { status: 429 }));
    const user = userEvent.setup();
    render(<AiSummary endpoint="/api/demo/analista" period="7d" initial={null} canGenerate />);
    await user.click(screen.getByRole('button', { name: 'Gerar resumo' }));
    expect(await screen.findByText('Limite atingido.')).toBeInTheDocument();
  });
});
