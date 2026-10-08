import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { GuestOnly } from '@/components/auth/GuestOnly';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { safeNext } from '@/components/auth/safeNext';
import { isValidEmail } from '@/lib/validation';

export const metadata: Metadata = { title: 'Criar conta' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const email = typeof params.email === 'string' && isValidEmail(params.email) ? params.email : '';
  return (
    <GuestOnly next={next}>
      <AuthShell
        title="Criar conta"
        subtitle="Leva menos de um minuto. Seus pedidos e endereços ficam salvos."
        footer={
          <>
            Já tem conta? <Link href={`/login${next !== '/conta' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-300 hover:underline">Entrar</Link>
          </>
        }
      >
        <RegisterForm next={next} defaultEmail={email} />
      </AuthShell>
    </GuestOnly>
  );
}
