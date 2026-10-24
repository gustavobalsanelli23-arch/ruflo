import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { business, formatPhone, fullAddress, hasWhatsapp, mapsEmbedUrl, mapsUrl, whatsappUrl } from '../config/site';
import { useReveal } from '../hooks/useReveal';
import { InstagramIcon, WhatsappIcon } from './icons';
import { SectionLabel } from './ui';

/**
 * Localização e contato. Sem endereço confirmado, o mapa não existe e o
 * Instagram (o canal verificado) assume o centro da composição.
 */
export function Contact() {
  const root = useRef<HTMLElement>(null);
  const { address, hours } = business;
  useReveal(root);

  return (
    <section ref={root} id="contato" aria-labelledby="contato-titulo" className="section-y relative">
      <div className="container-x">
        <SectionLabel n="06" className="text-fumo">
          Localização e contato
        </SectionLabel>

        <div className="mt-8 grid gap-14 lg:mt-10 lg:grid-cols-12 lg:gap-x-6">
          <div className={address ? 'lg:col-span-5' : 'lg:col-span-7'}>
            <h2 id="contato-titulo" data-reveal="lines" className="text-display">
              Contato
            </h2>

            <a
              data-reveal="fade"
              href={business.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-10 inline-flex max-w-full items-center gap-4 lg:mt-14"
            >
              <InstagramIcon size={28} className="shrink-0 text-fumo transition-colors duration-500 group-hover:text-osso" />
              <span className="link-line link-quiet min-w-0 truncate text-[clamp(1.6rem,0.9rem+3.2vw,3.75rem)] leading-none font-bold font-stretch-[72%]">
                @{business.instagram.handle}
              </span>
              <span className="sr-only">(perfil no Instagram, abre em nova aba)</span>
            </a>

          </div>

          <div className={address ? 'lg:col-span-5 lg:row-start-2' : 'lg:col-[9/span_4] lg:self-end'}>
            <dl className={`grid gap-x-10 gap-y-8 border-t border-[var(--line-dark)] pt-8 sm:grid-cols-2 ${address ? '' : 'lg:grid-cols-1'}`}>
              <div data-reveal="fade">
                <dt className="label text-fumo">Mensagens</dt>
                <dd className="mt-3 space-y-2">
                  <a href={business.instagram.direct} target="_blank" rel="noopener noreferrer" className="link-line flex w-fit">
                    Direct do Instagram
                    <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                  {hasWhatsapp && (
                    <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="link-line flex w-fit">
                      <WhatsappIcon size={16} />
                      {formatPhone(business.whatsapp.number)}
                      <span className="sr-only">(WhatsApp, abre em nova aba)</span>
                    </a>
                  )}
                </dd>
              </div>

              {hours && (
                <div data-reveal="fade" data-delay="0.08">
                  <dt className="label text-fumo">Horários</dt>
                  <dd className="mt-3 space-y-1">
                    {hours.map((row) => (
                      <p key={row.days} className="flex justify-between gap-6">
                        <span>{row.days}</span>
                        <span className="text-osso/75 tabular-nums">{row.hours}</span>
                      </p>
                    ))}
                  </dd>
                </div>
              )}

              {address && (
                <div data-reveal="fade" data-delay="0.16" className="sm:col-span-2">
                  <dt className="label text-fumo">Endereço</dt>
                  <dd className="mt-3">
                    <address className="not-italic">{fullAddress(address)}</address>
                    {address.reference && <p className="mt-1 text-fumo">{address.reference}</p>}
                    <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className="link-line label mt-3 text-[0.7rem]">
                      Abrir no Google Maps
                      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {address && (
            <div className="lg:col-[7/span_6] lg:row-span-2 lg:row-start-1">
              <MapEmbed src={mapsEmbedUrl(address)} title={`Mapa: ${fullAddress(address)}`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Mapa do Google carregado só quando a seção se aproxima da tela (não pesa
 * no carregamento inicial), em tons de cinza para conversar com a paleta.
 */
function MapEmbed({ src, title }: { src: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} data-reveal="fade" className="relative aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:min-h-[28rem]">
      <div className="absolute inset-0 overflow-hidden bg-chumbo">
        {load && (
          <iframe
            src={src}
            title={title}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 [filter:grayscale(1)_contrast(1.08)_brightness(0.9)]"
          />
        )}
      </div>
      <span aria-hidden="true" className="crop-marks [--mark-color:rgb(235_230_221/0.35)]" />
    </div>
  );
}
