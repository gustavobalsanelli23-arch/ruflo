import { describe, expect, it } from 'vitest';
import { business, formatPhone, isWhatsappNumber, pendingBusinessData, resolveChannel, whatsappUrl, type Business } from '../src/config/site';
import { composeMessage, emptyContact, maskPhone, phoneDigits, postContact, resolveDelivery, validateContact, type ContactInput } from '../src/lib/contact';
import { distanceKm, mapSize, project } from '../src/lib/geo';
import { hotspotOnScreen, parseFocus, stageBox, walkReducer } from '../src/lib/stage';

const withWhatsapp: Business = { ...business, whatsapp: { ...business.whatsapp, number: '5511999998888' } };
const filled: ContactInput = {
  name: 'Ana Souza',
  phone: '(11) 98888-7777',
  email: '',
  interest: 'Investir em imóveis',
  message: 'Procuro apartamento em Barueri.',
  consent: true,
};

describe('canais de contato', () => {
  it('sem WhatsApp confirmado, "Fale com um especialista" abre o Direct do Instagram', () => {
    const c = resolveChannel('oi', '');
    expect(c).toEqual({ id: 'instagram', href: 'https://ig.me/m/vop_investimentos', name: 'Instagram', prefill: false });
  });

  it('com WhatsApp, abre a conversa com a mensagem pronta', () => {
    const c = resolveChannel('Olá, VOP!', '5511999998888');
    expect(c.id).toBe('whatsapp');
    expect(c.href).toBe('https://wa.me/5511999998888?text=Ol%C3%A1%2C%20VOP!');
    expect(c.prefill).toBe(true);
  });

  it('valida o número no formato do wa.me', () => {
    expect(isWhatsappNumber('5511999998888')).toBe(true);
    expect(isWhatsappNumber('551133334444')).toBe(true);
    expect(isWhatsappNumber('11999998888')).toBe(false);
    expect(isWhatsappNumber('')).toBe(false);
  });

  it('formata telefone para exibição', () => {
    expect(formatPhone('5511999998888')).toBe('(11) 99999-8888');
    expect(formatPhone('551133334444')).toBe('(11) 3333-4444');
  });

  it('whatsappUrl codifica a mensagem', () => {
    expect(whatsappUrl('a b&c', '5511999998888')).toBe('https://wa.me/5511999998888?text=a%20b%26c');
  });

  it('nada inventado: dados não confirmados ficam pendentes', () => {
    expect(business.whatsapp.number).toBe('');
    expect(business.creci).toBeNull();
    expect(business.address).toBeNull();
    const pending = pendingBusinessData();
    expect(pending).toContain('WhatsApp oficial');
    expect(pending).toContain('CRECI');
    expect(pendingBusinessData(withWhatsapp, 'https://vop.com.br')).not.toContain('WhatsApp oficial');
  });
});

describe('formulário de contato', () => {
  it('exige nome, um meio de retorno, assunto e autorização', () => {
    const errors = validateContact(emptyContact);
    expect(Object.keys(errors).sort()).toEqual(['consent', 'interest', 'name', 'phone']);
  });

  it('aceita telefone OU e-mail', () => {
    expect(validateContact(filled)).toEqual({});
    expect(validateContact({ ...filled, phone: '', email: 'ana@exemplo.com.br' })).toEqual({});
  });

  it('recusa telefone sem DDD e e-mail malformado', () => {
    expect(validateContact({ ...filled, phone: '98888-7777' }).phone).toMatch(/DDD/);
    expect(validateContact({ ...filled, email: 'ana@' }).email).toBeTruthy();
  });

  it('aplica a máscara de telefone enquanto digita', () => {
    expect(maskPhone('1')).toBe('(1');
    expect(maskPhone('11988887777')).toBe('(11) 98888-7777');
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
    expect(maskPhone('+55 11 98888-7777')).toBe('(11) 98888-7777');
    expect(phoneDigits('+55 (11) 98888-7777')).toBe('11988887777');
  });

  it('compõe a mensagem que chega à VOP', () => {
    const text = composeMessage(filled);
    expect(text).toContain('Meu nome é Ana Souza.');
    expect(text).toContain('Assunto: Investir em imóveis.');
    expect(text).toContain('Procuro apartamento em Barueri.');
    expect(text).toContain('Contato: telefone (11) 98888-7777.');
  });

  it('entrega pelo endpoint, pelo WhatsApp ou pelo Direct, nesta ordem', () => {
    expect(resolveDelivery(business).kind).toBe('instagram');
    expect(resolveDelivery(withWhatsapp).kind).toBe('whatsapp');
    expect(resolveDelivery({ ...withWhatsapp, formEndpoint: 'https://api.exemplo.com/contato' })).toMatchObject({
      kind: 'endpoint',
      url: 'https://api.exemplo.com/contato',
    });
  });

  it('postContact envia JSON e falha em resposta não-2xx', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const ok = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    await postContact('https://api.exemplo.com/contato', filled, ok);
    expect(calls[0].url).toBe('https://api.exemplo.com/contato');
    expect(calls[0].body).toMatchObject({ nome: 'Ana Souza', telefone: '(11) 98888-7777', assunto: 'Investir em imóveis', origem: 'site' });

    const fail = (async () => new Response(null, { status: 500 })) as typeof fetch;
    await expect(postContact('https://api.exemplo.com/contato', filled, fail)).rejects.toThrow('HTTP 500');
  });
});

