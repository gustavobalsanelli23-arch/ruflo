// Entrada de pré-renderização (SSG): gera o HTML estático no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { SITE_URL, business, fullAddress, hasWhatsapp, mapsUrl } from './config/site';
import { specialties } from './data/content';

export { SITE_URL };

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/**
 * Schema.org (JSON-LD) só com informações verificadas. Telefone e endereço
 * entram automaticamente quando forem preenchidos em config/site.ts. (Os
 * horários ficam fora: o schema exige um formato estruturado, e o site os
 * guarda em texto livre.)
 */
export function schema() {
  const { address } = business;
  const salon: Record<string, unknown> = {
    '@type': 'HairSalon',
    '@id': `${SITE_URL}/#salao`,
    name: business.name,
    slogan: business.tagline,
    description:
      'Salão de beleza da cabeleireira Meire Costa: mechas e iluminação, loiros personalizados, coloração, cortes em camadas, escova e finalização.',
    url: `${SITE_URL}/`,
    image: [`${SITE_URL}/og.jpg`],
    logo: `${SITE_URL}/icon-512.png`,
    employee: { '@type': 'Person', name: business.professional, jobTitle: 'Cabeleireira' },
    knowsAbout: specialties.map((s) => s.name),
    sameAs: [business.instagram.url],
  };
  if (hasWhatsapp) salon.telephone = `+${business.whatsapp.number}`;
  if (address) {
    salon.address = {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: 'BR',
    };
    salon.hasMap = mapsUrl(address);
    salon.areaServed = { '@type': 'City', name: `${address.city}, ${address.state}` };
    salon.description = `${salon.description} ${fullAddress(address)}.`;
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      salon,
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: `${SITE_URL}/`,
        name: business.name,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${SITE_URL}/#salao` },
      },
    ],
  });
}
