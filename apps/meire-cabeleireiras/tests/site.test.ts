import { describe, expect, it } from 'vitest';
import {
  booking,
  business,
  formatPhone,
  fullAddress,
  isWhatsappNumber,
  mapsUrl,
  resolveBooking,
  whatsappUrl,
} from '../src/config/site';

describe('agendamento', () => {
  it('sem número de WhatsApp, os botões abrem o Direct do Instagram', () => {
    const b = resolveBooking('');
    expect(b.channel).toBe('instagram');
    expect(b.href).toBe('https://ig.me/m/meire.cabeleireiras');
    expect(b.label).toBe('Agendar pelo Instagram');
  });

  it('com número válido, abre o WhatsApp com a mensagem pronta', () => {
    const b = resolveBooking('5511912345678', 'Olá, Meire! Quero agendar: mechas.');
    expect(b.channel).toBe('whatsapp');
    expect(b.label).toBe('Agendar pelo WhatsApp');
    expect(b.href).toBe(`https://wa.me/5511912345678?text=${encodeURIComponent('Olá, Meire! Quero agendar: mechas.')}`);
  });

  it('número incompleto ou com máscara não vira link quebrado', () => {
    expect(isWhatsappNumber('(11) 91234-5678')).toBe(false);
    expect(isWhatsappNumber('11912345678')).toBe(false);
    expect(isWhatsappNumber('551191234567')).toBe(true); // fixo, 8 dígitos
    expect(resolveBooking('11912345678').channel).toBe('instagram');
  });

  it('a configuração publicada não inventa telefone', () => {
    expect(business.whatsapp.number).toBe('');
    expect(booking().channel).toBe('instagram');
  });

  it('mensagem padrão é codificada no link', () => {
    expect(whatsappUrl('a b&c', '5511912345678')).toBe('https://wa.me/5511912345678?text=a%20b%26c');
  });
});

describe('formatação', () => {
  it('telefone celular e fixo', () => {
    expect(formatPhone('5511912345678')).toBe('(11) 91234-5678');
    expect(formatPhone('551132345678')).toBe('(11) 3234-5678');
  });

  it('endereço completo e link do mapa', () => {
    const address = { street: 'Rua das Flores, 100', district: 'Centro', city: 'Cidade', state: 'SC', postalCode: '89000-000' };
    expect(fullAddress(address)).toBe('Rua das Flores, 100, Centro, Cidade - SC, 89000-000');
    expect(decodeURIComponent(mapsUrl(address))).toContain('Rua das Flores, 100, Centro, Cidade - SC');
  });

  it('endereço sem bairro e sem CEP', () => {
    expect(fullAddress({ street: 'Rua A, 1', city: 'Cidade', state: 'SP' })).toBe('Rua A, 1, Cidade - SP');
  });

  it('endereço e horários continuam como placeholder (não inventados)', () => {
    expect(business.address).toBeNull();
    expect(business.hours).toBeNull();
  });
});
