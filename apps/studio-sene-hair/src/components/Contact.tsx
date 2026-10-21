import { useEffect, useRef, useState } from 'react';
import {
  address,
  business,
  fullAddress,
  hasAddress,
  hours,
  links,
  mapsEmbedUrl,
  mapsRouteUrl,
  messages,
  whatsapp,
  whatsappLink,
} from '../data/site';
import { ArrowIcon, ArrowUpRightIcon, InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Reveal } from './ui/Reveal';
import { SectionHeading } from './ui/SectionHeading';

/** Mapa do Google carregado só quando a seção se aproxima da tela (sem custo na primeira carga). */
function MapFrame() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Sem endereço confirmado, o mapa mostra a cidade (informação verificada) em vez de um ponto inventado.
  const src = hasAddress
    ? mapsEmbedUrl()
    : `https://www.google.com/maps?q=${encodeURIComponent(`${address.city}, ${address.state}`)}&z=13&output=embed`;

  return (
    <div
      ref={ref}
      className="relative aspect-[4/5] overflow-hidden bg-linen sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[34rem]"
    >
      {visible && (
        <iframe
          title={hasAddress ? `Mapa: ${business.name}` : `Mapa de ${address.city} – ${address.state}`}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0 [filter:grayscale(0.85)_sepia(0.22)_contrast(1.02)]"
        />
      )}
      {!hasAddress && (
        <div className="absolute inset-x-4 bottom-4 bg-cream/95 p-5 backdrop-blur-sm md:inset-x-6 md:bottom-6 md:p-6">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-bronze">
            {address.city} – {address.state}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cafe">Peça a localização exata do estúdio pelo WhatsApp.</p>
        </div>
      )}
    </div>
  );
}

export function Contact() {
  const rows = [
    {
      label: 'Endereço',
      content: hasAddress ? (
        <span>{fullAddress()}</span>
      ) : (
        <span>
          {address.city} – {address.state}
          <a
            href={whatsappLink(messages.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="link-line mt-2 block w-fit text-[0.8125rem] text-bronze"
          >
            Solicitar localização
          </a>
        </span>
      ),
    },
    {
      label: 'Horários',
      content: hours ? (
        <ul className="space-y-1">
          {hours.map((h) => (
            <li key={h.days} className="flex justify-between gap-6">
              <span>{h.days}</span>
              <span className="tabular-nums">{h.time}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span>Atendimento com horário agendado — consulte a disponibilidade pelo WhatsApp.</span>
      ),
    },
    {
      label: 'WhatsApp',
      content: (
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="link-line">
          <WhatsAppIcon className="size-4 text-bronze" />
          {whatsapp.display}
        </a>
      ),
    },
    {
      label: 'Instagram',
      content: (
        <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="link-line">
          <InstagramIcon className="size-4 text-bronze" />
          {links.instagramHandle}
        </a>
      ),
    },
  ];

  return (
    <section id="contato" aria-labelledby="contato-titulo" className="grain relative bg-sand py-24 md:py-36">
      <div className="container-x">
        <SectionHeading
          id="contato-titulo"
          index="05"
          label="Localização e contato"
          lines={[
            <>
              Venha nos <em className="italic text-bronze">visitar.</em>
            </>,
          ]}
          intro={`Estamos em ${business.city}, ${business.state}. Fale com a gente pelo WhatsApp para agendar e receber todas as informações do seu atendimento.`}
        />

        <div className="mt-16 grid gap-12 md:mt-20 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-5">
            <dl className="border-t border-espresso/15">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-2 border-b border-espresso/15 py-6 sm:grid-cols-[8rem_1fr] sm:gap-6"
                >
                  <dt className="pt-0.5 text-[0.625rem] font-medium uppercase tracking-[0.3em] text-bronze">
                    {row.label}
                  </dt>
                  <dd className="text-[0.9375rem] leading-relaxed text-espresso">{row.content}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                Agendar pelo WhatsApp
                <ArrowIcon className="btn-arrow h-3 w-7" />
              </a>
              {hasAddress ? (
                <a href={mapsRouteUrl()} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  Abrir rota no Google Maps
                  <ArrowUpRightIcon className="size-2.5" />
                </a>
              ) : (
                <a
                  href={whatsappLink(messages.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  Pedir a localização
                  <ArrowUpRightIcon className="size-2.5" />
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-6 lg:col-start-7">
            <MapFrame />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
