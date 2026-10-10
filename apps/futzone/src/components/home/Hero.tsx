import type { Product } from '@/types/catalog';
import { heroShowcase } from '@/data/site';
import { seedProducts } from '@/data/products';
import { sortProducts } from '@/lib/catalog';
import { availableSizes, findByRef, isPublic } from '@/lib/product';
import { LinkButton } from '@/components/ui/Button';
import { ProductCard } from '@/components/products/ProductCard';
import { SearchBar } from '@/components/navigation/SearchBar';

const LOCKERS = 4;
/** Primeira lâmpada acende logo depois da pintura; as outras seguem em fila. */
const FIRST_LIGHT_MS = 200;
const LIGHT_STEP_MS = 140;
/** O vestiário clareia quando o cone de luz cai sobre a camisa (ProductCard: faixa + 220ms). */
const ROOM_DELAY_MS = 220;

/**
 * Camisas da fileira: a vitrine definida em data/site.ts, completada pelas mais
 * procuradas se alguma tiver saído do catálogo ou esgotado.
 */
export function heroLockers(products: Product[] = seedProducts): Product[] {
  const ready = (p: Product | undefined): p is Product => !!p && isPublic(p) && availableSizes(p).length > 0 && p.images.length > 0;
  const picked = heroShowcase.map((ref) => findByRef(products, ref)).filter(ready);
  const fill = sortProducts(products.filter(ready), 'relevancia').filter((p) => !picked.includes(p));
  return [...picked, ...fill].slice(0, LOCKERS);
}

/**
 * Hero da Home: o vestiário antes do jogo. À esquerda, a manchete em estêncil
 * e as duas formas de achar a camisa (catálogo e busca por time). À direita,
 * quatro armários com camisas reais, apoiados na linha da prateleira, cujas
 * luzes acendem uma a uma. Componente de servidor: a foto do primeiro armário
 * (LCP) já vem no HTML.
 */
export function Hero({ lockers }: { lockers: Product[] }) {
  return (
    // Movimento reduzido: as luzes já aparecem acesas (sem esperar a fila).
    <section aria-labelledby="hero-title" className="relative motion-reduce:**:[animation-delay:0ms]!">
      <div className="container-fz">
        <div className="grid gap-10 border-b border-line-strong pt-8 sm:pt-12 xl:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] xl:items-end xl:gap-12 xl:pt-16">
          <div className="relative z-20 xl:pb-14">
            <h1 id="hero-title" className="heading-stencil text-[min(12.4vw,6rem)] text-fg xl:text-[min(5.4vw,4.6rem)]">
              <span className="block">Vista o manto.</span>
              <span className="block">Entre em campo.</span>
            </h1>
            <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-fg-2 sm:mt-6 sm:text-lg">
              Camisas de clubes, seleções e clássicos retrô, com fotos reais, preço e tamanhos à vista.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center xl:mt-10">
              <LinkButton href="/camisas" size="lg" className="shrink-0">
                Ver camisas
              </LinkButton>
              <SearchBar size="lg" label="Buscar time ou camisa" className="w-full sm:max-w-sm xl:max-w-none xl:flex-1" />
            </div>
          </div>

          {/* Fileira de armários: rolagem com encaixe no celular, quatro lado a lado a partir do tablet; ao lado da manchete só no desktop largo */}
          <h2 id="hero-lockers" className="sr-only">
            Camisas em destaque
          </h2>
          <ul
            aria-labelledby="hero-lockers"
            className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:gap-2.5 md:overflow-visible md:px-0 xl:gap-3"
          >
            {lockers.map((product, i) => {
              const litDelay = FIRST_LIGHT_MS + i * LIGHT_STEP_MS;
              return (
                <li key={product.id} className="relative w-[70%] shrink-0 snap-start sm:w-[42%] md:w-auto">
                  <ProductCard product={product} priority lit litDelay={litDelay} />
                  {/*
                    Vestiário no escuro até a lâmpada deste armário firmar. Sem a
                    animação (ou sem suporte), a camada fica invisível: nunca prende
                    a camisa no escuro.
                  */}
                  <span
                    aria-hidden
                    style={{ animationDelay: `${litDelay + ROOM_DELAY_MS}ms` }}
                    className="pointer-events-none absolute inset-0 z-40 bg-bg/70 opacity-0 animate-[fade-in_0.6s_var(--ease-in-out-fz)_reverse_both]"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
