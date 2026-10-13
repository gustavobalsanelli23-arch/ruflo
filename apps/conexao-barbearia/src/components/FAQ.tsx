import { ArrowUpRight } from 'lucide-react';
import { useId, useState } from 'react';
import { faqs, whatsappLink } from '../data/site';
import { track } from '../lib/analytics';
import { WhatsAppIcon } from './ui/Icons';
import { Reveal } from './ui/Reveal';

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative bg-bone py-24 text-ink md:py-32 lg:py-40">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <p className="eyebrow text-accent-deep">
                <span className="tabular-nums">07</span>
                <span aria-hidden="true" className="h-px w-10 bg-accent-deep/60" />
                <span>FAQ</span>
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 id="faq-title" className="display text-balance mt-6 text-[2.6rem] xs:text-5xl md:text-6xl">
                Perguntas <span className="font-normal italic text-accent-deep">frequentes.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-sm text-pretty leading-relaxed text-stone-deep">
                Não encontrou o que procurava? Fale com a gente pelo WhatsApp.
              </p>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener"
                onClick={() => track('Contact', { origem: 'faq' })}
                className="btn btn-outline-dark mt-8"
              >
                <WhatsAppIcon className="size-4" />
                Falar no WhatsApp
              </a>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
          <ul className="border-t border-ink/15">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              const panelId = `${baseId}-panel-${i}`;
              const buttonId = `${baseId}-button-${i}`;
              return (
                <li key={faq.question} className="border-b border-ink/15">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-7 text-left md:py-8"
                    >
                      <span className="flex items-baseline gap-5">
                        <span className="w-6 shrink-0 text-[0.6875rem] font-semibold tabular-nums tracking-[0.2em] text-accent-deep">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-display text-[1.5rem] leading-tight text-ink transition-colors group-hover:text-accent-deep md:text-[1.875rem]">
                          {faq.question}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
                          isOpen ? 'border-ink bg-ink text-bone' : 'border-ink/25 text-ink group-hover:border-ink'
                        }`}
                      >
                        <span className="absolute h-px w-3.5 bg-current" />
                        <span
                          className={`absolute h-px w-3.5 bg-current transition-transform duration-500 ease-editorial ${
                            isOpen ? 'rotate-0' : 'rotate-90'
                          }`}
                        />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    inert={!isOpen}
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ease-editorial ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-8 pl-11 pr-4 md:pr-16">
                        <p className="text-pretty text-base leading-[1.8] text-stone-deep">{faq.answer}</p>
                        {faq.link && (
                          <a
                            href={faq.link.href}
                            target="_blank"
                            rel="noopener"
                            onClick={() => track('Schedule', { origem: 'faq' })}
                            className="link-line mt-5 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink"
                          >
                            {faq.link.label}
                            <ArrowUpRight className="size-3.5 text-accent-deep" strokeWidth={1.75} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
