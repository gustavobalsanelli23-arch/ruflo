import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAuthReady, readAuthConfig } from '@/lib/auth/config';
import { getAdminSession } from '@/lib/auth/session';
import { AdminLoginForm } from '@/components/admin/auth/AdminLoginForm';
import { AdminSetupGuide } from '@/components/admin/auth/AdminSetupGuide';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Entrar' };
export const dynamic = 'force-dynamic';

/** Só aceita voltar para páginas do próprio painel (evita redirecionamento aberto). */
const safeNext = (value: string | string[] | undefined) => {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith('/admin') && !v.startsWith('//') && !v.startsWith('/admin/login') ? v : '/admin';
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getAdminSession()) redirect('/admin');
  const config = readAuthConfig();
  const ready = isAuthReady(config);
  const next = safeNext((await searchParams).next);

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[#05070b] px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--color-brand-600)_22%,transparent),transparent_70%)]" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" aria-hidden />

      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href={null} imgClassName="h-8" />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-fg-2">
            <span className="size-1.5 rounded-full bg-brand-500" aria-hidden /> Acesso restrito
          </p>
          <h1 className="mt-4 text-[1.75rem] font-extrabold tracking-tight text-fg">Painel Administrativo</h1>
          <p className="mt-1.5 text-sm text-muted">Entre com sua conta de administrador.</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-surface/90 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
          {ready ? <AdminLoginForm next={next} /> : <AdminSetupGuide problems={config.problems} />}
        </div>

        <p className="mt-6 text-center text-xs text-subtle">Área exclusiva da equipe FutZone. Acessos são registrados.</p>
      </div>
    </main>
  );
}
