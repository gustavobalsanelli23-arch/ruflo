import { describe, expect, it } from 'vitest';
import { business, formatPhone, isWhatsappNumber, pendingBusinessData, resolveChannel, whatsappUrl, type Business } from '../src/config/site';
import { composeMessage, emptyContact, maskPhone, phoneDigits, postContact, resolveDelivery, validateContact, type ContactInput } from '../src/lib/contact';
import { distanceKm, mapSize, project } from '../src/lib/geo';
import { cameraAt, cameraTarget, depthLook, lane, panelSize, roomPose, SPACING, travelTime, walkReducer, YAW } from '../src/lib/stage';

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

describe('percurso 3D pelo imóvel', () => {
  it('o painel mostra a foto inteira, dentro da área livre', () => {
    const wide = panelSize(3000, 2000, 1440, 900);
    expect(wide.width / wide.height).toBeCloseTo(1.5, 1);
    expect(wide.width).toBeLessThanOrEqual(1440 * 0.6);
    expect(wide.height).toBeLessThanOrEqual(900 * 0.58);
    const tall = panelSize(2000, 3000, 1440, 900);
    expect(tall.height).toBe(Math.round(900 * 0.58));
    expect(tall.width / tall.height).toBeCloseTo(2 / 3, 1);
    const phone = panelSize(3000, 2000, 390, 844);
    expect(phone.width).toBeLessThanOrEqual(390 * 0.84 + 1);
    expect(phone.height).toBeLessThanOrEqual(844 * 0.46 + 1);
  });

  it('os ambientes se alternam de lado e se afastam em profundidade', () => {
    expect([0, 1, 2, 3].map(lane)).toEqual([0, 1, -1, 1]);
    expect(roomPose(0, 800)).toEqual({ x: 0, z: -0, yaw: 0 });
    expect(roomPose(2, 800)).toEqual({ x: -800, z: -2 * SPACING, yaw: -YAW });
  });

  it('parada num ambiente, a câmera fica diante dele e o encara', () => {
    for (const i of [0, 1, 2, 3]) {
      const at = cameraAt(i, 4, 800);
      const pose = roomPose(i, 800);
      expect(at.x).toBeCloseTo(pose.x);
      expect(at.yaw).toBeCloseTo(pose.yaw);
      expect(at.z).toBeCloseTo(-pose.z);
    }
  });

  it('no meio do caminho, a câmera está entre os dois ambientes', () => {
    const at = cameraAt(1.5, 4, 800);
    expect(at.x).toBeCloseTo(0);
    expect(at.yaw).toBeCloseTo(0);
    expect(at.z).toBeCloseTo(1.5 * SPACING);
    // antes do primeiro (entrada) e depois do último (fim), o lado não muda
    expect(cameraAt(-0.85, 4, 800).x).toBe(0);
    expect(cameraAt(3.3, 4, 800).x).toBe(roomPose(3, 800).x);
  });

  it('névoa à frente; o que a câmera atravessa some antes do olho', () => {
    expect(depthLook(1, 1)).toEqual({ fog: 0, opacity: 1, hidden: false });
    expect(depthLook(2, 1).fog).toBeCloseTo(0.5);
    expect(depthLook(3, 1).fog).toBeGreaterThan(depthLook(2, 1).fog);
    expect(depthLook(1, 1.3).opacity).toBeLessThan(1);
    expect(depthLook(1, 1.7).hidden).toBe(true);
    expect(depthLook(5, 1).hidden).toBe(true);
  });

  it('a câmera para longe na entrada, no ambiente atual e um passo além no fim', () => {
    const w = { index: 2, dir: 1, ended: false };
    expect(cameraTarget(w, false, 4)).toBeLessThan(0);
    expect(cameraTarget(w, true, 4)).toBe(2);
    expect(cameraTarget({ ...w, ended: true }, true, 4)).toBeGreaterThan(3);
    expect(travelTime(0, 3)).toBeGreaterThan(travelTime(0, 1));
    expect(travelTime(0, 40)).toBeLessThanOrEqual(2.4);
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
