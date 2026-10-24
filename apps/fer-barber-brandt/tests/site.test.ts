import { describe, expect, it } from 'vitest';
import {
  booking,
  business,
  formatPhone,
  fullAddress,
  isWhatsappNumber,
  mapsEmbedUrl,
  mapsUrl,
  pendingBusinessData,
  resolveBooking,
  serviceMessage,
  whatsappUrl,
} from '../src/config/site';

describe('agendamento', () => {
  it('sem WhatsApp nem plataforma, os botões abrem o Direct do Instagram', () => {
    const b = resolveBooking('', null);
    expect(b.channel).toBe('instagram');
    expect(b.href).toBe('https://ig.me/m/ferbarber.brandt');
    expect(b.label).toBe('Agendar pelo Instagram');
  });

  it('com número válido, abre o WhatsApp com a mensagem pronta', () => {
    const b = resolveBooking('5547912345678', null, 'Olá, Fer! Quero agendar: Corte.');
    expect(b.channel).toBe('whatsapp');
    expect(b.label).toBe('Agendar pelo WhatsApp');
    expect(b.href).toBe(`https://wa.me/5547912345678?text=${encodeURIComponent('Olá, Fer! Quero agendar: Corte.')}`);
  });

  it('o WhatsApp tem prioridade sobre a plataforma, que tem prioridade sobre o Direct', () => {
    const platform = { name: 'Booksy', url: 'https://booksy.com/exemplo' };
    expect(resolveBooking('5547912345678', platform).channel).toBe('whatsapp');
    const p = resolveBooking('', platform);
    expect(p.channel).toBe('platform');
    expect(p.href).toBe('https://booksy.com/exemplo');
    expect(p.channelName).toBe('Booksy');
  });

  it('número incompleto ou com máscara não vira link quebrado', () => {
    expect(isWhatsappNumber('(47) 91234-5678')).toBe(false);
    expect(isWhatsappNumber('47912345678')).toBe(false);
    expect(isWhatsappNumber('554732345678')).toBe(true); // fixo, 8 dígitos
    expect(resolveBooking('47912345678', null).channel).toBe('instagram');
  });

  it('mensagem por serviço e codificação no link', () => {
    expect(serviceMessage('Barba')).toBe('Olá, Fer! Vim pelo site e quero agendar: Barba.');
    expect(whatsappUrl('a b&c', '5547912345678')).toBe('https://wa.me/5547912345678?text=a%20b%26c');
  });

  it('a configuração publicada usa o único canal verificado (Instagram)', () => {
    expect(business.instagram.url).toBe('https://www.instagram.com/ferbarber.brandt/');
    expect(booking().channel).toBe('instagram');
  });

  it('nome, faixa e endereço são os publicados pela barbearia', () => {
    expect(business.name).toBe('Barbearia Brandt');
    expect(business.tagline).toBe('Barba e cabelo');
    expect(business.address && fullAddress(business.address)).toBe(
      'Rua Leopoldo Koprowski, 1488, Alto Benedito Novo, Benedito Novo - SC',
    );
    expect(business.address?.reference).toBe('Em frente ao posto Zummcar');
  });
});

describe('formatação', () => {
  it('telefone celular e fixo', () => {
    expect(formatPhone('5547912345678')).toBe('(47) 91234-5678');
    expect(formatPhone('554732345678')).toBe('(47) 3234-5678');
  });

  it('endereço completo, link e mapa incorporado', () => {
    const address = { street: 'Rua das Flores, 100', district: 'Centro', city: 'Cidade', state: 'SC', postalCode: '89000-000' };
    expect(fullAddress(address)).toBe('Rua das Flores, 100, Centro, Cidade - SC, 89000-000');
    expect(decodeURIComponent(mapsUrl(address))).toContain('Rua das Flores, 100, Centro, Cidade - SC');
    expect(mapsEmbedUrl(address)).toMatch(/^https:\/\/maps\.google\.com\/maps\?q=.+&output=embed$/);
  });

  it('endereço sem bairro e sem CEP', () => {
    expect(fullAddress({ street: 'Rua A, 1', city: 'Cidade', state: 'SP' })).toBe('Rua A, 1, Cidade - SP');
  });
});

describe('nada inventado', () => {
  it('WhatsApp, horários e plataforma continuam vazios até serem confirmados', () => {
    expect(business.whatsapp.number).toBe('');
    expect(business.hours).toBeNull();
    expect(business.bookingPlatform).toBeNull();
    expect(business.address?.postalCode).toBeUndefined();
  });

  it('o build lista o que falta confirmar', () => {
    expect(pendingBusinessData()).toEqual(expect.arrayContaining(['WhatsApp', 'horários de funcionamento']));
    expect(pendingBusinessData()).not.toContain('endereço');
    const filled = {
      ...business,
      whatsapp: { ...business.whatsapp, number: '5547912345678' },
      address: { street: 'Rua A, 1', city: 'Cidade', state: 'SC' },
      hours: [{ days: 'Terça a sábado', hours: '9h às 19h' }],
      bookingPlatform: { name: 'Booksy', url: 'https://booksy.com/x' },
    };
    expect(pendingBusinessData(filled)).toEqual(['domínio definitivo (SITE_URL)']);
  });
});
