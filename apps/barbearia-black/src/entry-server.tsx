// Entrada de pré-renderização (SSG): gera o HTML estático da página no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { SITE_URL, address, bookingHref, business, hours, links, location, services, whatsappNumber } from './data/site';

export { SITE_URL };

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/** Schema.org (JSON-LD) apenas com informações verificadas: campos sem dado confirmado ficam de fora. */
export function schema() {
  const shop = {
    '@type': 'BarberShop',
    '@id': `${SITE_URL}/#barbearia`,
    name: business.name,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/images/og-barbearia-black.jpg`,
    sameAs: [links.instagram],
    employee: { '@type': 'Person', name: business.barber, jobTitle: 'Barbeiro' },
    ...(whatsappNumber ? { telephone: `+${whatsappNumber}` } : {}),
    address: address
      ? {
          '@type': 'PostalAddress',
          streetAddress: address.street,
          ...(address.district ? { addressNeighborhood: address.district } : {}),
          addressLocality: address.city,
          addressRegion: address.state,
          ...(address.postalCode ? { postalCode: address.postalCode } : {}),
          addressCountry: 'BR',
        }
      : {
          '@type': 'PostalAddress',
          addressLocality: location.locality,
          addressCountry: 'BR',
        },
    areaServed: location.locality,
    ...(address?.mapsUrl ? { hasMap: address.mapsUrl } : {}),
    ...(hours ? { openingHours: hours.flatMap((h) => h.schema) } : {}),
    ...(services.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Serviços',
            itemListElement: services.map((s) => ({
              '@type': 'Offer',
              ...(s.price != null ? { price: s.price.toFixed(2), priceCurrency: 'BRL' } : {}),
              itemOffered: { '@type': 'Service', name: s.name, description: s.description },
            })),
          },
        }
      : {}),
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: bookingHref() },
      name: 'Agendar horário',
    },
  };
  const site = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#site`,
    url: `${SITE_URL}/`,
    name: business.name,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#barbearia` },
  };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [shop, site] });
}
