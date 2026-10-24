// Fonte única dos dados da Fer Barber Brandt. Para mudar WhatsApp, endereço,
// horários, plataforma de agendamento ou o domínio do site, altere só este arquivo.
//
// VERIFICADO: o nome da marca e o perfil oficial no Instagram (@ferbarber.brandt).
// Todo o resto ficou como PLACEHOLDER (null ou vazio), porque o perfil não pôde
// ser lido a partir do ambiente de desenvolvimento e nenhuma outra fonte pública
// da barbearia foi encontrada. O site esconde o que não estiver preenchido e
// nunca inventa nada no lugar.

/** PLACEHOLDER: endereço público definitivo (canonical, Open Graph, sitemap). */
export const SITE_URL = 'https://fer-barber-brandt.vercel.app';

export interface Address {
  street: string;
  district?: string;
  city: string;
  /** Sigla do estado, ex.: "SC". */
  state: string;
  postalCode?: string;
  /** Ponto de referência opcional, ex.: "Em frente à praça". */
  reference?: string;
}

export interface HoursRow {
  /** Como aparece para o cliente, ex.: "Terça a sexta". */
  days: string;
  /** Ex.: "9h às 19h" ou "Fechado". */
  hours: string;
}

export interface BookingPlatform {
  /** Nome da plataforma, ex.: "Booksy", "Trinks", "AppBarber". */
  name: string;
  /** Link público da agenda da barbearia nessa plataforma. */
  url: string;
}

export interface Business {
  name: string;
  /** Como o barbeiro é chamado nos textos e na mensagem do WhatsApp. */
  barber: string;
  instagram: { handle: string; url: string; direct: string };
  whatsapp: { number: string; message: string };
  bookingPlatform: BookingPlatform | null;
  address: Address | null;
  hours: readonly HoursRow[] | null;
}

export const business: Business = {
  name: 'Fer Barber Brandt',
  barber: 'Fer',
  instagram: {
    handle: 'ferbarber.brandt',
    url: 'https://www.instagram.com/ferbarber.brandt/',
    /** Abre uma conversa no Direct do Instagram. */
    direct: 'https://ig.me/m/ferbarber.brandt',
  },
  whatsapp: {
    /**
     * PLACEHOLDER. DDI + DDD + número, só dígitos (formato do wa.me), ex.:
     * '5547999998888'. Enquanto estiver vazio, todos os botões de agendamento
     * abrem o Direct do Instagram e passam a dizer "Agendar pelo Instagram".
     */
    number: '',
    message: 'Olá, Fer! Vim pelo site e quero agendar um horário.',
  },
  /** PLACEHOLDER: ex.: { name: 'Booksy', url: 'https://booksy.com/…' }. */
  bookingPlatform: null,
  /** PLACEHOLDER: preencha para exibir endereço, mapa e dados estruturados. */
  address: null,
  /** PLACEHOLDER: ex.: [{ days: 'Terça a sexta', hours: '9h às 19h' }, { days: 'Sábado', hours: '8h às 14h' }] */
  hours: null,
};

/** Número no formato do wa.me: DDI 55 + DDD + 8 ou 9 dígitos. */
export function isWhatsappNumber(number: string): boolean {
  return /^55\d{10,11}$/.test(number);
}

export const hasWhatsapp = isWhatsappNumber(business.whatsapp.number);

/** Telefone para exibição, ex.: "(47) 99999-8888". */
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

export type BookingChannel = 'whatsapp' | 'platform' | 'instagram';

export interface Booking {
  channel: BookingChannel;
  href: string;
  /** Texto do botão principal. */
  label: string;
  /** Nome do canal, para frases como "abre o WhatsApp". */
  channelName: string;
}

/**
 * Para onde vão os botões de agendamento, em ordem de preferência:
 * WhatsApp (com mensagem pronta), a plataforma de agendamento e, sem nenhum
 * dos dois, o Direct do Instagram — o único canal público confirmado.
 */
export function resolveBooking(
  number: string,
  platform: BookingPlatform | null = business.bookingPlatform,
  message: string = business.whatsapp.message,
): Booking {
  if (isWhatsappNumber(number)) {
    return { channel: 'whatsapp', href: whatsappUrl(message, number), label: 'Agendar pelo WhatsApp', channelName: 'WhatsApp' };
  }
  if (platform) {
    return { channel: 'platform', href: platform.url, label: 'Agendar online', channelName: platform.name };
  }
  return { channel: 'instagram', href: business.instagram.direct, label: 'Agendar pelo Instagram', channelName: 'Instagram' };
}

export function booking(message?: string): Booking {
  return resolveBooking(business.whatsapp.number, business.bookingPlatform, message);
}

/** Mensagem pronta para um serviço específico (usada quando há WhatsApp). */
export function serviceMessage(service: string): string {
  return `Olá, ${business.barber}! Vim pelo site e quero agendar: ${service}.`;
}

export function fullAddress(address: Address): string {
  const head = [address.street, address.district].filter(Boolean).join(', ');
  const tail = [`${address.city} - ${address.state}`, address.postalCode].filter(Boolean).join(', ');
  return `${head}, ${tail}`;
}

export function mapsUrl(address: Address): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(address))}`;
}

/** Mapa incorporado do Google (sem chave de API). */
export function mapsEmbedUrl(address: Address): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress(address))}&z=16&output=embed`;
}

/** Lista do que ainda falta confirmar — impressa no build (scripts/prerender.mjs). */
export function pendingBusinessData(b: Business = business): string[] {
  const pending: string[] = [];
  if (SITE_URL.endsWith('.vercel.app')) pending.push('domínio definitivo (SITE_URL)');
  if (!isWhatsappNumber(b.whatsapp.number)) pending.push('WhatsApp');
  if (!b.address) pending.push('endereço');
  if (!b.hours) pending.push('horários de funcionamento');
  if (!b.bookingPlatform) pending.push('plataforma de agendamento (se houver)');
  return pending;
}