describe('mapa esquemático', () => {
  it('projeta em escala (10 unidades por km) com o norte para cima', () => {
    const { width, height } = mapSize();
    expect(width).toBeGreaterThan(400);
    expect(height).toBeGreaterThan(250);
    const north = project(-23.45, -46.8);
    const south = project(-23.6, -46.8);
    expect(north.y).toBeLessThan(south.y);
    const west = project(-23.5, -46.9);
    const east = project(-23.5, -46.7);
    expect(west.x).toBeLessThan(east.x);
  });

  it('a distância no mapa bate com a distância real', () => {
    const a = { lat: -23.5112, lon: -46.8764 };
    const b = { lat: -23.5505, lon: -46.634 };
    const pa = project(a.lat, a.lon);
    const pb = project(b.lat, b.lon);
    const mapKm = Math.hypot(pb.x - pa.x, pb.y - pa.y) / 10;
    expect(Math.abs(mapKm - distanceKm(a, b))).toBeLessThan(0.3);
  });
});

describe('percurso pelo imóvel', () => {
  it('foto deitada cobre a tela respeitando o ponto de interesse', () => {
    const b = stageBox(3000, 2000, 1440, 900, '50% 80%');
    expect(b.mode).toBe('cover');
    expect(b.width).toBe(1440);
    expect(b.height).toBe(960);
    expect(b.top).toBeCloseTo(-48);
    expect(b.left).toBe(0);
  });

  it('foto em pé numa tela deitada aparece inteira (contain), à direita do título', () => {
    const b = stageBox(2000, 3000, 1440, 900);
    expect(b.mode).toBe('contain');
    expect(b.height).toBeCloseTo(900 * 0.78);
    expect(b.left + b.width / 2).toBeGreaterThan(720);
    expect(b.top + b.height).toBeLessThan(900);
  });

  it('foto deitada no celular em pé ocupa o alto da tela, sem invadir os controles', () => {
    const b = stageBox(3000, 2000, 390, 844, '50% 80%');
    expect(b.mode).toBe('cover');
    expect(b.top + b.height).toBeCloseTo(844 * 0.76);
    expect(b.width).toBeGreaterThan(390);
  });

  it('no celular em pé, a foto em pé cobre a tela', () => {
    expect(stageBox(2000, 3000, 390, 844).mode).toBe('cover');
  });

  it('pontos de interesse fora da área livre ficam ocultos', () => {
    const b = stageBox(3000, 2000, 1440, 900);
    expect(hotspotOnScreen(b, 50, 50, 1440, 900).visible).toBe(true);
    expect(hotspotOnScreen(b, 2, 50, 1440, 900).visible).toBe(false);
    expect(hotspotOnScreen(b, 50, 95, 1440, 900).visible).toBe(false);
  });

  it('parseFocus lê porcentagens e limita a 0–1', () => {
    expect(parseFocus('40% 70%')).toEqual([0.4, 0.7]);
    expect(parseFocus()).toEqual([0.5, 0.5]);
    expect(parseFocus('150% -10%')).toEqual([1, 0]);
  });

  it('avança, volta, encerra, pula e recomeça', () => {
    const r = walkReducer(3);
    let s = { index: 0, dir: 1, ended: false };
    s = r(s, { type: 'prev' });
    expect(s).toEqual({ index: 0, dir: 1, ended: false });
    s = r(s, { type: 'next' });
    s = r(s, { type: 'next' });
    expect(s).toEqual({ index: 2, dir: 1, ended: false });
    s = r(s, { type: 'next' });
    expect(s.ended).toBe(true);
    expect(r(s, { type: 'next' })).toBe(s);
    s = r(s, { type: 'prev' });
    expect(s).toEqual({ index: 2, dir: -1, ended: false });
    s = r(s, { type: 'jump', to: 0 });
    expect(s).toEqual({ index: 0, dir: -1, ended: false });
    expect(r({ index: 1, dir: 1, ended: true }, { type: 'restart' })).toEqual({ index: 0, dir: -1, ended: false });
  });
});
