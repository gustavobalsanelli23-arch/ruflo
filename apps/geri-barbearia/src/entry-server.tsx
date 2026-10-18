// Entrada de pré-renderização (SSG): gera o HTML estático no build.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { SITE_URL, business, mapsUrl } from './config/site';
import { services } from './data/content';

export { SITE_URL };

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/** Schema.org (JSON-LD) somente com informações verificadas no Instagram oficial. */
export function schema() {
  const day = (d: string) => `https://schema.org/${d}`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        // schema.org não tem "BarberShop"; HairSalon é o tipo oficial mais próximo.
        '@type': 'HairSalon',
        '@id': `${SITE_URL}/#barbearia`,
        name: business.name,
        description:
          'Barbearia no centro de Benedito Novo (SC). Corte masculino, degradê, desenho freestyle, barba e corte infantil, com atendimento por ordem de chegada.',
        url: `${SITE_URL}/`,
        image: [`${SITE_URL}/og.jpg`, `${SITE_URL}/images/fachada-640.webp`],
        logo: `${SITE_URL}/icon-512.png`,
        telephone: `+${business.whatsapp.number}`,
        foundingDate: business.foundedOn,
        slogan: business.motto,
        address: {
          '@type': 'PostalAddress',
          streetAddress: business.address.street,
          addressLocality: business.address.city,
          addressRegion: business.address.state,
          postalCode: business.address.postalCode,
          addressCountry: business.address.country,
        },
        hasMap: mapsUrl,
        areaServed: { '@type': 'City', name: `${business.address.city}, ${business.address.state}` },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day),
            opens: '08:30',
            closes: '12:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day),
            opens: '13:30',
            closes: '20:00',
          },
          { '@type': 'OpeningHoursSpecification', dayOfWeek: day('Saturday'), opens: '08:00', closes: '12:00' },
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Serviços',
          itemListElement: services.map((s) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: s.name, description: s.description },
          })),
        },
        sameAs: [business.instagram.url],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: `${SITE_URL}/`,
        name: business.name,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${SITE_URL}/#barbearia` },
      },
    ],
  };
  return JSON.stringify(data);
}
