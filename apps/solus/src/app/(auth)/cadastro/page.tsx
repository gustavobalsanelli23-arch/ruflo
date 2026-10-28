import type { Metadata } from 'next';
import { safeNextPath } from '@/lib/auth/redirect';
import { isSupabaseConfigured } from '@/lib/env';
import { DemoLink, NotConfiguredNotice } from '@/modules/auth/auth-notices';
import { SignUpForm } from '@/modules/auth/sign-up-form';

export const metadata: Metadata = { title: 'Criar conta' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next, '');
  const configured = isSupabaseConfigured();
  return (
    <>
      {!configured && <NotConfiguredNotice />}
      <SignUpForm next={next || undefined} enabled={configured} />
      {!configured && <DemoLink />}
    </>
  );
}
