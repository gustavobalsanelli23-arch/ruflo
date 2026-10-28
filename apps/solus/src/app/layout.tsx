import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
