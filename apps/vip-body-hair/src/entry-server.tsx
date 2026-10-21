// Entrada de pré-renderização (SSG): gera o HTML estático de cada página no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { PrivacyPage } from './PrivacyPage';
import { SITE_URL, address, business, faqs, featuredServices, hours, links, moreServices, whatsapp } from './data/site';

export type Page = 'home' | 'politica-de-privacidade';

export function render(page: Page) {
  return renderToString(<StrictMode>{page === 'home' ? <App /> : <PrivacyPage />}</StrictMode>);
}

/** Schema.org (JSON-LD) apenas com informações verificadas (sem notas autoatribuídas). */
export function schema() {
  const salonId = `${SITE_URL}/#salao`;
  const services = [
    ...featuredServices.flatMap((s) => s.items),
    ...moreServices.flatMap((g) => g.items),
  ];
  const graph = [
    {
      '@type': ['HairSalon', 'BeautySalon'],
      '@id': salonId,
      name: business.name,
      description: business.description,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon-512.png`,
      image: [`${SITE_URL}/images/og-vip-body-hair.jpg`, `${SITE_URL}/images/salao-interior-720.webp`],
      telephone: whatsapp.number.replace(/^55/, '+55 '),
      email: business.email,
      priceRange: '$$$',
      currenciesAccepted: 'BRL',
      address: {
        '@type': 'PostalAddress',
        streetAddress: address.street,
        addressNeighborhood: address.district,
        addressLocality: address.city,
        addressRegion: address.state,
        postalCode: address.postalCode,
        addressCountry: 'BR',
      },
      geo: { '@type': 'GeoCoordinates', latitude: address.lat, longitude: address.lng },
      hasMap: links.googleMaps,
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: hours.schemaDays, opens: hours.opens, closes: hours.closes },
      ],
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Entrada acessível para cadeirantes', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Banheiro acessível para cadeirantes', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Estacionamento acessível para cadeirantes', value: true },
      ],
      sameAs: [links.instagram, links.facebook],
      employee: {
        '@type': 'Person',
        name: 'Ricky Moica',
        jobTitle: 'Diretor criativo',
        sameAs: [links.rickyInstagram],
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Serviços',
        itemListElement: services.map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
      },
      potentialAction: {
        '@type': 'ReserveAction',
        target: { '@type': 'EntryPoint', urlTemplate: `https://wa.me/${whatsapp.number}` },
        name: 'Agendar pelo WhatsApp',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#site`,
      url: `${SITE_URL}/`,
      name: business.name,
      inLanguage: 'pt-BR',
      publisher: { '@id': salonId },
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
