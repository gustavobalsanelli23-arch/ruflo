// Entrada de pré-renderização (SSG): gera o HTML estático no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { SITE_URL, business, fullAddress, hasWhatsapp, pendingBusinessData } from './config/site';
import { pendingContent, regions, services } from './data/content';
import { chapterStill } from './data/media';
import { catalog } from './data/properties';

export { SITE_URL };

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/**
 * Schema.org (JSON-LD) só com o que é confirmado. Serviços e regiões do
 * briefing entram quando marcados como confirmados em data/content.ts;
 * telefone, e-mail, endereço e CRECI, quando preenchidos em config/site.ts.
 */
export function schema() {
  const agent: Record<string, unknown> = {
    '@type': 'RealEstateAgent',
    '@id': `${SITE_URL}/#vop`,
    name: business.fullName,
    alternateName: business.name,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og.jpg`,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [business.instagram.url],
  };
  if (business.legalName) agent.legalName = business.legalName;
  if (business.cnpj) agent.taxID = business.cnpj;
  if (hasWhatsapp) agent.telephone = `+${business.whatsapp.number}`;
  if (business.email) agent.email = business.email;
  if (business.address) {
    agent.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.postalCode,
      addressCountry: 'BR',
    };
    agent.description = fullAddress(business.address);
  }
  if (services.confirmed) agent.knowsAbout = services.items.map((s) => s.name);
  if (regions.confirmed) agent.areaServed = regions.items.map((r) => ({ '@type': 'Place', name: r.name }));

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      agent,
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: `${SITE_URL}/`,
        name: business.fullName,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${SITE_URL}/#vop` },
      },
    ],
  });
}

/** <link rel="preload"> do quadro parado do hero (a primeira pintura grande). */
export function heroPreload() {
  return `<link rel="preload" as="image" type="image/webp" href="${chapterStill}" fetchpriority="high">`;
}

/** O que ainda falta para o site estar completo (avisos do build). */
export function pending() {
  return {
    data: pendingBusinessData(),
    content: pendingContent(),
    catalog: catalog.demo ? ['catálogo de imóveis (hoje só exemplos demonstrativos)'] : [],
    media: ['logotipo oficial em vetor (SVG)', 'fotografias e vídeos próprios da VOP (hoje: banco de imagens)'],
  };
}
