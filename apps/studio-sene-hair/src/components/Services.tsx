import { messages, promo, services, whatsappLink, type Service } from '../data/site';
import { usePromoActive } from '../hooks/usePromoActive';
import { ArrowIcon, WhatsAppIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeading } from './ui/SectionHeading';

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <article className="group flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-linen">
        <Picture
          image={service.image}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 80vw"
          className="photo-zoom size-full object-cover"
        />
        <span className="absolute left-4 top-4 bg-cream/90 px-2.5 py-1.5 text-[0.625rem] font-medium tracking-[0.28em] text-espresso backdrop-blur-sm">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-6">
        <p className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-bronze">{service.kicker}</p>
        <h3 className="mt-3 font-display text-[2rem] leading-none text-espresso">{service.name}</h3>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-cafe text-pretty">{service.description}</p>
        {service.indication && (
          <p className="mt-4 border-l border-bronze/40 pl-4 text-[0.8125rem] leading-relaxed text-cafe/90">
            <span className="mb-1 block text-[0.625rem] font-medium uppercase tracking-[0.28em] text-bronze">
              Indicado para
            </span>
            {service.indication}
          </p>
        )}
        <a
          href={whatsappLink(messages.service(service.name.toLowerCase()))}
          target="_blank"
          rel="noopener noreferrer"
          className="link-line mt-auto self-start pt-7 text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-espresso"
          aria-label={`Agendar ${service.name} pelo WhatsApp`}
        >
          <WhatsAppIcon className="size-3.5 text-bronze" />
          Agendar pelo WhatsApp
        </a>
      </div>
    </article>
  );
}

function PromoBand() {
  const active = usePromoActive(promo.validUntil);
  if (!active) return null;
  return (
    <Reveal className="mt-24 md:mt-32">
      <aside
        aria-label="Campanha do mês"
        className="relative grid overflow-hidden bg-espresso text-ivory md:grid-cols-12"
      >
        <span className="absolute inset-y-0 left-0 w-1 bg-[#c9a39a]" aria-hidden="true" />
        <div className="px-7 py-10 md:col-span-7 md:px-14 md:py-14">
          <p className="eyebrow text-[#dcbdb5]">Edição especial · Outubro</p>
          <h3 className="mt-5 font-display text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.02]">
            Outubro Rosa <em className="italic text-gold">no Studio Sene</em>
          </h3>
          <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-linen">{promo.body}</p>
          <p className="mt-6 text-[0.625rem] font-medium uppercase tracking-[0.3em] text-gold">
            Mais brilho · Fios mais fortes · Cabelos mais saudáveis
          </p>
        </div>
        <div className="flex flex-col justify-center gap-5 border-t border-ivory/10 px-7 py-10 md:col-span-5 md:border-l md:border-t-0 md:px-12 md:py-14">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-ivory/60">{promo.note}</p>
          <a
            href={whatsappLink(promo.message)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-light self-start"
          >
            Quero aproveitar
            <ArrowIcon className="btn-arrow h-3 w-7" />
          </a>
        </div>
      </aside>
    </Reveal>
  );
}

export function Services() {
  return (
    <section id="servicos" aria-labelledby="servicos-titulo" className="grain relative bg-sand py-24 md:py-36">
      <div className="container-x">
        <SectionHeading
          id="servicos-titulo"
          index="02"
          label="Serviços"
          lines={[
            'Tratamentos',
            <>
              para <em className="italic text-bronze">cada fio.</em>
            </>,
          ]}
          intro="Entenda a diferença e escolha o melhor para o seu cabelo: cada serviço tem um objetivo — e a gente te ajuda a decidir."
        />
      </div>

      {/* Celular: carrossel com rolagem horizontal. A partir do md: grade editorial. */}
      <div className="mt-16 md:mt-24">
        <ul
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:px-8 md:container-x md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-20 md:overflow-visible md:pb-0 xl:grid-cols-4"
          aria-label="Lista de serviços"
        >
          {services.map((service, i) => (
            <li
              key={service.id}
              id={service.id}
              className="w-[80vw] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none xl:[&:nth-child(4n+2)]:mt-16 xl:[&:nth-child(4n+4)]:mt-16"
            >
              <Reveal delay={(i % 4) * 0.08} className="h-full">
                <ServiceCard service={service} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>
        <p
          className="container-x mt-6 text-[0.625rem] font-medium uppercase tracking-[0.3em] text-taupe md:hidden"
          aria-hidden="true"
        >
          Deslize para ver todos →
        </p>
      </div>

      <div className="container-x">
        <PromoBand />
      </div>
    </section>
  );
}
