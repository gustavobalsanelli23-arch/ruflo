// Fonte única dos dados do site. Tudo aqui foi conferido no Instagram oficial
// (@theus_barbeiro_). O que ainda não foi confirmado fica `null` e o site
// esconde o bloco correspondente: nada de número, preço, horário ou endereço inventado.

/** Domínio público do site (canonical, Open Graph, sitemap). Troque pelo domínio definitivo. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || 'https://barbearia-black-gtsec.vercel.app';

export const business = {
  name: 'Barbearia Black',
  barber: 'Matheus',
  instagramHandle: 'theus_barbeiro_',
} as const;

export const links = {
  instagram: `https://www.instagram.com/${business.instagramHandle}/`,
  /** Abre a conversa no Direct do Instagram (app ou web). */
  instagramDirect: `https://ig.me/m/${business.instagramHandle}`,
} as const;

/**
 * WhatsApp oficial do Matheus, só dígitos com DDI (55 + DDD + número).
 * Pode ser sobrescrito pela variável de ambiente VITE_WHATSAPP_NUMBER no deploy;
 * se ficar vazio ou inválido, o agendamento volta a usar o Direct do Instagram.
 */
const WHATSAPP_NUMBER: string | null = '5547996410356';

function normalizeWhatsapp(raw: string | null | undefined) {
  const digits = (raw ?? '').replace(/\D/g, '');
  return /^55\d{10,11}$/.test(digits) ? digits : null;
}

export const whatsappNumber = normalizeWhatsapp(
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? WHATSAPP_NUMBER,
);

export const bookingMessage =
  'Olá, Matheus! Gostaria de agendar um horário na Barbearia Black. Quais horários estão disponíveis?';

export type BookingChannel = 'whatsapp' | 'instagram';
export const bookingChannel: BookingChannel = whatsappNumber ? 'whatsapp' : 'instagram';

/** Link de agendamento: WhatsApp com a mensagem pronta ou, sem número configurado, o Direct. */
export function bookingHref(message = bookingMessage) {
  return whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : links.instagramDirect;
}

/** "(11) 91234-5678" a partir de "5511912345678". */
export function formatPhone(digits: string) {
  const local = digits.slice(2);
  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  return `(${ddd}) ${rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : `${rest.slice(0, 4)}-${rest.slice(4)}`}`;
}

/**
 * Localização como aparece na bio do Instagram ("barra São João").
 * Cidade, estado, rua e número ainda não confirmados: não exibimos nada além disso.
 */
export const location = { locality: 'Barra São João' } as const;

export type Address = { street: string; district?: string; city: string; state: string; postalCode?: string; mapsUrl?: string };
/** Endereço completo (rua e número): ainda não divulgado no perfil. */
export const address: Address | null = null;

export type HoursRow = { days: string; time: string[]; /** Formato schema.org (openingHours). */ schema: string[] };
/** Horários conforme a bio do Instagram. Domingo e segunda não aparecem na bio. */
export const hours: HoursRow[] | null = [
  { days: 'Terça a sexta', time: ['9h30 – 12h', '13h30 – 20h'], schema: ['Tu-Fr 09:30-12:00', 'Tu-Fr 13:30-20:00'] },
  { days: 'Sábado', time: ['8h30 – 15h'], schema: ['Sa 08:30-15:00'] },
];

export type ImageSet = {
  name: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
};

export type GalleryItem = ImageSet & { caption?: string; permalink?: string };

export const nav = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'cortes', label: 'Cortes' },
  { id: 'agendar', label: 'Agendar' },
  { id: 'instagram', label: 'Instagram' },
] as const;

/** Perfil oficial como aparece no Instagram. */
export const profile = {
  displayName: 'BARBEARIA BLACK',
  /** Frase da própria bio do perfil. */
  tagline: 'Especialista em renovar autoestima.',
};

const post = (code: string) => `https://www.instagram.com/p/${code}/`;

export const pillars = [
  { title: 'Identidade', text: 'O corte parte de quem você é: seu estilo, seu jeito, sua rotina.' },
  { title: 'Detalhe', text: 'Degradê limpo, contorno marcado e acabamento na régua.' },
  { title: 'Atitude', text: 'Do corte clássico ao freestyle, visual com personalidade.' },
];

export type Service = {
  name: string;
  /** Variações confirmadas nas publicações (tags curtas). */
  styles: string[];
  description: string;
  price: number | null;
  duration: string | null;
  /** Foto real que ilustra o serviço (hover no desktop). */
  image: ImageSet;
};

const img = (name: string, width: number, height: number, alt: string, widths = [480, width]): ImageSet => ({
  name,
  widths,
  width,
  height,
  alt,
});

