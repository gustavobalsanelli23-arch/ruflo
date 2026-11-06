import { LinkButton } from '@/components/ui/Button';

/**
 * Arte de campanha na entrada da Home: 11.11 e Black Friday. Mesmo mundo do
 * vestiário — aço grafite, estêncil, luz fria — com o azul da marca como única
 * cor de destaque. Puro CSS (sem imagem), não pesa no carregamento.
 */
export function PromoBanner() {
  return (
    <section aria-labelledby="promo-title" className="relative">
      <div className="container-fz pt-4 sm:pt-6">
        <div className="relative isolate overflow-hidden border border-line-strong bg-[#030409]">
          {/* Faixas diagonais de estêncil (fita de vestiário) */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.07]"
            style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #dbe6ff 0 2px, transparent 2px 22px)' }}
          />
          {/* Luz azul vindo de cima, como a lâmpada do armário aceso */}
          <div
            aria-hidden
            className="absolute -top-1/2 right-[8%] -z-10 h-[160%] w-[70%] opacity-0 animate-cone-on [animation-delay:150ms] sm:w-[48%]"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgb(5 78 204 / 0.55) 0%, rgb(5 78 204 / 0.12) 45%, transparent 70%)' }}
          />
          {/* Barra de luz no topo */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-brand-600 shadow-[0_0_24px_4px_rgb(5_78_204/0.7)] opacity-0 animate-light-on" />

          <div className="grid items-center gap-6 px-5 py-7 sm:px-8 sm:py-9 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 lg:px-12 lg:py-11">
            <div>
              <p className="plate flex flex-wrap items-center gap-2 text-[0.72rem] text-brand-300 sm:text-xs">
                <span className="inline-block size-2 bg-brand-500 shadow-[0_0_10px_2px_rgb(10_82_214/0.8)]" aria-hidden />
                Temporada de ofertas
              </p>
              <h2 id="promo-title" className="heading-stencil mt-3 text-fg">
                <span className="block text-[min(15vw,5.5rem)] leading-[0.85]">Black Friday</span>
                <span className="mt-2 flex items-baseline gap-3 text-[min(7vw,2.5rem)] text-fg-2">
                  <span className="text-brand-400">+</span>
                  <span>Esquenta 11.11</span>
                </span>
              </h2>
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-fg-2 sm:text-base">
                Os armários abriram com preço de outra divisão. Camisas de clubes, seleções e retrô em oferta por tempo limitado.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <LinkButton href="/promocoes" size="lg" className="shrink-0">
                  Ver ofertas
                </LinkButton>
                <LinkButton href="/camisas" size="lg" variant="secondary" className="shrink-0">
                  Todas as camisas
                </LinkButton>
              </div>
            </div>

            {/* Plaquinha 11.11 em estêncil, contorno de aço e preenchimento azul */}
            <div aria-hidden className="relative hidden select-none md:block">
              <div className="relative border border-line-strong bg-gradient-to-b from-steel-3 to-steel px-8 py-6 lg:px-10 lg:py-8">
                <span className="absolute left-2 top-2 size-1.5 rounded-full bg-line-strong" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-line-strong" />
                <span className="absolute bottom-2 left-2 size-1.5 rounded-full bg-line-strong" />
                <span className="absolute bottom-2 right-2 size-1.5 rounded-full bg-line-strong" />
                <span
                  className="heading-stencil block text-[min(11vw,9rem)] leading-[0.8] text-transparent"
                  style={{ WebkitTextStroke: '2px #4682ea', textShadow: '0 0 40px rgb(5 78 204 / 0.45)' }}
                >
                  11.11
                </span>
                <span className="plate mt-4 flex items-center justify-between gap-6 border-t border-line-strong pt-3 text-xs text-muted">
                  <span>FutZone</span>
                  <span className="text-brand-300">Nov · 2026</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
