import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminHashGenerator } from '@/components/admin/auth/AdminHashGenerator';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Nova senha' };

/**
 * Página pública para um administrador criar a própria senha: o código (hash) é
 * calculado no navegador e não dá acesso a nada sozinho; só vale depois que o
 * dono da loja o cola na Vercel. A senha nunca sai deste aparelho.
 */
export default function AdminNewPasswordPage() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[#05070b] px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--color-brand-600)_22%,transparent),transparent_70%)]" aria-hidden />
      <div className="w-full min-w-0 max-w-[460px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href={null} imgClassName="h-8" />
          <h1 className="mt-6 text-[1.6rem] font-extrabold tracking-tight text-fg">Nova senha do painel</h1>
          <p className="mt-1.5 text-sm text-muted">Para o primeiro acesso ou quando a senha não funciona.</p>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-surface/90 p-6 text-sm shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-8">
          <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-fg-2">
            <li>Crie sua senha abaixo e toque em <b>Gerar código</b>. A senha fica só neste aparelho: nada é enviado.</li>
            <li>
              Copie o código e mande para o dono da loja. <b>Não mande a senha</b>, só o código.
            </li>
            <li>
              Ele cola o código na Vercel, em <code className="break-all text-brand-300">FUTZONE_ADMIN_n_PASSWORD_HASH</code> da sua conta, e faz um novo deploy.
            </li>
            <li>Depois disso, entre no painel com o seu e-mail e a senha que você criou aqui.</li>
          </ol>
          <AdminHashGenerator title="Sua nova senha" />
        </div>

        <p className="mt-6 text-center text-xs text-subtle">
          <Link href="/admin/login" className="font-semibold text-fg-2 hover:text-fg">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
