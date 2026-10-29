import { redirect } from 'next/navigation';
import { getSessionUser } from '@/services/session';

/** The proxy already routes `/`; this is the fallback when it does not run. */
export default async function Home() {
  redirect((await getSessionUser()) ? '/visao-geral' : '/entrar');
}
