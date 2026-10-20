import { useRef } from 'react';
import { business } from '../config/site';
import { latestPosts, monthYear } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { InstagramIcon, PlayIcon } from './icons';
import { Picture } from './Picture';

/**
 * Seleção dos posts mais recentes. Não é um feed automático: são fotos locais
 * com link direto para cada post (a integração automática exige login/API).
 */
export function InstagramSection() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="instagram" aria-labelledby="instagram-titulo" className="section-y relative overflow-clip">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <h2
            id="instagram-titulo"
            data-reveal="lines"
            className="font-serif text-[clamp(2.1rem,0.9rem+5vw,6rem)] leading-none font-light tracking-[-0.025em] lg:col-span-7"
          >
            <span className="sr-only">Instagram: </span>
            <span translate="no">@{business.instagram.handle}</span>
          </h2>
          <div className="lg:col-[9/span_4]">
            <p data-reveal="fade" className="max-w-[26rem] text-[var(--ink-soft)]">
              Os trabalhos mais recentes aparecem primeiro por lá: transformações, antes e depois e finalizações.
            </p>
            <a
              data-reveal="fade"
              href={business.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary mt-6"
            >
              <InstagramIcon size={19} />
              Seguir no Instagram
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
        </div>
      </div>

      <ul className="mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-10 [scrollbar-width:none] lg:container-x lg:mt-20 lg:grid lg:grid-cols-6 lg:gap-6 lg:overflow-visible lg:pb-8">
        {latestPosts.map((post, i) => (
          <li
            key={post.post}
            data-reveal="fade"
            data-delay={i * 0.07}
            className={`w-[58vw] shrink-0 snap-start sm:w-[34vw] lg:w-auto ${i % 2 ? 'lg:translate-y-10' : ''}`}
          >
            <a
              href={post.post}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
              aria-label={`${post.title}, ${monthYear(post.date)}: ver post no Instagram (abre em nova aba)`}
            >
              <span className="relative block aspect-[4/5] overflow-hidden">
                <Picture
                  image={post.image}
                  alt=""
                  sizes="(min-width: 1024px) 15vw, 58vw"
                  className="block h-full w-full"
                  imgClassName="h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                />
                <span className="absolute inset-0 bg-floresta/0 transition-colors duration-700 group-hover:bg-floresta/25" />
                <span className="absolute top-3 right-3 text-papel drop-shadow-[0_1px_4px_rgb(0_0_0/0.35)]">
                  <PlayIcon size={16} />
                </span>
              </span>
              <span className="caption mt-2.5 block">{monthYear(post.date)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
