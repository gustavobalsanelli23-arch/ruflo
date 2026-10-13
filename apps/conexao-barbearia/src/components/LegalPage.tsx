import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { links } from '../data/site';
import { legalDocs, type LegalSlug } from '../data/legal';
import { Footer } from './Footer';

/** Páginas de Termos de Uso e Política de Privacidade (conteúdo original preservado). */
export function LegalPage({ slug }: { slug: LegalSlug }) {
  const doc = legalDocs[slug];
  const [title, ...blocks] = doc.blocks;

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <header className="border-b border-line bg-ink">
          <div className="container-x flex h-16 items-center justify-between lg:h-20">
            <a href="/" aria-label="Conexão Barbearia — página inicial">
              <img
                src="/images/logo-conexao.webp"
                alt="Conexão Barbearia"
                width={450}
                height={109}
                className="h-auto w-[140px] lg:w-[160px]"
              />
            </a>
            <div className="flex items-center gap-2">
              <a href="/" className="btn btn-ghost hidden min-h-11 px-5 text-[0.6875rem] sm:inline-flex">
                <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
                Voltar ao site
              </a>
              <a
                href={links.booking}
                target="_blank"
                rel="noopener"
                className="btn btn-accent min-h-11 px-5 text-[0.6875rem]"
              >
                Agendar
                <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
          </div>
        </header>

        <main className="bg-bone text-ink">
          <article className="container-x py-20 md:py-28">
            <div className="mx-auto max-w-3xl">
              <a
                href="/"
                className="link-line text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent-deep sm:hidden"
              >
                <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                Voltar ao site
              </a>
              <p className="eyebrow mt-8 text-accent-deep sm:mt-0">
                <span aria-hidden="true" className="h-px w-10 bg-accent-deep/60" />
                {doc.title}
              </p>
              <h1 className="display text-balance mt-6 text-4xl md:text-6xl">{title.text}</h1>
              <div className="mt-12 text-pretty text-base leading-[1.8] text-stone-deep">{renderBlocks(blocks)}</div>
            </div>
          </article>
        </main>

        <Footer basePath="/" />
      </MotionConfig>
    </LazyMotion>
  );
}

function renderBlocks(blocks: (typeof legalDocs)[LegalSlug]['blocks']) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(
      <ul key={`ul-${out.length}`} className="my-5 grid list-disc gap-2 pl-5 marker:text-accent-deep">
        {list.map((li) => (
          <li key={li}>{li}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  blocks.forEach((b, i) => {
    if (b.type === 'li') return void list.push(b.text);
    flush();
    if (b.type === 'h2')
      out.push(
        <h2 key={i} className="mt-12 font-display text-3xl leading-tight text-ink">
          {b.text}
        </h2>,
      );
    else if (b.type === 'h3')
      out.push(
        <h3 key={i} className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-ink">
          {b.text}
        </h3>,
      );
    else
      out.push(
        <p key={i} className="mt-5">
          {b.text}
        </p>,
      );
  });
  flush();
  return out;
}
