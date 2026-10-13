import { ArrowUpRight } from 'lucide-react';
import { links, services } from '../data/site';
import { track } from '../lib/analytics';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

export function Services() {
  return (
    <section id="servicos" aria-labelledby="servicos-title" className="relative bg-ink py-24 md:py-32 lg:py-40">
      <div className="container-x">
        <SectionHeader
          id="servicos-title"
          index="02"
          label="Serviços"
          title={
            <>
              Precisão em <span className="font-normal italic text-accent">cada detalhe.</span>
            </>
          }
          intro="Três serviços, um mesmo padrão: atenção ao seu estilo do primeiro movimento da máquina ao acabamento na lâmina."
        />

        <ul className="mt-16 grid gap-x-6 gap-y-14 md:mt-20 lg:grid-cols-3 lg:gap-x-8">
          {services.map((service, i) => (
            <Reveal as="li" key={service.id} delay={i * 0.1}>
              <article
                className="group flex h-full flex-col sm:grid sm:grid-cols-2 sm:items-center sm:gap-10 lg:flex lg:gap-0"
                aria-labelledby={`servico-${service.id}`}
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-graphite md:aspect-[4/5]">
                  <Picture
                    image={service.image}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                    className="photo-mono h-full w-full object-cover group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent"
                  />
                  <span className="absolute left-5 top-5 text-[0.6875rem] font-semibold tracking-[0.24em] text-bone/85">
                    {service.index}
                  </span>
                </div>

                <div className="flex flex-1 flex-col pt-7 sm:pt-0 lg:pt-7">
                  <div className="flex items-end justify-between gap-6 border-b border-line pb-5">
                    <h3
                      id={`servico-${service.id}`}
                      className="font-display text-[2rem] uppercase leading-none tracking-tight text-bone md:text-[2.5rem] lg:text-[1.875rem] xl:text-[2.125rem]"
                    >
                      {service.name}
                    </h3>
                    <p
                      className="shrink-0 font-display leading-none text-bone"
                      aria-label={`Preço: ${service.price} reais`}
                    >
                      <span className="mr-1 align-top text-sm font-semibold tracking-wider text-accent">R$</span>
                      <span className="text-[2.75rem] tabular-nums">{service.price}</span>
                    </p>
                  </div>
                  <p className="mt-5 flex-1 text-pretty text-[0.9375rem] leading-relaxed text-bone/65">
                    {service.description}
                  </p>
                  <a
                    href={links.booking}
                    target="_blank"
                    rel="noopener"
                    onClick={() => track('Schedule', { origem: `servico-${service.id}` })}
                    className="btn btn-ghost mt-7 w-full"
                    aria-label={`Agendar ${service.name}`}
                  >
                    Agendar
                    <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.1}>
          <div className="mt-20 grid gap-8 border border-line p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="eyebrow text-accent">
                <span aria-hidden="true" className="h-px w-8 bg-accent/60" />
                Assinatura Conexão
              </p>
              <p className="mt-4 max-w-2xl text-pretty font-display text-2xl leading-snug text-bone md:text-3xl">
                Mantenha o visual em dia com a assinatura da Conexão, disponível no AppBarber.
              </p>
              <p className="mt-3 text-sm text-bone/55">
                Atendemos com hora marcada e também por encaixe. Pagamento em dinheiro, cartões e Pix.
              </p>
            </div>
            <a
              href={links.subscription}
              target="_blank"
              rel="noopener"
              onClick={() => track('Schedule', { origem: 'assinatura' })}
              className="btn btn-ghost"
            >
              Conhecer a assinatura
              <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
