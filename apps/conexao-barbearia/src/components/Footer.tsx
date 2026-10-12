import { ArrowUp, ArrowUpRight, Mail } from 'lucide-react';
import { business, instagramHandle, links, nav, navExtra, units, whatsapp, whatsappLink } from '../data/site';
import { track } from '../lib/analytics';
import { InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Reveal } from './ui/Reveal';

type FooterProps = {
  /** Nas páginas legais os links de seção apontam para a home. */
  basePath?: string;
};

export function Footer({ basePath = '' }: FooterProps) {
  const year = new Date().getFullYear();
  const sectionHref = (id: string) => `${basePath}#${id}`;

  return (
    <footer id="contato" aria-labelledby="contato-title" className="relative bg-ink">
      {/* Bloco de contato */}
      <div className="container-x border-t border-line py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow text-gold">
              <span className="tabular-nums">08</span>
              <span aria-hidden="true" className="h-px w-10 bg-gold/60" />
              <span>Contato</span>
            </p>
            <h2 id="contato-title" className="display mt-6 text-[2.6rem] xs:text-5xl md:text-6xl xl:text-7xl">
              Fale com a <span className="font-normal italic text-gold">Conexão.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <ul className="grid gap-4">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener"
                  onClick={() => track('Contact', { origem: 'rodape' })}
                  className="group flex items-center justify-between gap-6 border-b border-line pb-4"
                >
                  <span className="flex items-center gap-4">
                    <WhatsAppIcon className="size-5 text-gold" />
                    <span className="font-display text-3xl tabular-nums text-bone md:text-4xl">{whatsapp.display}</span>
                  </span>
                  <ArrowUpRight
                    className="size-5 text-bone/50 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${business.email}`}
                  className="group flex items-center justify-between gap-6 border-b border-line pb-4"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <Mail className="size-5 shrink-0 text-gold" strokeWidth={1.5} aria-hidden="true" />
                    <span className="truncate text-base text-bone/85 md:text-lg">{business.email}</span>
                  </span>
                  <ArrowUpRight
                    className="size-5 shrink-0 text-bone/50 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </li>
              {links.instagram && (
                <li>
                  <a
                    href={links.instagram}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Instagram da Conexão Barbearia: ${instagramHandle}`}
                    className="group flex items-center justify-between gap-6 border-b border-line pb-4"
                  >
                    <span className="flex items-center gap-4">
                      <InstagramIcon className="size-5 text-gold" />
                      <span className="text-base text-bone/85 md:text-lg">{instagramHandle}</span>
                    </span>
                    <ArrowUpRight
                      className="size-5 text-bone/50 group-hover:text-gold"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              )}
            </ul>
          </Reveal>
        </div>
      </div>

      {/* Colunas institucionais */}
      <div className="container-x grid gap-12 border-t border-line py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <a href={sectionHref('inicio')} aria-label="Conexão Barbearia — início" className="inline-block">
            <img
              src="/images/logo-conexao.webp"
              alt="Conexão Barbearia"
              width={450}
              height={109}
              loading="lazy"
              className="h-auto w-[180px]"
            />
          </a>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-bone/55">
            Barbearia em {business.city}, {business.state}, desde {business.foundedYear}. {business.tagline}
          </p>
          <a
            href={links.booking}
            target="_blank"
            rel="noopener"
            onClick={() => track('Schedule', { origem: 'rodape' })}
            className="btn btn-gold mt-8"
          >
            Agendar horário
            <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>

        <nav aria-label="Navegação do rodapé" className="lg:col-span-2">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-gold">Navegação</h3>
          <ul className="mt-6 grid gap-3 text-sm">
            {[...nav.filter((n) => n.id !== 'contato'), ...navExtra].map((item) => (
              <li key={item.id}>
                <a href={sectionHref(item.id)} className="text-bone/65 transition-colors hover:text-bone">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-gold">Unidades</h3>
          <ul className="mt-6 grid gap-6 text-sm">
            {units.map((u) => (
              <li key={u.id}>
                <p className="font-semibold text-bone">{u.shortName}</p>
                <address className="mt-1 not-italic leading-relaxed text-bone/60">
                  {u.street} — {u.complement}
                  <br />
                  {u.city}, {u.state}
                </address>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-gold">Institucional</h3>
          <ul className="mt-6 grid gap-3 text-sm">
            <li>
              <a
                href={links.subscription}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 text-bone/65 transition-colors hover:text-bone"
              >
                Assinatura <ArrowUpRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href={links.booking}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 text-bone/65 transition-colors hover:text-bone"
              >
                AppBarber <ArrowUpRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href={links.terms} className="text-bone/65 transition-colors hover:text-bone">
                Termos de Uso
              </a>
            </li>
            <li>
              <a href={links.privacy} className="text-bone/65 transition-colors hover:text-bone">
                Política de Privacidade
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-x flex flex-col gap-4 border-t border-line py-8 pb-28 text-xs text-bone/60 sm:flex-row sm:items-center sm:justify-between sm:pb-8">
        <p>
          © <span suppressHydrationWarning>{year}</span> {business.name}. Todos os direitos reservados. · CNPJ{' '}
          {business.legalId}
        </p>
        <a
          href={sectionHref('inicio')}
          className="inline-flex items-center gap-2 uppercase tracking-[0.2em] transition-colors hover:text-bone"
        >
          Voltar ao topo
          <ArrowUp className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
