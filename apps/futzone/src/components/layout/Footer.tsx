import Link from 'next/link';
import { Mail, RefreshCcw, Ruler, Shirt } from 'lucide-react';
import { collections, collectionHref } from '@/data/collections';
import { accountNav, mainNav, site } from '@/data/site';
import { Logo } from '@/components/brand/Logo';

/** Fatos do serviço (nada inventado): fotos reais, grade de tamanhos, direito de arrependimento. */
const FACTS = [
  { icon: Shirt, title: 'Fotos reais', text: 'Cada camisa fotografada em quem veste, em vários ângulos.' },
  { icon: Ruler, title: 'Do P ao 4GG', text: 'Grade adulta completa e tamanhos infantis.' },
  { icon: RefreshCcw, title: 'Troca em até 7 dias', text: 'Direito de arrependimento garantido por lei.' },
];

const SUPPORT = [
  { label: 'Tabela de tamanhos', href: '/camisas' },
  { label: 'Trocas e devoluções', href: '/politicas#trocas' },
  { label: 'Entregas', href: '/politicas#entregas' },
  { label: 'Fale conosco', href: `mailto:${site.contactEmail}` },
];

const POLICIES = [
  { label: 'Privacidade', href: '/politicas#privacidade' },
  { label: 'Termos de uso', href: '/politicas#termos' },
  { label: 'Trocas', href: '/politicas#trocas' },
];

export function Footer() {
  const social = site.social.filter((s) => s.href);
  return (
    <footer className="mt-24 border-t border-line-strong bg-steel sm:mt-32">
      {/* Fileira de fatos: três armários lado a lado, separados por emendas */}
      <ul className="container-fz grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {FACTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-4 py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <Icon className="mt-0.5 size-5 shrink-0 text-fg-2" strokeWidth={1.6} />
            <div>
              <p className="heading-stencil text-xl text-fg">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-line">
        <div className="container-fz grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 space-y-5 md:col-span-4 lg:col-span-1">
            <Logo variant="full" imgClassName="w-40" />
            <p className="max-w-xs text-sm leading-relaxed text-muted">Camisas de clubes, seleções, retrô e kits para quem vive o futebol dentro e fora do estádio.</p>
            <a href={`mailto:${site.contactEmail}`} className="link-underline inline-flex items-center gap-2 text-sm text-fg-2 hover:text-fg">
              <Mail className="size-4 text-fg-2" strokeWidth={1.75} /> {site.contactEmail}
            </a>
            {social.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Redes sociais">
                {social.map((s) => (
                  <li key={s.name}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-[var(--radius-chip)] border border-line-strong px-3.5 py-1.5 text-xs text-fg-2 transition-colors hover:border-fg-2/60 hover:text-fg">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">Em breve no Instagram, TikTok e WhatsApp.</p>
            )}
          </div>
          <FooterColumn title="Loja" links={[{ label: 'Início', href: '/' }, ...mainNav.map((l) => ({ label: l.label, href: l.href })), { label: 'Promoções', href: '/promocoes' }]} />
          <FooterColumn title="Coleções" links={collections.map((c) => ({ label: c.name, href: collectionHref(c.id) }))} />
          <FooterColumn title="Atendimento" links={SUPPORT} />
          <FooterColumn title="Minha conta" links={[...accountNav, { label: 'Carrinho', href: '/carrinho' }]} />
        </div>
      </div>

      <div className="border-t border-line py-6">
        <div className="container-fz flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FutZone. Ambiente de demonstração: produtos, estoques e pedidos são simulados.</p>
          <ul className="flex gap-5">
            {POLICIES.map((p) => (
              <li key={p.label}>
                <Link href={p.href} className="transition-colors hover:text-fg">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <nav aria-label={title}>
      <h3 className="plate mb-4 text-[0.95rem] text-fg">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="link-underline text-sm text-muted transition-colors hover:text-fg">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
