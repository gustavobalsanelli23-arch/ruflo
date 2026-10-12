import { ArrowUpRight, MapPin, Navigation } from 'lucide-react';
import { mapsLinks, units, whatsappLink } from '../data/site';
import { track } from '../lib/analytics';
import { WhatsAppIcon } from './ui/Icons';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

export function Locations() {
  return (
    <section id="unidades" aria-labelledby="unidades-title" className="relative bg-graphite py-24 md:py-32 lg:py-40">
      <div className="container-x">
        <SectionHeader
          id="unidades-title"
          index="06"
          label="Unidades"
          title={
            <>
              Duas unidades <span className="font-normal italic text-gold">em Barueri.</span>
            </>
          }
          intro="Escolha a unidade mais próxima de você. Trabalhamos com agendamento e também com encaixe."
        />

        <ul className="mt-16 grid gap-6 md:mt-20 lg:grid-cols-2 lg:gap-8">
          {units.map((unit, i) => {
            const maps = mapsLinks(unit);
            return (
              <Reveal as="li" key={unit.id} delay={i * 0.1}>
                <article
                  className="group flex h-full flex-col border border-line bg-ink"
                  aria-labelledby={`unidade-${unit.id}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-graphite sm:aspect-[16/9]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-bone/40"
                    >
                      <MapPin className="size-6 text-gold" strokeWidth={1.25} />
                      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.24em]">Carregando mapa</span>
                    </div>
                    <iframe
                      src={maps.embed}
                      title={`Mapa da ${unit.name}, ${unit.street}, ${unit.city}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 h-full w-full border-0 [filter:grayscale(1)_invert(0.9)_contrast(0.85)_brightness(0.95)] transition-[filter] duration-700 group-hover:[filter:grayscale(0.2)_invert(0)_contrast(1)]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-7 sm:p-10">
                    <p className="eyebrow text-gold">
                      <span className="tabular-nums">Unidade {unit.index}</span>
                    </p>
                    <h3
                      id={`unidade-${unit.id}`}
                      className="mt-4 font-display text-4xl uppercase leading-none text-bone md:text-[2.75rem]"
                    >
                      {unit.shortName}
                    </h3>
                    <address className="mt-6 flex-1 text-[0.9375rem] not-italic leading-relaxed text-bone/70">
                      {unit.street} — {unit.complement}
                      <br />
                      {unit.district && <>{unit.district}, </>}
                      {unit.city}, {unit.state}
                      {unit.postalCode && <> · CEP {unit.postalCode}</>}
                    </address>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      <a
                        href={maps.directions}
                        target="_blank"
                        rel="noopener"
                        onClick={() => track('FindLocation', { unidade: unit.id })}
                        className="btn btn-gold"
                      >
                        <Navigation className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        Traçar rota
                      </a>
                      <a
                        href={whatsappLink(
                          `Olá, Conexão! Gostaria de agendar um horário na unidade ${unit.shortName}. Podem me ajudar?`,
                          unit.whatsapp,
                        )}
                        target="_blank"
                        rel="noopener"
                        onClick={() => track('Contact', { unidade: unit.id })}
                        className="btn btn-ghost"
                      >
                        <WhatsAppIcon className="size-4" />
                        WhatsApp
                      </a>
                    </div>
                    <a
                      href={maps.place}
                      target="_blank"
                      rel="noopener"
                      className="link-line mt-6 self-start text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-bone/70 hover:text-bone"
                    >
                      Abrir no Google Maps
                      <ArrowUpRight className="size-3.5 text-gold" strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
