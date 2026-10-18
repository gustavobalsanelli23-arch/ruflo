// Fonte única dos dados da Geri Barbearia. Tudo aqui foi conferido no
// Instagram oficial (@geri_barbearia): bio, artes de horário e posts.
// Para mudar telefone, endereço ou horários, altere somente este arquivo.

/** Endereço público onde o site será publicado (canonical, Open Graph, sitemap). */
export const SITE_URL = 'https://geri-barbearia.vercel.app';

export const business = {
  name: 'Geri Barbearia',
  barber: 'Rogério Schmidt',
  /** Inauguração: o post de 1 ano celebra o 13/09 (2025); o emblema diz "Desde 2024". */
  foundedOn: '2024-09-13',
  motto: 'Chegou, cortou!',
  instagram: {
    handle: 'geri_barbearia',
    url: 'https://www.instagram.com/geri_barbearia/',
  },
  whatsapp: {
    /** DDI + DDD + número, só dígitos (formato do wa.me). */
    number: '5547992537118',
    display: '(47) 99253-7118',
    message: 'Olá, Geri! Vim pelo site e queria saber como está o movimento hoje.',
  },
  address: {
    street: 'Rua Celso Ramos, 5330',
    district: 'Centro',
    city: 'Benedito Novo',
    state: 'SC',
    postalCode: '89124-000',
    country: 'BR',
    reference: 'Em frente à CASAN',
  },
} as const;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
/** Faixas em minutos desde a meia-noite, horário de Brasília. */
export type Range = readonly [open: number, close: number];

const t = (h: number, m = 0) => h * 60 + m;

/** Horário de atendimento (ordem de chegada). Dias ausentes = fechado. */
export const openingHours: Readonly<Partial<Record<Weekday, readonly Range[]>>> = {
  2: [
    [t(8, 30), t(12)],
    [t(13, 30), t(20)],
  ],
  3: [
    [t(8, 30), t(12)],
    [t(13, 30), t(20)],
  ],
  4: [
    [t(8, 30), t(12)],
    [t(13, 30), t(20)],
  ],
  5: [
    [t(8, 30), t(12)],
    [t(13, 30), t(20)],
  ],
  6: [[t(8), t(12)]],
};

/** Como os horários aparecem para o cliente. */
export const hoursTable = [
  { label: 'Terça a sexta', days: [2, 3, 4, 5], times: ['8h30 às 12h', '13h30 às 20h'] },
  { label: 'Sábado', days: [6], times: ['8h às 12h'] },
  { label: 'Domingo e segunda', days: [0, 1], times: ['Fechado'] },
] as const;

export const TIME_ZONE = 'America/Sao_Paulo';

export const fullAddress = `${business.address.street}, ${business.address.district}, ${business.address.city} - ${business.address.state}, ${business.address.postalCode}`;

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

/** Link do WhatsApp com mensagem inicial já preenchida. */
export function whatsappUrl(message: string = business.whatsapp.message): string {
  return `https://wa.me/${business.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
