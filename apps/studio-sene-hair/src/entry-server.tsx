// Entrada de pré-renderização (SSG): gera o HTML estático da página no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { address, business, fullAddress, hasAddress, hours, links, services, whatsapp } from './data/site';

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/**
 * Schema.org (JSON-LD) apenas com informações verificadas; campos pendentes ficam
 * de fora. Sem a URL pública (SITE_URL), os campos que exigem endereço absoluto
 * também são omitidos.
 */
export function schema(siteUrl: string) {
  const id = siteUrl ? `${siteUrl}/#studio` : '#studio';
  const absolute = siteUrl
    ? { url: `${siteUrl}/`, image: `${siteUrl}/images/og-studio-sene.jpg`, logo: `${siteUrl}/icon-512.png` }
    : {};
  const salon = {
    '@type': 'HairSalon',
    '@id': id,
    name: business.name,
    alternateName: business.shortName,
    slogan: business.tagline,
    ...absolute,
    telephone: `+${whatsapp.number}`,
    sameAs: [links.instagram],
    areaServed: { '@type': 'City', name: business.city },
    address: {
      '@type': 'PostalAddress',
      ...(hasAddress ? { streetAddress: [address.street, address.complement].filter(Boolean).join(', ') } : {}),
      ...(address.district ? { addressNeighborhood: address.district } : {}),
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      addressLocality: address.city,
      addressRegion: address.state,
      addressCountry: 'BR',
    },
    ...(hours?.some((h) => h.schema) ? { openingHours: hours.flatMap((h) => (h.schema ? [h.schema] : [])) } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Serviços',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, description: s.description },
      })),
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: `https://wa.me/${whatsapp.number}` },
      name: 'Agendar pelo WhatsApp',
    },
    ...(hasAddress
      ? { hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress())}` }
      : {}),
  };
  const website = {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#site`,
    url: `${siteUrl}/`,
    name: business.name,
    inLanguage: 'pt-BR',
    publisher: { '@id': id },
  };
  const graph = siteUrl ? [salon, website] : [salon];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}
