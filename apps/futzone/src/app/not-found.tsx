import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from '@/components/navigation/SearchBar';

export const metadata: Metadata = { title: 'Página não encontrada' };

/**
 * 404. Renderiza fora da loja (sem cabeçalho nem rodapé), então traz a marca e
 * os caminhos de volta. `store-world` liga os cantos retos da loja. A imagem é
 * o armário vazio: plaquinha com o número, lâmpada apagada, cabide sem camisa.
 */
export default function NotFound() {
  return (
    <main className="store-world grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="border-b border-line">
        <div className="container-fz flex h-16 items-center">
          <Logo />
        </div>
      </header>

      <div className="container-fz grid content-center gap-10 py-12 sm:py-16 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-center md:gap-14 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-20">
        <figure aria-hidden className="locker mx-auto w-full max-w-[13rem] rounded-[var(--radius-card)] md:max-w-none">
          <div className="flex h-9 items-center justify-between gap-3 border-b border-line px-3">
            <span className="plate text-[0.82rem] text-fg-2">Armário</span>
            <span className="plate text-[0.82rem] tabular-nums text-muted">404</span>
          </div>
          <div className="relative aspect-[3/4] bg-[#0a0c10]">
            <span className="absolute inset-x-[14%] top-0 h-[2px] bg-line-strong" />
            <span className="absolute inset-x-[18%] top-[14%] h-px bg-line-strong" />
            <span className="absolute left-1/2 top-[14%] h-6 w-px -translate-x-1/2 bg-line-strong" />
          </div>
          <div className="border-t border-line px-3 py-2.5">
            <span className="plate text-[0.82rem] text-muted">Vazio</span>
          </div>
        </figure>

        <div className="animate-fade-up max-w-xl">
          <h1 className="heading-stencil text-[clamp(3.25rem,12vw,6rem)] text-fg">Fora de jogo</h1>
          <p className="mt-5 max-w-[46ch] leading-relaxed text-fg-2">
            Erro 404: a página que você procura não existe ou mudou de lugar. O vestiário continua aberto.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <LinkButton href="/" size="lg">
              Voltar ao início
            </LinkButton>
            <LinkButton href="/camisas" size="lg" variant="outline">
              Ver camisas <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
            </LinkButton>
          </div>
          <SearchBar label="Buscar time ou camisa" className="mt-6 max-w-md" />
        </div>
      </div>
    </main>
  );
}
