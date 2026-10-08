import { Heart, MapPin, PackageSearch, Zap } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';

const BENEFITS = [
  { icon: PackageSearch, title: 'Acompanhe seus pedidos', text: 'Status e rastreio de cada compra em um só lugar.' },
  { icon: MapPin, title: 'Endereços salvos', text: 'Finalize a compra em poucos toques.' },
  { icon: Heart, title: 'Lista de favoritos', text: 'Guarde as camisas que você quer.' },
  { icon: Zap, title: 'Checkout mais rápido', text: 'Seus dados já preenchidos na próxima compra.' },
];

/** Moldura das telas de login, cadastro e recuperação de senha. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-fz py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div className="animate-fade-up mx-auto w-full max-w-lg lg:mx-0">
          <h1 className="heading-display text-5xl text-fg sm:text-6xl">{title}</h1>
          {subtitle && <p className="mt-3 text-fg-2">{subtitle}</p>}
          <div className="mt-8 rounded-3xl bg-surface p-5 ring-1 ring-white/[0.06] sm:p-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-subtle">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-400" aria-hidden />
            Modo demonstração: sua conta fica salva apenas neste navegador e a senha é guardada criptografada (hash), nunca em texto. O login com servidor será ativado junto com o banco de dados.
          </p>
        </div>

        <aside className="relative isolate hidden overflow-hidden rounded-3xl bg-surface p-8 ring-1 ring-white/[0.06] lg:block">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_100%_0%,color-mix(in_oklab,var(--color-brand-600)_22%,transparent),transparent_70%)]" aria-hidden />
          <p className="eyebrow mb-6">Por que ter uma conta</p>
          <ul className="space-y-6">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-brand-400">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-fg">{title}</span>
                  <span className="text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
