import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { GuestOnly } from '@/components/auth/GuestOnly';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeNext } from '@/components/auth/safeNext';
import { TEXT_LINK } from '@/components/account/AccountUI';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next);
  return (
    <GuestOnly next={next}>
      <AuthShell
        title="Entrar"
        subtitle="Acesse sua conta para acompanhar pedidos e comprar mais rápido."
        locker="entrar"
        footer={
          <>
            Primeira vez na FutZone?{' '}
            <Link href={`/cadastro${next !== '/conta' ? `?next=${encodeURIComponent(next)}` : ''}`} className={TEXT_LINK}>
              Criar conta
            </Link>
          </>
        }
      >
        <LoginForm next={next} />
      </AuthShell>
    </GuestOnly>
  );
}
