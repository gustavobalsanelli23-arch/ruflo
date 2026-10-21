import { business, links, navItems, services, whatsapp, whatsappLink } from '../data/site';
import { InstagramIcon, WhatsAppIcon } from './ui/Icons';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink pb-28 pt-20 text-ivory md:pb-12 md:pt-28">
      <div className="container-x">
        <div className="grid gap-14 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="font-display text-[clamp(3.25rem,7vw,5.5rem)] leading-[0.92]">
              Studio <em className="italic text-gold">Sene</em>
            </p>
            <p className="mt-5 text-[0.625rem] font-medium uppercase tracking-[0.36em] text-ivory/60">
              {business.tagline}
            </p>
          </div>

          <nav aria-label="Rodapé" className="md:col-span-2 md:col-start-7">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-gold">Navegue</p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/75">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="transition-colors hover:text-ivory">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-2">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-gold">Serviços</p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/75">
              {services.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="transition-colors hover:text-ivory">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-gold">Contato</p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/75">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-ivory"
                >
                  <WhatsAppIcon className="size-3.5" /> {whatsapp.display}
                </a>
              </li>
              <li>
                <a
                  href={links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 break-all transition-colors hover:text-ivory"
                >
                  <InstagramIcon className="size-3.5 shrink-0" /> Instagram
                </a>
              </li>
              <li>
                {business.city} – {business.state}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-3 border-t border-ivory/10 pt-8 text-[0.6875rem] tracking-[0.08em] text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {business.name}. Todos os direitos reservados.
          </p>
          <a
            href="#inicio"
            className="self-start uppercase tracking-[0.28em] transition-colors hover:text-ivory sm:self-auto"
          >
            Voltar ao topo ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