/** Fotografias reais do Instagram, geradas por scripts/optimize-images.mjs. */
const photos = {
  freestylePlatinado: img('corte-freestyle-platinado', 960, 1724, 'Degradê com topo platinado e desenho freestyle na lateral'),
  degradeTexturizado: img('corte-degrade-texturizado-perfil', 960, 1273, 'Perfil de cliente com mid fade e topo texturizado'),
  degradeNuca: img('corte-degrade-nuca', 960, 1273, 'Nuca com degradê na pele e topo texturizado'),
  degradeFrente: img('corte-degrade-frente', 720, 955, 'Cliente na cadeira com low fade e franja texturizada'),
  taperNuca: img('corte-taper-nuca', 960, 1280, 'Taper na nuca com volume no topo'),
  taperCeu: img('corte-taper-ceu', 960, 1280, 'Taper visto de perfil contra o céu azul'),
  freestyleRiscos: img('corte-freestyle-riscos', 608, 1091, 'Degradê com riscos desenhados na lateral'),
  freestyleTexturizado: img('corte-freestyle-texturizado', 608, 1091, 'Corte texturizado com desenho freestyle e degradê na nuca'),
  ambiente: img('ambiente-cadeira-degrade', 608, 1091, 'Cliente com degradê na cadeira da Barbearia Black, com espelho e luzes ao fundo'),
  matheusTrabalhando: img('matheus-corte-infantil', 608, 829, 'Matheus cortando o cabelo de um cliente mirim com a máquina'),
};

/** Somente serviços confirmados nas publicações. Preço e duração só quando divulgados. */
export const services: Service[] = [
  {
    name: 'Corte masculino',
    styles: ['Low fade', 'Mid fade', 'Taper'],
    description: 'Degradê do low ao mid, taper na nuca e topo texturizado, com acabamento na régua.',
    price: null,
    duration: null,
    image: photos.degradeNuca,
  },
  {
    name: 'Freestyle',
    styles: ['Riscos', 'Desenhos'],
    description: 'Riscos e desenhos no degradê, do traço reto ao freestyle completo.',
    price: null,
    duration: null,
    image: photos.freestyleRiscos,
  },
  {
    name: 'Corte infantil',
    styles: ['Molecada'],
    description: 'Corte para os pequenos, com o mesmo cuidado no acabamento.',
    price: null,
    duration: null,
    image: photos.matheusTrabalhando,
  },
];

export const servicePriceNote = 'Valores e horários disponíveis direto com o Matheus, na hora de agendar.';

export const heroImage: ImageSet | null = img(
  'hero-freestyle-pb',
  1100,
  1375,
  'Corte com degradê, topo platinado e desenho freestyle feito na Barbearia Black',
  [480, 800, 1100],
);

export const aboutImage: ImageSet | null = photos.matheusTrabalhando;

/** Galeria: a ordem define as colunas desencontradas (equilibradas para 2 e 3 colunas). */
export const gallery: GalleryItem[] = [
  { ...photos.freestylePlatinado, caption: 'Freestyle + platinado', permalink: post('DdUKfGJhBYB') },
  { ...photos.degradeTexturizado, caption: 'Mid fade texturizado', permalink: post('DM3lmm-SiRA') },
  { ...photos.taperCeu, caption: 'Taper na nuca', permalink: post('DNLcVE5APer') },
  { ...photos.freestyleRiscos, caption: 'Riscos no degradê', permalink: post('DPmpUE9AIYY') },
  { ...photos.degradeNuca, caption: 'Degradê na pele', permalink: post('DM3lmm-SiRA') },
  { ...photos.ambiente, caption: 'Na cadeira', permalink: post('DOKRLeBgK6z') },
  { ...photos.taperNuca, caption: 'Taper com volume', permalink: post('DNLcVE5APer') },
  { ...photos.freestyleTexturizado, caption: '#freestyle', permalink: post('DXiX8CogFnr') },
  { ...photos.degradeFrente, caption: 'Low fade texturizado', permalink: post('DM3lmm-SiRA') },
];

const square = (code: string, alt: string): GalleryItem => ({ name: `feed-${code}`, widths: [560], width: 560, height: 560, alt, permalink: post(code) });

/** Publicações do perfil copiadas no build (sem atualização automática). */
export const feed: GalleryItem[] = [
  square('DdUKfGJhBYB', 'Reel: degradê com freestyle e topo platinado'),
  square('DXiX8CogFnr', 'Reel #freestyle: desenho no degradê'),
  square('DPmpUE9AIYY', 'Reel: riscos no degradê'),
  square('DOKRLeBgK6z', 'Reel: degradê na cadeira da barbearia'),
  square('DNLcVE5APer', 'Carrossel: taper na nuca'),
  square('DM3lmm-SiRA', 'Carrossel: mid fade texturizado'),
];

export const marqueeItems = ['Degradê', 'Freestyle', 'Na régua', business.name, location.locality];
