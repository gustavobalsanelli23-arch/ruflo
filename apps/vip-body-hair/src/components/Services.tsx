import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import { featuredServices, moreServices } from '../data/site';
import { waLink, waService } from '../lib/whatsapp';
import { ArrowRight } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal, ease } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';
import { WhatsAppLink } from './ui/WhatsAppLink';

export function Services() {
  const [active, setActive] = useState(0);
  const current = featuredServices[active];

  return (
    <section id="servicos" aria-labelledby="servicos-titulo" className="bg-bone py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeader
          id="servicos-titulo"
          index="02"
          eyebrow="Serviços"
          title={[
            'Cada detalhe,',
            <>
              uma <em>assinatura.</em>
            </>,
          ]}
          intro={
            <p>
              Da cor ao acabamento, cada serviço começa por ouvir você. Valores sob consulta — fale com a equipe pelo
              WhatsApp para orçamento e horários.
            </p>
          }
        />

        <div className="mt-16 grid gap-10 md:mt-24 lg:grid-cols-12 lg:gap-10">
          {/* Painel de imagem (desktop) que acompanha o serviço em foco. */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28">
              <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                <AnimatePresence initial={false} mode="popLayout">
                  <m.div
                    key={current.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease }}
                  >
                    <Picture image={current.image} sizes="38vw" className="h-full w-full object-cover" />
                  </m.div>
                </AnimatePresence>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/60 to-transparent p-6 text-bone">
                  <span className="display text-5xl italic">{current.index}</span>
                  <span className="eyebrow text-[0.6rem]">{current.kicker}</span>
                </div>
              </div>
            </div>
          </div>

          <ol className="lg:col-span-7 lg:col-start-6">
            {featuredServices.map((s, i) => (
              <Reveal as="li" key={s.id} delay={i * 0.05} className="border-t border-ink/15 last:border-b">
                <article
                  onMouseEnter={() => setActive(i)}
                  onFocusCapture={() => setActive(i)}
                  className={`group grid gap-6 py-8 transition-opacity duration-500 md:py-10 lg:grid-cols-[4rem_1fr] lg:gap-8 ${
                    active === i ? 'lg:opacity-100' : 'lg:opacity-55 lg:hover:opacity-100'
                  }`}
                >
                  <div className="overflow-hidden lg:hidden">
                    <Picture image={s.image} sizes="(min-width: 768px) 80vw, 100vw" className="aspect-[4/5] w-full object-cover sm:aspect-[16/11]" />
                  </div>
                  <span className="display hidden pt-2 text-2xl italic text-honey-deep lg:block">{s.index}</span>
                  <div>
                    <p className="eyebrow text-[0.6rem] text-stone">
                      <span className="lg:hidden">{s.index} · </span>
                      {s.kicker}
                    </p>
                    <h3 className="display mt-3 text-[2.1rem] md:text-5xl">{s.name}</h3>
                    <p className="mt-4 max-w-xl text-pretty text-stone">{s.description}</p>
                    <ul className="mt-5 flex flex-wrap gap-2" aria-label={`Inclui em ${s.name}`}>
                      {s.items.map((item) => (
                        <li key={item} className="border border-ink/15 px-3 py-1 text-xs tracking-wide text-ink/80">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <WhatsAppLink
                      source={`servico:${s.name}`}
                      href={waService(s.name)}
                      className="mt-7 inline-flex min-h-11 items-center gap-3 text-sm font-medium"
                    >
                      <span className="link-line pb-0.5">Consultar e agendar</span>
                      <ArrowRight width={16} height={16} className="transition-transform duration-500 group-hover:translate-x-1" />
                    </WhatsAppLink>
                  </div>
                </article>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* Demais serviços */}
        <div className="mt-24 grid gap-12 border-t border-ink/15 pt-12 md:mt-32 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-4">
            <h3 className="display text-4xl md:text-5xl">
              Também <em>no VIP</em>
            </h3>
            <p className="mt-4 max-w-sm text-stone">
              Cuidados completos para mãos, olhar e pele, no mesmo endereço e com o mesmo padrão.
            </p>
          </Reveal>
          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
            {moreServices.map((g, i) => (
              <Reveal key={g.group} delay={0.06 * i}>
                <h4 className="eyebrow text-[0.6rem] text-stone">{g.group}</h4>
                <ul className="mt-5 space-y-3">
                  {g.items.map((item) => (
                    <li key={item}>
                      <WhatsAppLink
                        source={`servico:${item}`}
                        href={waService(item)}
                        className="group/item flex items-center justify-between gap-4 border-b border-ink/10 pb-3 font-display text-2xl"
                        aria-label={`${item} — consultar pelo WhatsApp`}
                      >
                        {item}
                        <ArrowRight
                          width={16}
                          height={16}
                          className="shrink-0 -translate-x-2 text-honey-deep opacity-0 transition-all duration-500 group-hover/item:translate-x-0 group-hover/item:opacity-100 group-focus-visible/item:opacity-100"
                        />
                      </WhatsAppLink>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-16 flex flex-col items-start justify-between gap-6 bg-ink p-8 text-bone sm:flex-row sm:items-center md:p-10">
          <p className="display text-2xl md:text-3xl">
            Não sabe por onde começar? <em className="text-honey">A consultoria é gratuita.</em>
          </p>
          <WhatsAppLink
            source="servicos-consultoria"
            href={waLink('Olá, VIP body & hair! Gostaria de agendar uma consultoria gratuita.')}
            className="btn btn-light shrink-0"
          >
            Agendar consultoria
            <ArrowRight width={16} height={16} className="btn-arrow" />
          </WhatsAppLink>
        </Reveal>
      </div>
    </section>
  );
}
