import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieNotice } from '@/components/shell/cookie-notice';
import { CONSENT_KEY, CONSENT_VERSION, readConsent, resetConsent, setConsent } from '@/lib/tracking/consent';

const init = vi.fn();
const optIn = vi.fn();
const optOut = vi.fn();
const setConfig = vi.fn();
vi.mock('posthog-js', () => ({
  default: { init, opt_in_capturing: optIn, opt_out_capturing: optOut, set_config: setConfig, identify: vi.fn(), capture: vi.fn() },
}));

beforeEach(() => localStorage.clear());
afterEach(() => vi.clearAllMocks());

describe('consentimento de análise', () => {
  it('sem resposta, não há escolha; uma escolha de outra versão também não vale', () => {
    expect(readConsent()).toBeNull();
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 'antiga', analytics: true }));
    expect(readConsent()).toBeNull();
  });

  it('guarda aceitar e recusar com a versão, e "mudar minha escolha" apaga', () => {
    setConsent(true);
    expect(readConsent()).toBe('granted');
    expect(JSON.parse(localStorage.getItem(CONSENT_KEY)!).version).toBe(CONSENT_VERSION);
    setConsent(false);
    expect(readConsent()).toBe('denied');
    resetConsent();
    expect(readConsent()).toBeNull();
  });
});

describe('aviso de cookies', () => {
  it('sem análise configurada, só informa e não pede consentimento', async () => {
    render(<CookieNotice />);
    expect(await screen.findByRole('button', { name: 'Entendi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
  });

  it('com análise, Aceitar e Recusar têm o mesmo peso e somem depois da resposta', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CookieNotice analytics />);
    await user.click(await screen.findByRole('button', { name: 'Recusar' }));
    expect(readConsent()).toBe('denied');
    expect(screen.queryByRole('region', { name: 'Preferências de cookies' })).not.toBeInTheDocument();
    unmount();
    resetConsent();
    render(<CookieNotice analytics />);
    await user.click(await screen.findByRole('button', { name: 'Aceitar' }));
    expect(readConsent()).toBe('granted');
  });
});

describe('PostHog', () => {
  it('não carrega sem consentimento e carrega, com textos mascarados, depois do Aceitar', async () => {
    const { ProductAnalytics } = await import('@/lib/tracking/product-analytics');
    render(<ProductAnalytics apiKey="phc_teste" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(init).not.toHaveBeenCalled();
    setConsent(true);
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
    const [key, options] = init.mock.calls[0]!;
    expect(key).toBe('phc_teste');
    expect(options).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: { maskAllInputs: true, maskTextSelector: '*' },
    });
    localStorage.setItem('ph_phc_teste_posthog', '{}');
    setConsent(false);
    await vi.waitFor(() => expect(optOut).toHaveBeenCalled());
    expect(setConfig).toHaveBeenLastCalledWith({ disable_persistence: true });
    expect(localStorage.getItem('ph_phc_teste_posthog')).toBeNull();
  });
});
