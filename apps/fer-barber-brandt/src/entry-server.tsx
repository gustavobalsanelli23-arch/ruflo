// Entrada de pré-renderização (SSG): gera o HTML estático no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { SITE_URL, business, fullAddress, hasWhatsapp, mapsUrl, pendingBusinessData } from './config/site';
import { photos, services, transformations, works } from './data/content';
import { hasPhoto, meta, srcSet } from './components/Picture';

export { SITE_URL };

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/**
 * Schema.org (JSON-LD) só com informações verificadas (Instagram oficial).
 * Telefone e horários entram automaticamente quando forem preenchidos em
 * config/site.ts.
 */
export function schema() {
  const { address } = business;
  const shop: Record<string, unknown> = {
    '@type': 'HairSalon',
    '@id': `${SITE_URL}/#barbearia`,
    name: business.name,
    alternateName: business.alias,
    slogan: business.tagline,
    description: `${business.name}: ${services.map((s) => s.name.toLowerCase()).join(', ')}.`,
    url: `${SITE_URL}/`,
    image: [`${SITE_URL}/og.jpg`],
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [business.instagram.url],
    knowsAbout: services.map((s) => s.name),
  };
  if (hasWhatsapp) shop.telephone = `+${business.whatsapp.number}`;
  if (address) {
    shop.address = {
      '@type': 'PostalAddress',
      streetAddress: address.district ? `${address.street} - ${address.district}` : address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: 'BR',
    };
    shop.hasMap = mapsUrl(address);
    shop.areaServed = { '@type': 'City', name: `${address.city}, ${address.state}` };
    shop.description = `${shop.description} ${fullAddress(address)}.`;
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      shop,
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: `${SITE_URL}/`,
        name: business.name,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${SITE_URL}/#barbearia` },
      },
    ],
  });
}

/** <link rel="preload"> da foto do hero (só quando ela existe). */
export function heroPreload() {
  const m = meta(photos.hero);
  if (!m) return '';
  const set = srcSet(photos.hero.id, m, 'avif');
  const mid = m.widths.find((w) => w >= 800) ?? m.widths[m.widths.length - 1];
  return `<link rel="preload" as="image" type="image/avif" href="/images/${photos.hero.id}-${mid}.avif" imagesrcset="${set}" imagesizes="(min-width: 1024px) 52vw, 100vw" fetchpriority="high">`;
}

/** O que ainda falta para o site estar completo (avisos do build). */
export function pending() {
  const missingPhotos = [
    photos.hero,
    photos.ambiente,
    photos.detalhe,
    ...works.map((w) => w.photo),
    ...transformations.flatMap((t) => [t.before, t.after]),
  ]
    .filter((slot) => !hasPhoto(slot))
    .map((slot) => slot.id);
  return {
    data: pendingBusinessData(),
    photos: missingPhotos,
    services: services.some((s) => s.price) ? [] : ['preços e duração dos serviços (não publicados)'],
  };
}
