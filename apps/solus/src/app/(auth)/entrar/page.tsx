import type { Metadata } from 'next';
import { safeNextPath } from '@/lib/auth/redirect';
import { isSupabaseConfigured } from '@/lib/env';
import { DemoLink, NotConfiguredNotice, ReasonNotice } from '@/modules/auth/auth-notices';
import { SignInForm } from '@/modules/auth/sign-in-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next, '');
  const configured = isSupabaseConfigured();
  return (
    <>
      {configured ? <ReasonNotice reason={typeof params.motivo === 'string' ? params.motivo : undefined} /> : <NotConfiguredNotice />}
      <SignInForm next={next || undefined} enabled={configured} />
      <DemoLink />
    </>
  );
}
