import type { Metadata } from 'next';
import { isSupabaseConfigured } from '@/lib/env';
import { NotConfiguredNotice, ReasonNotice } from '@/modules/auth/auth-notices';
import { RequestResetForm } from '@/modules/auth/recovery-forms';

export const metadata: Metadata = { title: 'Recuperar acesso' };

export default async function RecoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  return (
    <>
      {configured ? <ReasonNotice reason={typeof params.motivo === 'string' ? params.motivo : undefined} /> : <NotConfiguredNotice />}
      <RequestResetForm enabled={configured} />
    </>
  );
}
