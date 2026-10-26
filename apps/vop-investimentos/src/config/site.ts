// Fonte única dos dados institucionais da VOP. Para mudar WhatsApp, e-mail,
// endereço, CRECI, domínio ou o destino do formulário, altere só este arquivo.
//
// PESQUISA (26/10/2026): o perfil @vop_investimentos exige login para ser
// visto, e a busca pública não encontrou site, CNPJ, CRECI nem endereço da
// empresa. Confirmado apenas o @ do Instagram (enviado no briefing).
// Tudo o mais está como PLACEHOLDER: o site esconde o que falta, nada é
// inventado, e o build lista as pendências (scripts/prerender.mjs).

/** PLACEHOLDER: endereço público definitivo (canonical, Open Graph, sitemap). */
export const SITE_URL = 'https://vop-investimentos.vercel.app';

export interface Address {
  street: string;
  district?: string;
  city: string;
  /** Sigla do estado, ex.: "SP". */
  state: string;
  postalCode?: string;
}

export interface Business {
  /** Nome como a marca assina. */
  name: string;
  /** Nome completo, para títulos e dados estruturados. */
  fullName: string;
  /** Razão social e CNPJ, quando confirmados (rodapé). */
  legalName: string | null;
  cnpj: string | null;
  /** Registro no CRECI-SP (obrigatório em anúncios imobiliários). */
  creci: string | null;
  instagram: { handle: string; url: string; direct: string };
  whatsapp: { number: string; message: string };
  email: string | null;
  address: Address | null;
  /**
   * Destino do formulário de contato (POST JSON): Formspree, um CRM, uma
   * função serverless… Vazio = o formulário compõe a mensagem e a entrega
   * pelo WhatsApp ou, sem ele, pelo Direct do Instagram.
   */
  formEndpoint: string | null;
}

export const business: Business = {
  name: 'VOP',
  fullName: 'VOP Investimentos Imobiliários',
  legalName: null,
  cnpj: null,
  creci: null,
  instagram: {
    handle: 'vop_investimentos',
    url: 'https://www.instagram.com/vop_investimentos/',
    /** Abre uma conversa no Direct do Instagram. */
    direct: 'https://ig.me/m/vop_investimentos',
  },
  whatsapp: {
    /**
     * PLACEHOLDER. DDI + DDD + número, só dígitos (formato do wa.me), ex.:
     * '5511999998888'. Enquanto estiver vazio, os botões "Fale com um
     * especialista" abrem o Direct do Instagram.
     */
    number: '',
    message: 'Olá! Vim pelo site da VOP e gostaria de falar com um especialista.',
  },
  email: null,
  address: null,
  formEndpoint: null,
};

/** Número no formato do wa.me: DDI 55 + DDD + 8 ou 9 dígitos. */
export function isWhatsappNumber(number: string): boolean {
  return /^55\d{10,11}$/.test(number);
}

export const hasWhatsapp = isWhatsappNumber(business.whatsapp.number);

/** Telefone para exibição, ex.: "(11) 99999-8888". */
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

export type ChannelId = 'whatsapp' | 'instagram';

export interface Channel {
  id: ChannelId;
  href: string;
  /** Nome do canal, para frases como "abre o WhatsApp". */
  name: string;
  /** O link aceita a mensagem pronta? (o Direct do Instagram não aceita). */
  prefill: boolean;
}

/**
 * Para onde vão os botões "Fale com um especialista": WhatsApp com mensagem
 * pronta quando houver número; senão o Direct do Instagram, o único canal
 * público confirmado.
 */
export function resolveChannel(message: string = business.whatsapp.message, number: string = business.whatsapp.number): Channel {
  if (isWhatsappNumber(number)) return { id: 'whatsapp', href: whatsappUrl(message, number), name: 'WhatsApp', prefill: true };
  return { id: 'instagram', href: business.instagram.direct, name: 'Instagram', prefill: false };
}

export function fullAddress(address: Address): string {
  const head = [address.street, address.district].filter(Boolean).join(', ');
  const tail = [`${address.city} - ${address.state}`, address.postalCode].filter(Boolean).join(', ');
  return `${head}, ${tail}`;
}

export function mapsUrl(address: Address): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(address))}`;
}

/** Lista do que ainda falta confirmar — impressa no build. */
export function pendingBusinessData(b: Business = business, siteUrl: string = SITE_URL): string[] {
  const pending: string[] = [];
  if (siteUrl.endsWith('.vercel.app')) pending.push('domínio definitivo (SITE_URL)');
  if (!isWhatsappNumber(b.whatsapp.number)) pending.push('WhatsApp oficial');
  if (!b.creci) pending.push('CRECI');
  if (!b.legalName || !b.cnpj) pending.push('razão social e CNPJ');
  if (!b.email) pending.push('e-mail de contato');
  if (!b.address) pending.push('endereço (se houver atendimento presencial)');
  if (!b.formEndpoint) pending.push('destino do formulário (formEndpoint), se a VOP quiser receber por e-mail/CRM');
  return pending;
}
