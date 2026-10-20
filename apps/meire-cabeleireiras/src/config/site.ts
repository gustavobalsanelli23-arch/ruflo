// Fonte única dos dados da Meire Cabeleireiras. Para mudar telefone, endereço,
// horários ou o domínio do site, altere somente este arquivo.
//
// Conferido no Instagram oficial (@meire.cabeleireiras) em 20/10/2026: nome da
// profissional, lema do logo e legendas dos posts. O telefone foi informado em
// 20/10/2026. Endereço e horários NÃO estavam públicos e ficam como PLACEHOLDER:
// o site esconde tudo o que não estiver preenchido, sem inventar nada no lugar.

/** PLACEHOLDER: endereço público definitivo (canonical, Open Graph, sitemap). */
export const SITE_URL = 'https://meire-cabeleireiras.vercel.app';

export interface Address {
  street: string;
  district?: string;
  city: string;
  /** Sigla do estado, ex.: "SC". */
  state: string;
  postalCode?: string;
  /** Ponto de referência opcional, ex.: "Ao lado da padaria". */
  reference?: string;
}

export interface HoursRow {
  /** Como aparece para a cliente, ex.: "Terça a sexta". */
  days: string;
  /** Ex.: "9h às 19h" ou "Fechado". */
  hours: string;
}

export interface Business {
  name: string;
  professional: string;
  tagline: string;
  instagram: { handle: string; url: string; direct: string };
  whatsapp: { number: string; message: string };
  address: Address | null;
  hours: readonly HoursRow[] | null;
}

export const business: Business = {
  name: 'Meire Cabeleireiras',
  professional: 'Meire Costa',
  /** Lema do logo publicado no Instagram. */
  tagline: 'A arte na forma de beleza',
  instagram: {
    handle: 'meire.cabeleireiras',
    url: 'https://www.instagram.com/meire.cabeleireiras/',
    /** Abre uma conversa no Direct do Instagram. */
    direct: 'https://ig.me/m/meire.cabeleireiras',
  },
  whatsapp: {
    /**
     * DDI + DDD + número, só dígitos (formato do wa.me): (11) 99790-1598.
     * Se ficar vazio, todos os botões de agendamento abrem o Direct do
     * Instagram e passam a dizer "Agendar pelo Instagram".
     */
    number: '5511997901598',
    message: 'Olá, Meire! Vim pelo site e gostaria de agendar um horário.',
  },
  /** PLACEHOLDER: preencha para exibir no rodapé, no mapa e nos dados estruturados. */
  address: null,
  /** PLACEHOLDER: ex.: [{ days: 'Terça a sexta', hours: '9h às 19h' }, { days: 'Sábado', hours: '8h às 14h' }] */
  hours: null,
};

/** Número no formato do wa.me: DDI 55 + DDD + 8 ou 9 dígitos. */
export function isWhatsappNumber(number: string): boolean {
  return /^55\d{10,11}$/.test(number);
}

export const hasWhatsapp = isWhatsappNumber(business.whatsapp.number);

/** Telefone para exibição, ex.: "(11) 91234-5678". */
export function formatPhone(number: string): string {
  const local = number.replace(/^55/, '');
  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  const split = rest.length - 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export function whatsappUrl(message: string = business.whatsapp.message, number: string = business.whatsapp.number): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export type BookingChannel = 'whatsapp' | 'instagram';

export interface Booking {
  channel: BookingChannel;
  href: string;
  /** Texto do botão principal. */
  label: string;
  /** Nome do canal, para frases como "Fale pelo WhatsApp". */
  channelName: string;
}

/**
 * Para onde vão os botões de agendamento: WhatsApp quando houver número
 * válido, senão o Direct do Instagram (o único canal público confirmado).
 */
export function resolveBooking(number: string, message: string = business.whatsapp.message): Booking {
  if (isWhatsappNumber(number)) {
    return {
      channel: 'whatsapp',
      href: whatsappUrl(message, number),
      label: 'Agendar pelo WhatsApp',
      channelName: 'WhatsApp',
    };
  }
  return { channel: 'instagram', href: business.instagram.direct, label: 'Agendar pelo Instagram', channelName: 'Instagram' };
}

export function booking(message?: string): Booking {
  return resolveBooking(business.whatsapp.number, message);
}

export function fullAddress(address: Address): string {
  const head = [address.street, address.district].filter(Boolean).join(', ');
  const tail = [`${address.city} - ${address.state}`, address.postalCode].filter(Boolean).join(', ');
  return `${head}, ${tail}`;
}

export function mapsUrl(address: Address): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(address))}`;
}
