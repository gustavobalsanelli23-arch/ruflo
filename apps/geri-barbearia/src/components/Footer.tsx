import { useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { business, hoursTable, mapsUrl, whatsappUrl } from '../config/site';
import { useGsap } from '../hooks/useGsap';
import { gsap } from '../lib/motion';
import { Emblem } from './Emblem';
import { InstagramIcon, WhatsAppIcon } from './icons';
import { AnchorLink, instagramLabel, navItems } from './ui';

export function Footer() {
  const root = useRef<HTMLElement>(null);

  // O emblema gira devagar com a rolagem, como um carimbo sendo assentado.
  useGsap(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '[data-footer-emblem]',
        { rotate: -24 },
        {
          rotate: 0,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, root);

  return (
    <footer
      ref={root}
      className="relative border-t border-[var(--line)] bg-ink pt-20 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-28"
    >
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-x-8">
          <div className="flex items-center gap-6 lg:col-span-5 lg:flex-col lg:items-start">
            <span data-footer-emblem className="block shrink-0">
              <Emblem
                title="Emblema da Geri Barbearia: Desde 2024, Chegou, cortou!"
                className="h-28 w-28 text-gold lg:h-40 lg:w-40"
              />
            </span>
            <p className="font-serif text-[2rem] leading-tight italic lg:mt-2 lg:text-[2.6rem]">Chegou, cortou.</p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7">
            <div>
              <h2 className="text-sm text-gold">Endereço</h2>
              <address className="mt-4 text-[0.95rem] leading-relaxed text-bone/80 not-italic">
                {business.address.street}
                <br />
                {business.address.district}, {business.address.city}, {business.address.state}
                <br />
                {business.address.reference}
              </address>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-line link-line--quiet mt-3 text-sm text-parchment"
              >
                Ver no mapa
                <span className="sr-only">(abre o Google Maps em nova aba)</span>
              </a>
            </div>

            <div>
              <h2 className="text-sm text-gold">Horários</h2>
              <dl className="mt-4 space-y-3 text-[0.95rem] text-bone/80">
                {hoursTable.map((row) => (
                  <div key={row.label}>
                    <dt className="text-bone">{row.label}</dt>
                    <dd>{row.times.join(' e ')}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="text-sm text-gold">Contato</h2>
              <ul className="mt-4 space-y-3 text-[0.95rem]">
                <li>
                  <a
                    href={whatsappUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-line link-line--quiet text-bone/85 hover:text-bone"
                    data-cta="footer"
                  >
                    <WhatsAppIcon size={17} />
                    {business.whatsapp.display}
                    <span className="sr-only">(WhatsApp, abre em nova aba)</span>
                  </a>
                </li>
                <li>
                  <a
                    href={business.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-line link-line--quiet text-bone/85 hover:text-bone"
                  >
                    <InstagramIcon size={17} />
                    {instagramLabel}
                    <span className="sr-only">(Instagram, abre em nova aba)</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-[var(--line)] pt-8 text-sm text-bone/55 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <AnchorLink href={item.href} className="link-line link-line--quiet hover:text-bone">
                    {item.label}
                  </AnchorLink>
                </li>
              ))}
            </ul>
          </nav>
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} <span translate="no">{business.name}</span>. Todos os direitos reservados.
          </p>
          <AnchorLink href="#topo" className="link-line link-line--quiet self-start hover:text-bone lg:self-auto">
            Voltar ao topo
            <ArrowUp size={15} strokeWidth={1.5} aria-hidden="true" />
          </AnchorLink>
        </div>
      </div>
    </footer>
  );
}
