import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { headers } from 'next/headers';
import { Providers } from '@/components/providers';
import { SIDEBAR_BOOT_SCRIPT } from '@/components/shell/sidebar-boot';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SOLUS', template: '%s | SOLUS' },
  description: 'SOLUS: inteligência de negócios com IA para varejistas. See beyond the numbers.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0c131b' },
    { media: '(prefers-color-scheme: light)', color: '#f5f7f8' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request CSP nonce from src/proxy.ts; inline scripts run only with it.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
