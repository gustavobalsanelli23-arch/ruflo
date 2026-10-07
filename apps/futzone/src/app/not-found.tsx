import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-20 text-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_100%,color-mix(in_oklab,var(--color-brand-600)_22%,transparent),transparent_70%)]" aria-hidden />
      <svg className="absolute left-1/2 top-1/2 -z-10 h-[120vmin] -translate-x-1/2 -translate-y-1/2 text-white/[0.035]" viewBox="0 0 600 600" fill="none" aria-hidden>
        <circle cx="300" cy="300" r="190" stroke="currentColor" strokeWidth="1.5" />
        <path d="M0 300H600" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="animate-fade-up">
        <Logo className="justify-center" imgClassName="h-8" />
        <p className="eyebrow mb-4 mt-14">Erro 404</p>
        <h1 className="heading-display text-7xl text-fg sm:text-9xl">
          Fora de <span className="text-brand-500">jogo</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-fg-2">A página que você procura não existe ou foi movida. Bora voltar para o campo?</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <LinkButton href="/" size="lg">
            Voltar ao início
          </LinkButton>
          <LinkButton href="/camisas" size="lg" variant="outline">
            Ver camisas <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
