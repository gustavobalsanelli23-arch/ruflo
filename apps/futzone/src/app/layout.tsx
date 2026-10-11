import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Big_Shoulders_Stencil, Manrope } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const display = Big_Shoulders({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-fz-display', display: 'swap' });
const stencil = Big_Shoulders_Stencil({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-fz-stencil', display: 'swap' });
const body = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-fz-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FutZone · Camisas de futebol', template: '%s · FutZone' },
  description: 'Camisas de clubes, seleções, retrô, kits e femininas. Loja FutZone (ambiente de demonstração).',
};

export const viewport: Viewport = { themeColor: '#07080b' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${stencil.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Habilita as animações de entrada só quando há JavaScript */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
