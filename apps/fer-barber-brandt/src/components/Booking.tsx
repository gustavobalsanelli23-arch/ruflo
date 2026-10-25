import { useRef, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { booking, business, formatPhone, fullAddress, hasWhatsapp, mapsUrl, whatsappUrl } from '../config/site';
import { copy } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { gsap, whenIdle } from '../lib/motion';
import { InstagramIcon, WhatsappIcon } from './icons';
import { BookingLink, SectionLabel } from './ui';

// A segunda frase é da própria barbearia: "só chegar e cortar!".
const NOTE = {
  whatsapp: 'A conversa abre no WhatsApp com uma mensagem pronta. Ou só chegar.',
  platform: 'Escolha o serviço, o dia e o horário na agenda online. Ou só chegar.',
  instagram: 'Mande uma mensagem pelo Direct do Instagram. Ou só chegar.',
} as const;

/** Agendamento: a seção de conversão. Só canais e dados confirmados aparecem. */
export function Booking() {
  const root = useRef<HTMLElement>(null);
  const primary = booking();
  const { bookingPlatform, hours, address } = business;
  useReveal(root);

  // O nome, em contorno e gigante, atravessa o fundo devagar com a rolagem.
  useGsap(
    (ctx) =>
      whenIdle(() =>
        ctx.add(() => {
          const mm = gsap.matchMedia();
          mm.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
              '[data-backdrop]',
              { xPercent: 4 },
              { xPercent: -18, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } },
            );
          });
          return () => mm.revert();
        }),
      ),
    root,
  );

  const channels = [
    hasWhatsapp && {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: formatPhone(business.whatsapp.number),
      href: whatsappUrl(),
      icon: <WhatsappIcon size={18} />,
    },
    bookingPlatform && {
      key: 'platform',
      label: 'Agenda online',
      value: bookingPlatform.name,
      href: bookingPlatform.url,
      icon: <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />,
    },
    {
      key: 'instagram',
      label: 'Direct do Instagram',
      value: `@${business.instagram.handle}`,
      href: business.instagram.direct,
      icon: <InstagramIcon size={18} />,
    },
  ].filter(Boolean) as { key: string; label: string; value: string; href: string; icon: ReactNode }[];

  return (
    <section
      ref={root}
      id="agendar"
      aria-labelledby="agendar-titulo"
      className="section-y relative isolate overflow-clip border-t border-[var(--line-dark)] bg-torra"
    >
      <p
        data-backdrop
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-0 -z-10 -translate-y-1/2 text-[40vw] leading-none font-extrabold whitespace-nowrap text-transparent uppercase select-none font-stretch-[62%] [-webkit-text-stroke:1px_rgb(239_227_201/0.07)] lg:text-[30vw]"
      >
        {business.tagline}
      </p>

      <div className="container-x">
        <SectionLabel n="06" className="text-tabaco">
          Agendamento
        </SectionLabel>

        <div className="mt-8 grid gap-14 lg:mt-10 lg:grid-cols-12 lg:gap-x-6">
          <div className="min-w-0 lg:col-span-7">
            <h2 id="agendar-titulo" className="text-mega text-[clamp(4.5rem,1rem+17vw,13rem)]">
              <span data-reveal="lines" className="block">
                {copy.booking.title[0]}
              </span>
              <span data-reveal="lines" data-delay="0.1" className="serif block text-[0.62em] leading-[1.05]">
                {copy.booking.title[1]}
              </span>
            </h2>
            <div data-reveal="fade" className="mt-10 flex flex-col items-start gap-5 lg:mt-14">
              <BookingLink className="btn btn-gold min-h-16 text-[0.875rem] max-sm:w-full sm:px-9" iconSize={20} />
              <p className="max-w-[28rem] text-tabaco">{NOTE[primary.channel]}</p>
            </div>
          </div>

          <div className="space-y-12 lg:col-[9/span_4] lg:self-end">
            <div>
              <h3 data-reveal="fade" className="label text-tabaco">
                Canais
              </h3>
              <ul className="mt-4 border-t border-[var(--line-dark)]">
                {channels.map((c, i) => (
                  <li key={c.key} data-reveal="fade" data-delay={i * 0.08} className="border-b border-[var(--line-dark)]">
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-booking={c.key}
                      className="group flex items-center justify-between gap-4 py-5"
                    >
                      <span>
                        <span className="label block text-tabaco">{c.label}</span>
                        <span className="mt-1 block text-[1.375rem] font-semibold transition-transform duration-700 ease-[var(--ease-out-expo)] font-stretch-[80%] group-hover:translate-x-2">
                          {c.value}
                        </span>
                      </span>
                      <span className="text-tabaco transition-colors duration-500 group-hover:text-creme">{c.icon}</span>
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {hours && (
              <div data-reveal="fade">
                <h3 className="label text-tabaco">Horários</h3>
                <dl className="mt-4 border-t border-[var(--line-dark)]">
                  {hours.map((row) => (
                    <div key={row.days} className="flex justify-between gap-6 border-b border-[var(--line-dark)] py-3">
                      <dt>{row.days}</dt>
                      <dd className="text-creme/75 tabular-nums">{row.hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {address && (
              <div data-reveal="fade">
                <h3 className="label text-tabaco">Endereço</h3>
                <p className="mt-4">{fullAddress(address)}</p>
                {address.reference && <p className="mt-1 text-tabaco">{address.reference}</p>}
                <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className="link-line label mt-3 text-[0.7rem]">
                  Como chegar
                  <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span className="sr-only">(abre o Google Maps em nova aba)</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
