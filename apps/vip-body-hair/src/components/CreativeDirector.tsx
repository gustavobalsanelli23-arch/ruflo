import { images, links } from '../data/site';
import { ArrowUpRight } from './ui/Icons';
import { Picture } from './ui/Picture';
import { MaskedLines, Reveal, RevealImage } from './ui/Reveal';

const credentials = [
  { title: 'Embaixador Wella Professionals', text: 'Embaixador oficial desde 2019 — um dos 8 no Brasil.' },
  { title: 'Especialista em coloração', text: 'Loiros modernos, balayages e cor personalizada como assinatura.' },
  { title: 'Educador', text: 'Compartilha técnica e tendências em workshops pelo Brasil.' },
];

export function CreativeDirector() {
  return (
    <section
      id="direcao-criativa"
      aria-labelledby="direcao-titulo"
      className="grain relative overflow-hidden bg-ink py-24 text-bone md:py-36"
    >
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 md:px-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <RevealImage className="relative overflow-hidden">
            <Picture
              image={images.ricky}
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="aspect-[4/5] w-full object-cover"
            />
          </RevealImage>
          <p className="eyebrow mt-4 text-[0.6rem] text-mist">Ricky Moica em evento da Wella Professionals</p>
        </div>

        <div className="flex flex-col justify-center lg:col-span-6 lg:col-start-7">
          <Reveal>
            <p className="eyebrow flex items-center gap-4 text-mist">
              <span className="font-display text-sm normal-case italic tracking-normal text-honey">03</span>
              <span className="h-px w-8 bg-current opacity-40" aria-hidden />
              Direção criativa
            </p>
          </Reveal>
          <h2 id="direcao-titulo" className="display mt-8 text-6xl md:text-8xl">
            <MaskedLines lines={['Ricky', <em key="m">Moica</em>]} />
          </h2>

          <Reveal delay={0.1}>
            <blockquote className="mt-10 border-l border-honey/60 pl-6 md:pl-8">
              <p className="display text-pretty text-2xl leading-snug text-bone/90 md:text-[2rem]">
                “Acredito que cada cabelo conta uma história única, e meu papel é usar a técnica, seja um loiro moderno
                ou uma balayage sofisticada, para iluminar não apenas os fios, mas a personalidade de quem os carrega.”
              </p>
              <footer className="eyebrow mt-6 text-[0.6rem] text-mist">Ricky Moica · Diretor criativo do VIP body &amp; hair</footer>
            </blockquote>
          </Reveal>

          <ul className="mt-14 grid gap-px bg-bone/10 sm:grid-cols-3">
            {credentials.map((c, i) => (
              <Reveal as="li" key={c.title} delay={0.1 + i * 0.08} className="bg-ink py-6 sm:px-5 sm:first:pl-0">
                <h3 className="font-display text-xl">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{c.text}</p>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.2}>
            <a
              href={links.rickyInstagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-10 inline-flex min-h-11 items-center gap-3 text-sm text-bone/85 hover:text-bone"
            >
              <span className="link-line pb-0.5">Acompanhe o trabalho em @rickymoica</span>
              <ArrowUpRight width={16} height={16} className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
