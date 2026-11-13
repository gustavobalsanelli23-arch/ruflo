/**
 * Who is responsible for SOLUS, as shown in the privacy policy, terms of use,
 * cookie policy and refund policy. Every `[PREENCHER: …]` must be replaced
 * before the service is offered to real customers: the LGPD requires the
 * controller's identity and the contact of the person in charge of data
 * protection (encarregado) to be public.
 */
export const LEGAL = {
  /** Razão social or full name of the controller. */
  controller: '[PREENCHER: razão social ou nome completo do responsável]',
  /** CNPJ or CPF. */
  document: '[PREENCHER: CNPJ ou CPF]',
  address: '[PREENCHER: endereço]',
  /** Contact of the encarregado (LGPD art. 41) and for privacy requests. */
  privacyEmail: '[PREENCHER: e-mail do encarregado]',
  supportEmail: '[PREENCHER: e-mail de atendimento]',
  /** Court chosen in the terms of use. */
  forumCity: '[PREENCHER: cidade e estado do foro]',
  /** Date of the current version of the documents. Changing it asks people to read them again. */
  updatedAt: '13 de novembro de 2026',
  version: '2026-11-13',
} as const;

export const LEGAL_PAGES = [
  { href: '/planos', label: 'Planos' },
  { href: '/termos', label: 'Termos de uso' },
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/reembolso', label: 'Reembolso' },
] as const;
