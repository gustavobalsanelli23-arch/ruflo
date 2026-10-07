import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { teams } from '@/data/teams';
import { LinkButton } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Logo } from '@/components/brand/Logo';

const QUICK_TEAMS = ['flamengo', 'palmeiras', 'corinthians', 'sao-paulo', 'brasil', 'real-madrid', 'barcelona', 'psg'];

/** Chamada final da Home: marca + atalhos para os times mais buscados. */
export function FinalCta() {
  const quick = QUICK_TEAMS.map((id) => teams.find((t) => t.id === id)).filter(Boolean);
  return (
    <section className="container-fz pt-20 sm:pt-28">
      <Reveal className="relative isolate overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_100%_at_50%_100%,color-mix(in_oklab,var(--color-brand-600)_35%,transparent),transparent_75%)]" aria-hidden />
        <div className="absolute inset-0 -z-10 rounded-[2rem] ring-1 ring-inset ring-white/[0.06]" aria-hidden />
        <Logo variant="full" href={null} className="justify-center" imgClassName="w-40 sm:w-52" />
        <h2 className="heading-display mx-auto mt-8 max-w-3xl text-5xl text-fg sm:text-7xl">Encontre a camisa do seu time</h2>
        <p className="mx-auto mt-4 max-w-md text-fg-2">Mais de 50 times e seleções. Escolha o seu e vista a paixão.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {quick.map((t) => (
            <Link
              key={t!.id}
              href={`/camisas/${t!.slug}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-fg-2 transition-[border-color,color,background-color] duration-200 hover:border-brand-500 hover:bg-brand-500/10 hover:text-fg"
            >
              {t!.name}
            </Link>
          ))}
        </div>
        <LinkButton href="/times" size="lg" variant="outline" className="mt-8">
          Ver todos os times <ArrowRight className="size-4" />
        </LinkButton>
      </Reveal>
    </section>
  );
}
