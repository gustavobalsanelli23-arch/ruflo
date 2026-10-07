import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Manrope } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const display = Big_Shoulders({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-fz-display', display: 'swap' });
const body = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-fz-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FutZone — Vista a paixão pelo futebol', template: '%s · FutZone' },
  description: 'Camisas de clubes, seleções, retrô, kits e femininas. Loja FutZone (ambiente de demonstração).',
};

export const viewport: Viewport = { themeColor: '#050a17' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
