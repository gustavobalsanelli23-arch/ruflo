import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { CartDrawer } from '@/components/store/CartDrawer';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
