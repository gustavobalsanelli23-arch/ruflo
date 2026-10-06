import { ArrowRight } from 'lucide-react';
import { site } from '@/data/site';
import { LinkButton } from '@/components/ui/Button';
import { JerseyArt } from '@/components/brand/JerseyArt';

/** Hero da Home: composição própria da marca (ou foto, se `site.heroImage` existir). */
export function Hero({ stats }: { stats: Array<{ value: string; label: string }> }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {/* Fundo: refletores + linhas do campo */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_10%,color-mix(in_oklab,var(--color-brand-500)_28%,transparent)_0%,transparent_60%),radial-gradient(50%_60%_at_0%_100%,color-mix(in_oklab,var(--color-brand-700)_30%,transparent)_0%,transparent_70%)]" />
      <div className="pitch-lines absolute inset-0 -z-10 opacity-70" />
      <svg className="absolute -right-40 top-1/2 -z-10 hidden h-[140%] -translate-y-1/2 text-white/[0.05] lg:block" viewBox="0 0 600 600" fill="none" aria-hidden>
        <circle cx="300" cy="300" r="180" stroke="currentColor" strokeWidth="2" />
        <circle cx="300" cy="300" r="6" fill="currentColor" />
        <path d="M0 300 H600 M300 0 V600" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="container-fz grid min-h-[min(82dvh,760px)] items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="animate-fade-up relative z-10">
          <p className="eyebrow mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-brand-500" /> Temporada 26/27 disponível
          </p>
          <h1 className="heading-display text-[clamp(4.5rem,15vw,10.5rem)] leading-[0.82]">
            FUT<span className="bg-gradient-to-b from-brand-300 to-brand-600 bg-clip-text text-transparent">ZONE</span>
          </h1>
          <p className="mt-6 max-w-md text-xl font-medium text-fg-2 sm:text-2xl">{site.tagline}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton href="/camisas" size="lg">
              Ver camisas <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/retro" size="lg" variant="outline">
              Coleção retrô
            </LinkButton>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[0.68rem] uppercase tracking-wider text-muted">{s.label}</dt>
                <dd className="heading-display mt-1 text-3xl text-fg">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[560px]" aria-hidden={!site.heroImage}>
          {site.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.heroImage} alt="Camisas FutZone" className="h-full w-full rounded-[2rem] object-cover" />
          ) : (
            <>
              <div className="absolute inset-[12%] rounded-full bg-brand-500/25 blur-3xl" />
              <div className="absolute inset-[6%] rounded-full border border-brand-500/20" />
              <div className="absolute inset-[18%] rounded-full border border-dashed border-white/10" />
              <JerseyArt primary="#1a1e25" secondary="var(--color-brand-400)" view="back" number="7" className="animate-fade-up absolute left-[2%] top-[20%] h-[58%] -rotate-[14deg] opacity-80 [animation-delay:200ms]" />
              <JerseyArt primary="#eef2f8" secondary="var(--color-brand-600)" view="back" number="9" className="animate-fade-up absolute right-[2%] top-[20%] h-[58%] rotate-[14deg] opacity-80 [animation-delay:300ms]" />
              <JerseyArt primary="var(--color-brand-500)" secondary="#ffffff" view="back" number="10" className="animate-fade-up absolute left-1/2 top-[8%] h-[80%] -translate-x-1/2 drop-shadow-[0_40px_50px_rgba(0,0,0,0.6)] [animation-delay:100ms]" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
