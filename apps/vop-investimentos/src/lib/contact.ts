// Regras do formulário de contato, sem dependência de interface (testáveis).
// O destino é decidido pela configuração (config/site.ts), nesta ordem:
//  1. formEndpoint: POST JSON para um serviço real (Formspree, CRM, função);
//  2. WhatsApp: abre a conversa com a mensagem pronta;
//  3. Instagram: copia a mensagem e abre o Direct (que não aceita texto pronto).
// Nada é simulado: sem endpoint, o site não finge que "enviou".
import { business, isWhatsappNumber, whatsappUrl, type Business } from '../config/site';
import { interests } from '../data/content';

export interface ContactInput {
  name: string;
  phone: string;
  email: string;
  interest: string;
  message: string;
  consent: boolean;
}

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export const emptyContact: ContactInput = { name: '', phone: '', email: '', interest: '', message: '', consent: false };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Só os dígitos do telefone, sem o 55 do país. */
export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
}

/** Máscara enquanto digita: (11) 99999-8888. */
export function maskPhone(value: string): string {
  const d = phoneDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export const MESSAGE_MAX = 800;

export function validateContact(input: ContactInput): FieldErrors {
  const errors: FieldErrors = {};
  if (input.name.trim().length < 2) errors.name = 'Informe seu nome.';
  const phone = phoneDigits(input.phone);
  const email = input.email.trim();
  if (!phone && !email) errors.phone = 'Informe um telefone ou um e-mail para o retorno.';
  if (phone && (phone.length < 10 || phone.length > 11)) errors.phone = 'Telefone com DDD, ex.: (11) 99999-8888.';
  if (email && !EMAIL.test(email)) errors.email = 'Confira o e-mail, ex.: nome@dominio.com.br.';
  if (!(interests as readonly string[]).includes(input.interest)) errors.interest = 'Escolha o assunto.';
  if (input.message.length > MESSAGE_MAX) errors.message = `Use até ${MESSAGE_MAX} caracteres.`;
  if (!input.consent) errors.consent = 'Autorize o contato para continuar.';
  return errors;
}

/** Texto que chega à VOP (WhatsApp, Direct ou corpo do POST). */
export function composeMessage(input: ContactInput): string {
  const lines = [`Olá! Vim pelo site da VOP. Meu nome é ${input.name.trim()}.`, `Assunto: ${input.interest}.`];
  if (input.message.trim()) lines.push(input.message.trim());
  const contact = [phoneDigits(input.phone) && `telefone ${maskPhone(input.phone)}`, input.email.trim() && `e-mail ${input.email.trim()}`]
    .filter(Boolean)
    .join(' ou ');
  lines.push(`Contato: ${contact}.`);
  return lines.join('\n');
}

export type Delivery =
  | { kind: 'endpoint'; url: string; label: string }
  | { kind: 'whatsapp'; label: string }
  | { kind: 'instagram'; href: string; label: string };

export function resolveDelivery(b: Business = business): Delivery {
  if (b.formEndpoint) return { kind: 'endpoint', url: b.formEndpoint, label: 'Enviar mensagem' };
  if (isWhatsappNumber(b.whatsapp.number)) return { kind: 'whatsapp', label: 'Enviar pelo WhatsApp' };
  return { kind: 'instagram', href: b.instagram.direct, label: 'Copiar mensagem e abrir o Direct' };
}

export function whatsappFor(input: ContactInput, b: Business = business): string {
  return whatsappUrl(composeMessage(input), b.whatsapp.number);
}

/** Envia ao endpoint configurado. Lança erro em resposta não-2xx. */
export async function postContact(url: string, input: ContactInput, fetcher: typeof fetch = fetch): Promise<void> {
  const res = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      nome: input.name.trim(),
      telefone: phoneDigits(input.phone) ? maskPhone(input.phone) : '',
      email: input.email.trim(),
      assunto: input.interest,
      mensagem: composeMessage(input),
      origem: 'site',
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Copia para a área de transferência; devolve false se o navegador recusar. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
