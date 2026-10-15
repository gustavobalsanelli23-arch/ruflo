import { img } from '../data/site';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage, RevealLines } from './ui/Reveal';

const pillars = [
  {
    title: 'Saúde',
    text: 'O brilho verdadeiro começa em fios nutridos e fortalecidos. Por isso o tratamento é escolhido de acordo com a necessidade de cada cabelo.',
  },
  {
    title: 'Beleza',
    text: 'Alinhamento, maciez e brilho espelhado, com aquele aspecto de cabelo bem cuidado do início ao fim.',
  },
  {
    title: 'Autoestima',
    text: 'Cuidar do cabelo é um momento de autocuidado. A ideia é sair do estúdio se reconhecendo — e gostando do que vê — no espelho.',
  },
];

const portrait = img('botox-castanho-salao', 'Cliente de costas exibindo cabelo castanho, longo e brilhante no salão');
const texture = img('progressiva-crespo-depois', 'Detalhe de cabelo escuro, liso e alinhado');

export function Philosophy() {
  return (
    <section id="filosofia" aria-labelledby="filosofia-titulo" className="relative bg-cream py-24 md:py-36">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow eyebrow-rule text-bronze">01 — Filosofia</p>
        </Reveal>

        <RevealLines
          as="h2"
          id="filosofia-titulo"
          className="display mt-8 max-w-[18ch] text-[clamp(2.5rem,6.4vw,6rem)] text-espresso"
          lines={[
            'Cuidar do cabelo',
            <>
              também é <em className="italic text-bronze">cuidar</em>
            </>,
            <>
              <em className="italic text-bronze">de você.</em>
            </>,
          ]}
        />

        <div className="mt-16 grid gap-14 md:mt-24 lg:grid-cols-12 lg:gap-8">
          <div className="relative lg:col-span-5">
            <RevealImage className="aspect-[3/4] overflow-hidden">
              <Picture image={portrait} sizes="(min-width: 1024px) 38vw, 100vw" className="size-full object-cover" />
            </RevealImage>
            <RevealImage
              delay={0.25}
              className="absolute -bottom-10 -right-2 hidden aspect-[3/4] w-[38%] overflow-hidden border-[6px] border-cream sm:block lg:-right-16"
            >
              <Picture image={texture} sizes="16vw" className="size-full object-cover object-[50%_30%]" />
            </RevealImage>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
            <Reveal>
              <p className="font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.25] text-espresso text-pretty">
                No Studio Sene, cada atendimento começa pelo seu cabelo: a textura, a história dos fios e o resultado
                que você imagina.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-cafe md:text-base">
                A partir daí, indicamos o tratamento certo — botox, selagem, cauterização ou progressiva sem formol — e
                cuidamos de cada detalhe para um resultado personalizado. Sem fórmulas prontas: é o seu cabelo que
                define o caminho.
              </p>
            </Reveal>

            <ol className="mt-14 border-t border-espresso/12">
              {pillars.map((p, i) => (
                <Reveal
                  as="li"
                  key={p.title}
                  delay={0.08 * i}
                  className="grid grid-cols-[3rem_1fr] gap-4 border-b border-espresso/12 py-7 md:grid-cols-[4rem_10rem_1fr] md:gap-6"
                >
                  <span className="pt-1.5 text-[0.6875rem] font-medium tracking-[0.3em] text-bronze">0{i + 1}</span>
                  <h3 className="font-display text-[1.875rem] italic leading-none text-espresso">{p.title}</h3>
                  <p className="col-start-2 text-[0.9375rem] leading-relaxed text-cafe md:col-start-3">{p.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
