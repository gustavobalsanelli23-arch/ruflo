// Entrada de pré-renderização (SSG): gera o HTML estático de cada página no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { LegalPage } from './components/LegalPage';
import type { LegalSlug } from './data/legal';
import { SITE_URL, business, faqs, links, services, units, whatsapp } from './data/site';

export function render(page: 'home' | LegalSlug) {
  return renderToString(<StrictMode>{page === 'home' ? <App /> : <LegalPage slug={page} />}</StrictMode>);
}

/** Schema.org (JSON-LD) apenas com informações verificadas. */
export function schema() {
  const orgId = `${SITE_URL}/#organizacao`;
  const offers = {
    '@type': 'OfferCatalog',
    name: 'Serviços',
    itemListElement: services.map((s) => ({
      '@type': 'Offer',
      price: s.price.toFixed(2),
      priceCurrency: 'BRL',
      itemOffered: { '@type': 'Service', name: s.name, description: s.details },
    })),
  };
  const graph = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: business.name,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon-512.png`,
      email: business.email,
      foundingDate: String(business.foundedYear),
      taxID: business.legalId,
      ...(links.instagram ? { sameAs: [links.instagram] } : {}),
    },
    ...units.map((u) => ({
      '@type': 'BarberShop',
      '@id': `${SITE_URL}/#${u.id}`,
      name: `${business.name} — ${u.shortName}`,
      parentOrganization: { '@id': orgId },
      url: `${SITE_URL}/#unidades`,
      image: [`${SITE_URL}/images/og-conexao-barbearia.jpg`, `${SITE_URL}/images/fachada-unidade-800.webp`],
      priceRange: 'R$ 45 – R$ 55',
      paymentAccepted: 'Dinheiro, Cartão de crédito, Cartão de débito, Pix',
      currenciesAccepted: 'BRL',
      ...(u.whatsappIsCentral ? {} : { telephone: `+${whatsapp.number}` }),
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${u.street}, ${u.complement}`,
        ...(u.district ? { addressNeighborhood: u.district } : {}),
        addressLocality: u.city,
        addressRegion: u.state,
        ...(u.postalCode ? { postalCode: u.postalCode } : {}),
        addressCountry: 'BR',
      },
      geo: { '@type': 'GeoCoordinates', latitude: u.lat, longitude: u.lng },
      hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.name)}&query_place_id=${u.placeId}`,
      hasOfferCatalog: offers,
      potentialAction: {
        '@type': 'ReserveAction',
        target: { '@type': 'EntryPoint', urlTemplate: links.booking },
        name: 'Agendar horário',
      },
    })),
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#site`,
      url: `${SITE_URL}/`,
      name: business.name,
      inLanguage: 'pt-BR',
      publisher: { '@id': orgId },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}
