import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const status = vi.hoisted(() => ({ active: true }));
vi.mock('@/modules/auth/actions', () => ({ sessionStatusAction: vi.fn(async () => ({ active: status.active })) }));

const { SessionWatch, redirectIfSignedOut } = await import('@/components/shell/session-watch');

let visibility: DocumentVisibilityState = 'visible';
const assign = vi.fn();

function setVisibility(value: DocumentVisibilityState) {
  visibility = value;
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign, pathname: '/dados', search: '?x=1' } });
  assign.mockClear();
});

afterEach(() => vi.useRealTimers());

describe('sessão expirada enquanto a aba estava em segundo plano', () => {
  it('ao voltar depois de mais de um minuto, confere a sessão e leva para entrar com o destino', async () => {
    status.active = false;
    render(<SessionWatch />);
    setVisibility('hidden');
    vi.advanceTimersByTime(61_000);
    await act(async () => setVisibility('visible'));
    expect(assign).toHaveBeenCalledWith('/entrar?next=%2Fdados%3Fx%3D1&motivo=sessao-expirada');
  });

  it('não incomoda quem volta logo, nem quem ainda tem sessão', async () => {
    status.active = true;
    render(<SessionWatch />);
    setVisibility('hidden');
    vi.advanceTimersByTime(5_000);
    await act(async () => setVisibility('visible'));
    setVisibility('hidden');
    vi.advanceTimersByTime(120_000);
    await act(async () => setVisibility('visible'));
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('resultado de Server Action com sessão encerrada', () => {
  it('redireciona só quando o código é unauthenticated', () => {
    expect(redirectIfSignedOut({ code: 'forbidden' })).toBe(false);
    expect(assign).not.toHaveBeenCalled();
    expect(redirectIfSignedOut({ code: 'unauthenticated' })).toBe(true);
    expect(assign).toHaveBeenCalledWith('/entrar?next=%2Fdados%3Fx%3D1&motivo=sessao-expirada');
  });
});
