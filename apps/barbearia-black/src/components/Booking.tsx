import { useState } from 'react';
import { address, bookingChannel, bookingHref, bookingMessage, business, formatPhone, hours, links, location, whatsappNumber } from '../data/site';
import { ArrowUpRight, InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Reveal, RevealLines } from './ui/Reveal';
import { SectionLabel } from './ui/SectionLabel';
import { Spray } from './ui/Spray';

export function Booking() {
  const [copied, setCopied] = useState(false);
  const viaWhatsapp = bookingChannel === 'whatsapp';

  /** Sem WhatsApp configurado: copia a mensagem pronta e abre o Direct (o Instagram não aceita texto pré-preenchido). */
  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(bookingMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      // Sem permissão de área de transferência: o link abre do mesmo jeito.
    }
  };

  return (
    <section id="agendar" aria-labelledby="agendar-title" className="paper torn-top relative overflow-hidden py-20 md:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-6">
          <SectionLabel index="04" tone="dark">
            Agendamento
          </SectionLabel>
          <h2 id="agendar-title" className="poster relative mt-6 text-[clamp(3rem,13vw,7.75rem)] text-ink">
            <RevealLines lines={['Agende', 'seu horário.']} />
            <Spray variant="underline" className="absolute -bottom-3 left-0 h-6 w-[78%] text-ink md:-bottom-5 md:h-9" seed={4} />
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-10 max-w-md text-pretty text-lg text-ash">
              Fale direto com o {business.barber}, escolha o melhor horário e garanta o seu corte na {business.name}.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <dl className="mt-10 grid max-w-lg gap-px border-2 border-ink bg-ink sm:grid-cols-2">
              <div className="bg-paper p-5">
                <dt className="tag text-ash">Instagram</dt>
                <dd className="mt-2">
                  <a href={links.instagram} target="_blank" rel="noopener" className="link-line text-lg font-bold text-ink">
                    @{business.instagramHandle}
                  </a>
                </dd>
              </div>
              <div className="bg-paper p-5">
                <dt className="tag text-ash">{whatsappNumber ? 'WhatsApp' : 'Mensagem direta'}</dt>
                <dd className="mt-2">
                  <a href={bookingHref()} target="_blank" rel="noopener" className="link-line text-lg font-bold text-ink">
                    {whatsappNumber ? formatPhone(whatsappNumber) : 'Direct do Instagram'}
                  </a>
                </dd>
              </div>
              <div className="bg-paper p-5 sm:col-span-2">
                <dt className="tag text-ash">Onde</dt>
                <dd className="mt-2 text-lg font-bold text-ink">
                  {address ? (
                    <>
                      {address.street}
                      {address.district ? `, ${address.district}` : ''} · {address.city}/{address.state}
                      {address.mapsUrl && (
                        <a href={address.mapsUrl} target="_blank" rel="noopener" className="link-line ml-3 text-sm font-semibold">
                          Ver no mapa <ArrowUpRight className="size-3.5" />
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      {location.locality}
                      <span className="font-medium text-ash"> · {location.city}/{location.region}</span>
                      <span className="mt-1 block text-sm font-medium text-ash">Endereço completo no agendamento.</span>
                    </>
                  )}
                </dd>
              </div>
              {hours && (
                <div className="bg-paper p-5 sm:col-span-2">
                  <dt className="tag text-ash">Horários</dt>
                  <dd className="mt-3 divide-y divide-ink/15 text-ink">
                    {hours.map((h) => (
                      <p key={h.days} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2 first:pt-0 last:pb-0">
                        <span className="poster text-2xl">{h.days}</span>
                        <span className="font-semibold tabular-nums">{h.time.join('  ·  ')}</span>
                      </p>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Reveal>
        </div>

        {/* Bilhete com a mensagem pronta */}
        <Reveal delay={0.1} className="min-w-0 lg:col-span-5 lg:col-start-8 lg:self-center">
          <div className="relative rotate-[1.2deg] bg-ink p-6 text-paper shadow-[10px_10px_0_0_rgb(11_11_11/0.18)] md:p-9">
            <span className="tape -top-3 left-8 -rotate-6" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <p className="tag text-smoke">Mensagem pronta</p>
              {viaWhatsapp ? <WhatsAppIcon className="size-6 text-chalk" /> : <InstagramIcon className="size-6 text-chalk" />}
            </div>
            <blockquote className="mt-6 border-l-[3px] border-chalk pl-5 text-xl font-semibold leading-snug text-chalk md:text-2xl">
              “{bookingMessage}”
            </blockquote>

            <div className="mt-9">
              {viaWhatsapp ? (
                <a href={bookingHref()} target="_blank" rel="noopener" className="btn btn-chalk w-full whitespace-normal px-4 text-center">
                  <WhatsAppIcon className="size-5" />
                  Agendar pelo WhatsApp
                  <ArrowUpRight className="btn-arrow size-4" />
                </a>
              ) : (
                <>
                  <a href={bookingHref()} target="_blank" rel="noopener" onClick={copyAndOpen} className="btn btn-chalk w-full whitespace-normal px-4 text-center">
                    <InstagramIcon className="size-5" />
                    Copiar e abrir o Direct
                    <ArrowUpRight className="btn-arrow size-4" />
                  </a>
                  <p className="mt-4 min-h-5 text-sm text-smoke" role="status" aria-live="polite">
                    {copied ? 'Mensagem copiada. É só colar no Direct e enviar.' : 'A mensagem é copiada para você colar no Direct.'}
                  </p>
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
