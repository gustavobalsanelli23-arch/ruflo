import { useRef, useState } from 'react';
import { whatsappUrl } from '../config/site';
import { services } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { Emblem } from './Emblem';
import { WhatsAppIcon } from './icons';
import { Picture } from './Picture';
import { WhatsAppButton } from './ui';

export function Services() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(services[0].id);
  useReveal(root);

  return (
    <section ref={root} id="servicos" aria-labelledby="servicos-titulo" className="section-y relative bg-coffee">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <h2 id="servicos-titulo" data-reveal="lines" className="text-display">
              Serviços
            </h2>
            <p data-reveal="fade" className="mt-6 max-w-sm text-bone/75">
              Todos por ordem de chegada. Valores e dúvidas, direto no WhatsApp.
            </p>

            {/* Prévia: a foto acompanha o serviço em foco (só no desktop) */}
            <div
              data-reveal="fade"
              className="relative mt-12 hidden aspect-[4/5] max-w-[26rem] overflow-hidden bg-wood lg:block"
              aria-hidden="true"
            >
              {services.map((s) => (
                <div
                  key={s.id}
                  className="absolute inset-0 transition-[clip-path,transform] duration-[1100ms] ease-[var(--ease-in-out-quart)]"
                  style={{
                    clipPath: s.id === active ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
                    zIndex: s.id === active ? 2 : 1,
                  }}
                >
                  {s.image ? (
                    <Picture
                      image={s.image}
                      alt=""
                      sizes="26rem"
                      className="block h-full w-full"
                      imgClassName={`h-full w-full object-cover transition-transform duration-[1600ms] ease-[var(--ease-out-expo)] ${
                        s.id === active ? 'scale-100' : 'scale-110'
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-wood">
                      <Emblem className="w-1/2 text-gold/80 [--emblem-bg:#38271d]" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <WhatsAppButton source="servicos" variant="ghost" className="mt-10 hidden lg:inline-flex">
              Perguntar valores
            </WhatsAppButton>
          </div>
        </div>

        <div className="lg:col-span-7 lg:col-start-6 xl:col-span-6 xl:col-start-7">
          <ul aria-label="Lista de serviços">
            {services.map((s, i) => (
              <li
                key={s.id}
                className="group relative"
                onMouseEnter={() => setActive(s.id)}
                onFocusCapture={() => setActive(s.id)}
              >
                <div data-reveal="rule" data-delay={String(i * 0.08)} className="hairline" aria-hidden="true" />
                <div className="grid grid-cols-[1fr_auto] gap-x-6 py-9 lg:py-11">
                  <div>
                    <h3
                      className={`relative text-[clamp(1.9rem,1.4rem+1.6vw,2.9rem)] leading-none transition-transform duration-700 ease-[var(--ease-out-expo)] ${
                        s.id === active ? 'lg:translate-x-7' : ''
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute top-1/2 -left-7 hidden h-[7px] w-[7px] -translate-y-1/2 rotate-45 bg-gold transition-opacity duration-500 lg:block ${
                          s.id === active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <span data-reveal="fade" data-delay={String(i * 0.08)}>
                        {s.name}
                      </span>
                    </h3>
                    <p data-reveal="fade" data-delay={String(0.1 + i * 0.08)} className="mt-4 max-w-md text-bone/75">
                      {s.description}
                    </p>
                    <a
                      href={whatsappUrl(s.ask)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cta={`servico-${s.id}`}
                      className="link-line link-line--quiet mt-5 text-sm text-parchment hover:text-bone"
                    >
                      <WhatsAppIcon size={16} />
                      Perguntar valor
                      <span className="sr-only">de {s.name.toLowerCase()} no WhatsApp (abre em nova aba)</span>
                    </a>
                  </div>
                  {s.image && (
                    <div className="w-24 self-start overflow-hidden sm:w-32 lg:hidden" aria-hidden="true">
                      <Picture
                        image={s.image}
                        alt=""
                        sizes="8rem"
                        className="block aspect-[4/5]"
                        imgClassName="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div data-reveal="rule" className="hairline" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
