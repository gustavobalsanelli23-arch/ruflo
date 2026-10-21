import { address, business, hours, links, logo, nav, whatsapp } from '../data/site';
import { Facebook, Instagram, WhatsApp } from './ui/Icons';
import { WhatsAppLink } from './ui/WhatsAppLink';

export function Footer({ home = true }: { home?: boolean }) {
  const href = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <footer id="rodape" className="bg-ink-2 pb-28 pt-20 text-bone/80 md:pb-12 md:pt-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="grid gap-14 sm:grid-cols-2 md:grid-cols-12 md:gap-8">
          <div className="sm:col-span-2 md:col-span-4">
            <a href={home ? '#topo' : '/'} aria-label="VIP body & hair — início" className="inline-block">
              <img src={logo.white.src} width={logo.white.width} height={logo.white.height} alt="VIP body & hair" loading="lazy" className="w-[168px]" />
            </a>
            <p className="mt-8 max-w-xs text-sm leading-relaxed text-mist">{business.tagline}. Coloração, corte, tratamentos, make, mãos, olhar e pele.</p>
            <div className="mt-8 flex gap-2">
              {[
                { href: links.instagram, label: 'Instagram', Icon: Instagram },
                { href: links.facebook, label: 'Facebook', Icon: Facebook },
              ].map(({ href: h, label, Icon }) => (
                <a
                  key={label}
                  href={h}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center border border-bone/15 transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
                >
                  <Icon width={18} height={18} />
                </a>
              ))}
              <WhatsAppLink
                source="rodape-icone"
                aria-label="WhatsApp"
                className="flex h-11 w-11 items-center justify-center border border-bone/15 transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
              >
                <WhatsApp width={18} height={18} />
              </WhatsAppLink>
            </div>
          </div>

          <nav aria-label="Rodapé" className="md:col-span-2 md:col-start-6">
            <h2 className="eyebrow text-[0.6rem] text-mist">Navegação</h2>
            <ul className="mt-6 space-y-3 text-sm">
              {nav.map((n) => (
                <li key={n.id}>
                  <a href={href(n.id)} className="link-line">
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={href('duvidas')} className="link-line">
                  Dúvidas
                </a>
              </li>
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h2 className="eyebrow text-[0.6rem] text-mist">Contato</h2>
            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <WhatsAppLink source="rodape" className="link-line">
                  WhatsApp {whatsapp.display}
                </WhatsAppLink>
              </li>
              <li>
                <a href={business.phone.href} className="link-line">
                  Telefone {business.phone.display}
                </a>
              </li>
              <li>
                <a href={`mailto:${business.email}`} className="link-line">
                  {business.email}
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h2 className="eyebrow text-[0.6rem] text-mist">Visite</h2>
            <address className="mt-6 text-sm not-italic leading-relaxed">
              <a href={links.googleMaps} target="_blank" rel="noopener noreferrer" className="link-line">
                {address.street}
                <br />
                {address.district} · {address.city}/{address.state}
                <br />
                CEP {address.postalCode}
              </a>
            </address>
            <p className="mt-4 text-sm">{hours.summary}</p>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-bone/10 pt-8 text-xs text-mist md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} VIP body &amp; hair · Barueri/SP</p>
          <a href="/politica-de-privacidade/" className="link-line self-start md:self-auto">
            Política de privacidade
          </a>
        </div>
      </div>
    </footer>
  );
}
