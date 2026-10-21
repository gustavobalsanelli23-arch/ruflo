import { bookingChannel, bookingHref, servicePriceNote, services } from '../data/site';
import { ArrowUpRight, InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal, RevealLines } from './ui/Reveal';
import { SectionLabel } from './ui/SectionLabel';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

export function Services() {
  const BookIcon = bookingChannel === 'whatsapp' ? WhatsAppIcon : InstagramIcon;
  return (
    <section id="servicos" aria-labelledby="servicos-title" className="concrete relative overflow-hidden py-20 md:py-32">
      <div className="container-x">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel index="02">Serviços</SectionLabel>
            <h2 id="servicos-title" className="poster mt-6 text-[clamp(3.5rem,10vw,9rem)] text-chalk">
              <RevealLines lines={['O que', <span className="poster-outline">rola na cadeira.</span>]} />
            </h2>
          </div>
          <Reveal delay={0.1} className="max-w-sm lg:pb-3">
            <p className="text-pretty text-smoke">{servicePriceNote}</p>
          </Reveal>
        </div>

        <ul className="mt-14 border-t-2 border-chalk/20">
          {services.map((s, i) => (
            <Reveal as="li" key={s.name} delay={i * 0.06} className="border-b-2 border-chalk/20">
              <div className="group relative isolate grid grid-cols-[2rem_1fr_auto] items-start gap-x-4 gap-y-3 py-7 md:grid-cols-[4rem_minmax(0,1.1fr)_minmax(0,1fr)_10rem] md:items-center md:gap-x-8 md:py-10">
                {/* Varredura branca no hover: a linha inteira vira cartaz invertido. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 -left-5 -right-5 -z-10 origin-bottom scale-y-0 bg-chalk transition-transform duration-500 ease-[var(--ease-snap)] group-hover:scale-y-100 md:-left-6 md:-right-6"
                />
                <span className="tag pt-3 text-smoke transition-colors duration-300 group-hover:text-ash md:pt-0">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div>
                  <h3 className="poster text-[clamp(2.5rem,6vw,4.75rem)] text-chalk transition-colors duration-300 group-hover:text-ink">
                    {s.name}
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Estilos de ${s.name}`}>
                    {s.styles.map((style) => (
                      <li
                        key={style}
                        className="tag border border-chalk/30 px-2 py-1 text-paper transition-colors duration-300 group-hover:border-ink/30 group-hover:text-ink"
                      >
                        {style}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Miniatura no mobile; no desktop a foto aparece inclinada no hover. */}
                <div className="row-span-2 w-16 overflow-hidden border-2 border-chalk md:hidden">
                  <Picture image={s.image} sizes="64px" className="aspect-square h-auto w-full object-cover grayscale" />
                </div>

                <div className="col-start-2 md:col-start-3">
                  <p className="max-w-md text-pretty text-smoke transition-colors duration-300 group-hover:text-ash">{s.description}</p>
                  {(s.price != null || s.duration) && (
                    <p className="mt-3 flex items-baseline gap-4">
                      {s.price != null && (
                        <span className="poster text-3xl text-chalk transition-colors duration-300 group-hover:text-ink">{brl.format(s.price)}</span>
                      )}
                      {s.duration && <span className="tag text-smoke group-hover:text-ash">{s.duration}</span>}
                    </p>
                  )}
                </div>

                <div className="pointer-events-none relative hidden h-full md:block" aria-hidden="true">
                  <div className="absolute right-0 top-1/2 w-36 -translate-y-1/2 rotate-[4deg] scale-75 border-[5px] border-ink bg-ink opacity-0 shadow-[8px_8px_0_0_rgb(11_11_11/0.25)] transition-all duration-500 ease-[var(--ease-snap)] group-hover:rotate-[-3deg] group-hover:scale-100 group-hover:opacity-100 lg:w-44">
                    <Picture image={s.image} sizes="176px" className="aspect-[4/5] h-auto w-full object-cover grayscale" />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.1} className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href={bookingHref()} target="_blank" rel="noopener" className="btn btn-chalk">
            <BookIcon className="size-5" />
            Agendar horário
            <ArrowUpRight className="btn-arrow size-4" />
          </a>
          <a href="#cortes" className="btn btn-line">
            Ver os cortes
          </a>
        </Reveal>
      </div>
    </section>
  );
}
