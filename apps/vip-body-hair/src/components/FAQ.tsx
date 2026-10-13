import { faqs } from '../data/site';
import { Plus } from './ui/Icons';
import { Reveal } from './ui/Reveal';

/** Perguntas frequentes com <details> nativo: acessível e funcional sem JavaScript. */
export function FAQ() {
  return (
    <section id="duvidas" aria-labelledby="duvidas-titulo" className="bg-paper pt-24 md:pt-36">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 md:px-10 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow flex items-center gap-4 text-stone">
            <span className="font-display text-sm normal-case italic tracking-normal text-honey-deep">07</span>
            <span className="h-px w-8 bg-current opacity-40" aria-hidden />
            Dúvidas
          </p>
          <h2 id="duvidas-titulo" className="display mt-8 text-5xl md:text-6xl">
            Antes de <em>vir.</em>
          </h2>
        </Reveal>
        <div className="lg:col-span-7 lg:col-start-6">
          {faqs.map((f, i) => (
            <Reveal key={f.question} delay={i * 0.05}>
              <details className="group border-t border-ink/12 last:border-b [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-xl md:text-2xl">
                  {f.question}
                  <Plus
                    width={20}
                    height={20}
                    className="shrink-0 text-honey-deep transition-transform duration-500 group-open:rotate-45"
                  />
                </summary>
                <p className="max-w-2xl pb-7 text-pretty text-stone">{f.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
