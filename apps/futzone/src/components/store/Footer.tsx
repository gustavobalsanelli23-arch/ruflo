import Link from 'next/link';
import { Mail, ShieldCheck, Shirt, Truck } from 'lucide-react';
import { categories } from '@/data/categories';
import { accountNav, site } from '@/data/site';
import { Logo } from '@/components/brand/Logo';

const PERKS = [
  { icon: Shirt, title: 'Camisas selecionadas', text: 'Clubes, seleções e clássicos retrô.' },
  { icon: Truck, title: 'Entrega para todo o Brasil', text: 'Frete será calculado na próxima etapa.' },
  { icon: ShieldCheck, title: 'Compra segura', text: 'Pagamento será integrado em breve.' },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface/60">
      <div className="container-fz grid gap-4 border-b border-line py-8 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-400">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="container-fz grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo variant="full" imgClassName="w-44" />
          <p className="max-w-xs text-sm text-muted">{site.tagline} Camisas de futebol para quem vive o jogo dentro e fora do estádio.</p>
          <a href={`mailto:${site.contactEmail}`} className="inline-flex items-center gap-2 text-sm text-fg-2 hover:text-brand-300">
            <Mail className="size-4 text-brand-400" /> {site.contactEmail}
          </a>
        </div>
        <FooterColumn title="Loja" links={[{ label: 'Todas as camisas', href: '/camisas' }, { label: 'Times', href: '/times' }, { label: 'Promoções', href: '/promocoes' }, { label: 'Carrinho', href: '/carrinho' }]} />
        <FooterColumn title="Categorias" links={categories.map((c) => ({ label: c.shortName, href: c.href }))} />
        <FooterColumn title="Minha conta" links={[...accountNav, { label: 'Painel administrativo', href: '/admin' }]} />
      </div>

      <div className="border-t border-line py-6">
        <p className="container-fz text-xs text-subtle">
          © {new Date().getFullYear()} FutZone. Ambiente de demonstração — produtos, estoques e pedidos são simulados.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="eyebrow mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm text-fg-2 transition-colors hover:text-brand-300">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
