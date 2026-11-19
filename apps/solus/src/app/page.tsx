import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/modules/landing/landing-page';
import { getSessionUser } from '@/services/session';

export const metadata: Metadata = {
  title: { absolute: 'SOLUS: veja onde sua empresa ganha e perde dinheiro' },
  description:
    'O SOLUS lê as planilhas de vendas e estoque que você já tem e mostra lucro, estoque parado e oportunidades, com cada número vindo dos seus dados.',
};

/** Public home; the proxy already sends signed-in people to the app, this is the fallback. */
export default async function Home() {
  if (await getSessionUser()) redirect('/visao-geral');
  return <LandingPage />;
}
