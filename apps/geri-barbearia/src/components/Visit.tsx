import { useRef } from 'react';
import { MapPin } from 'lucide-react';
import { business, hoursTable, mapsUrl, whatsappUrl } from '../config/site';
import { useOpenStatus } from '../hooks/useOpenStatus';
import { useReveal } from '../hooks/useReveal';
import { Emblem } from './Emblem';
import { OpenStatus, WhatsAppButton } from './ui';

export function Visit() {
  const root = useRef<HTMLElement>(null);
  const { today } = useOpenStatus();
  useReveal(root);

  return (
    <section ref={root} id="visite" aria-labelledby="visite-titulo" className="section-y relative bg-coffee">
      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-6">
          <h2 id="visite-titulo" data-reveal="lines" className="text-display max-w-[11ch]">
            Sua vez na cadeira.
          </h2>
          <p data-reveal="fade" className="mt-8 max-w-md text-lead text-bone/80">
            A Geri atende por ordem de chegada. Quer saber como está o movimento antes de sair de casa? Chame no
            WhatsApp.
          </p>

          <div data-reveal="fade" className="mt-10 flex flex-col items-start gap-5">
            <WhatsAppButton source="visite" className="max-sm:w-full sm:min-h-16 sm:px-9 sm:text-base" />
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="link-line link-line--quiet text-sm text-parchment tabular-nums"
            >
              WhatsApp {business.whatsapp.display}
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>

          <OpenStatus className="mt-10 text-parchment" />

          <address data-reveal="fade" className="mt-14 border-t border-[var(--line)] pt-8 not-italic">
            <p className="flex items-start gap-3 text-lead">
              <MapPin size={20} strokeWidth={1.5} className="mt-1 shrink-0 text-gold" aria-hidden="true" />
              <span>
                {business.address.street}, {business.address.district}
                <br />
                {business.address.city}, {business.address.state}
                <span className="mt-1 block text-[0.95rem] text-parchment/80">{business.address.reference}</span>
              </span>
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-line mt-6 ml-8 text-sm text-bone/90"
              data-cta="maps"
            >
              Abrir no Google Maps
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </address>
        </div>

        {/* A placa de horários, no estilo da vitrine: vidro preto e filete dourado */}
        <div className="lg:col-span-5 lg:col-start-8 lg:pt-6">
          <div data-reveal="image" className="relative bg-ink p-3 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)]">
            <div className="border border-gold/70 p-[3px]">
              <div className="border border-gold/40 px-6 py-10 sm:px-10 sm:py-12">
                <div className="flex flex-col items-center text-center">
                  <Emblem markOnly className="h-12 w-12 text-gold" />
                  <h3 className="signage mt-5 text-parchment">Horário de atendimento</h3>
                  <span className="rule-double mt-5 w-16" aria-hidden="true" />
                </div>

                <dl className="mt-8">
                  {hoursTable.map((row) => {
                    const isToday = today !== null && (row.days as readonly number[]).includes(today);
                    return (
                      <div
                        key={row.label}
                        className={`grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-[var(--line)] py-5 last:border-b-0 ${
                          isToday ? 'text-bone' : 'text-bone/75'
                        }`}
                      >
                        <dt className="relative text-[0.95rem]">
                          <span
                            aria-hidden="true"
                            className={`absolute top-[0.6em] -left-4 h-[6px] w-[6px] rotate-45 bg-gold transition-opacity ${
                              isToday ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {row.label}
                          {isToday && <span className="mt-1 block text-xs text-gold">Hoje</span>}
                        </dt>
                        <dd className="text-right font-serif text-[1.35rem] leading-snug tabular-nums sm:text-[1.5rem]">
                          {row.times.map((time) => (
                            <span key={time} className="block">
                              {time}
                            </span>
                          ))}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <p className="signage mt-8 text-center text-[0.68rem] text-gold">Atendimento por ordem de chegada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
