import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="store-world relative flex min-h-dvh flex-col">
      {/* Marca o topo da página: o header observa este ponto (sem ouvir o scroll) */}
      <span data-header-sentinel aria-hidden className="pointer-events-none absolute left-0 top-0 h-10 w-px" />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-[var(--radius-button)] focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
