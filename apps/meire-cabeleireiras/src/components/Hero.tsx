import { useRef } from 'react';
import { business } from '../config/site';
import { monthYear, works } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { EASE, SplitText, gsap } from '../lib/motion';
import { Picture } from './Picture';
import { BookingLink, SectionLink } from './ui';

const cover = works.find((w) => w.image === 'escova-modelada')!;

/**
 * O "fio": uma mecha em traço champagne que se desenha na abertura, saindo do
 * texto, fazendo um cacho e passando por trás da fotografia (desktop).
 */
function Strand() {
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full text-champanhe lg:block"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          data-strand
          d="M-40 806C160 760 300 852 482 802C640 758 700 640 758 560C808 490 884 474 884 420C884 368 818 358 804 404C788 458 860 492 922 452C956 430 976 398 1010 378"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  // A abertura: um único momento orquestrado ao carregar a página.
  useGsap(() => {
    const mm = gsap.matchMedia();

    // Desktop: foto, título, textos e o fio entram em sequência.
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', () => {
      const q = gsap.utils.selector(root.current);
      const split = SplitText.create(q('h1 [data-line]'), { type: 'lines', mask: 'lines', aria: 'none' });
      gsap.set(q('[data-hero-item]'), { opacity: 1 });

      const tl = gsap.timeline({ defaults: { ease: EASE.out } });
      tl.fromTo(
        q('[data-hero-photo]'),
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: EASE.inOut },
        0,
      )
        .fromTo(q('[data-hero-photo] img'), { scale: 1.2 }, { scale: 1, duration: 2.4 }, 0)
        .from(split.lines, { yPercent: 110, duration: 1.3, stagger: 0.12 }, 0.45)
        .from(q('[data-hero-fade]'), { opacity: 0, y: 18, duration: 1.1, stagger: 0.1 }, 0.95)
        .fromTo(
          q('[data-hero-detail]'),
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: EASE.inOut },
          1.05,
        )
        .fromTo(q('[data-strand]'), { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 2.8, ease: 'power2.inOut' }, 0.9);

      // Depois da abertura, um parallax leve entre a foto principal e o detalhe.
      const scrub = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(q('[data-hero-parallax="slow"]'), { yPercent: -6, ease: 'none', scrollTrigger: scrub });
      gsap.to(q('[data-hero-parallax="fast"]'), { yPercent: -38, ease: 'none', scrollTrigger: { ...scrub } });
      return () => split.revert();
    });

    // Celular: o texto já está na tela (melhor LCP); só a foto assenta e o fio se desenha.
    mm.add('(prefers-reduced-motion: no-preference) and (max-width: 1023px)', () => {
      const q = gsap.utils.selector(root.current);
      gsap.fromTo(q('[data-hero-photo] img'), { scale: 1.12 }, { scale: 1, duration: 2.2, ease: EASE.out });
      gsap.fromTo(q('[data-strand]'), { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 2.4, delay: 0.4, ease: 'power2.inOut' });
    });
    return () => mm.revert();
  }, root);

  return (
    <section
      ref={root}
      id="topo"
      aria-labelledby="hero-titulo"
      className="relative overflow-clip pt-[var(--header-h)] lg:min-h-[100svh]"
    >
      <Strand />
      <div className="container-x relative grid grid-cols-1 lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-12 lg:gap-x-6">
        {/* Fotografia: o trabalho é o protagonista. */}
        <figure className="relative z-[1] mt-2 md:ml-auto md:w-[62%] lg:col-[9/span_4] lg:row-start-1 lg:mt-6 lg:w-auto lg:self-start" data-hero-parallax="slow">
          <div
            data-hero-item
            data-hero-photo
            className="petal relative h-[40svh] min-h-[17rem] overflow-hidden md:h-[44svh] lg:aspect-[9/16] lg:h-auto lg:max-h-[calc(100svh-var(--header-h)-4.5rem)] lg:min-h-0 lg:w-full"
          >
            <Picture
              image="escova-modelada"
              alt={cover.alt}
              sizes="(min-width: 1024px) 30vw, 100vw"
              priority
              className="block h-full w-full"
              imgClassName="h-full w-full object-cover"
              position="50% 38%"
            />
          </div>
          <figcaption data-hero-item data-hero-fade className="caption mt-2.5 flex items-baseline justify-between gap-4 lg:mt-3">
            <span>
              {cover.title}, {monthYear(cover.date)}
            </span>
            <a
              href={cover.post}
              target="_blank"
              rel="noopener noreferrer"
              className="link-line link-quiet hidden shrink-0 text-floresta sm:inline-flex"
            >
              @{business.instagram.handle}
              <span className="sr-only">: ver este post no Instagram (abre em nova aba)</span>
            </a>
          </figcaption>

          {/* Detalhe da textura, sobreposto à foto principal. */}
          <div
            data-hero-parallax="fast"
            className="absolute bottom-[14%] -left-[30%] hidden w-[46%] lg:block"
          >
            <div data-hero-item data-hero-detail className="aspect-[3/4] overflow-hidden shadow-[0_30px_60px_-30px_rgb(25_55_44/0.45)]">
              <Picture
                image="loiro-manteiga"
                alt="Detalhe de fios loiros cor de manteiga, com camadas e movimento"
                sizes="14vw"
                className="block h-full w-full"
                imgClassName="h-full w-full object-cover"
                position="50% 30%"
              />
            </div>
          </div>
        </figure>

        <div className="relative z-20 pt-6 pb-16 lg:col-[1/span_8] lg:row-start-1 lg:self-center lg:py-24">
          <MobileStrand />
          <h1 id="hero-titulo" className="text-hero text-floresta">
            <span data-line className="block">
              Seu cabelo,
            </span>
            <span data-line className="block pl-[0.6em]">
              sua essência.
            </span>
          </h1>
          <p
            data-hero-item
            data-hero-fade
            className="mt-5 max-w-[22ch] font-serif text-[clamp(1.5rem,1.1rem+1.4vw,2.375rem)] leading-[1.15] font-light italic text-verde lg:mt-7 lg:pl-[calc(var(--hero-size)*0.6)]"
          >
            Uma nova forma de revelar sua beleza.
          </p>
          <p data-hero-item data-hero-fade className="text-lead mt-5 max-w-[36ch] text-[var(--ink-soft)] lg:mt-10">
            Loiros, mechas, coloração e finalização, feitos por {business.professional} com atenção a cada fio.
          </p>
          <div data-hero-item data-hero-fade className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-5 lg:mt-10">
            <BookingLink className="btn btn-primary max-sm:w-full" />
            <SectionLink href="#trabalhos" className="link-line font-medium">
              Ver trabalhos
            </SectionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** No celular, o fio desce pela borda da tela e faz o cacho ao lado do subtítulo. */
function MobileStrand() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 140 230"
      fill="none"
      className="pointer-events-none absolute top-0 right-[calc(-1*var(--gutter))] h-[230px] w-[140px] text-champanhe lg:hidden"
    >
      <path
        data-strand
        d="M150 -14C122 30 130 84 112 114C98 138 70 142 66 168C62 194 104 198 106 172C108 148 76 148 80 178C84 208 126 222 152 232"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
