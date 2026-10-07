import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s · Painel FutZone' },
  robots: { index: false, follow: false, nocache: true },
};

/** Área administrativa: separada da loja (sem cabeçalho, rodapé ou carrinho públicos). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
