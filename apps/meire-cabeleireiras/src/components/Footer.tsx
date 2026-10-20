import { business, formatPhone, fullAddress, hasWhatsapp, mapsUrl, whatsappUrl } from '../config/site';
import { ArrowUpRightIcon, InstagramIcon, WhatsappIcon } from './icons';
import { Lotus } from './Lotus';
import { NAV, SectionLink } from './ui';

const YEAR = new Date().getFullYear();

export function Footer() {
  const { address, hours } = business;

  return (
    <footer className="relative bg-floresta pt-[clamp(5rem,3rem+6vw,9rem)] text-papel">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <p className="flex items-center gap-5">
            <Lotus size={64} stroke={1.1} className="shrink-0 text-rosa" />
            <span translate="no" className="font-serif text-[clamp(2.25rem,1.2rem+4vw,5rem)] leading-[0.95] font-light tracking-[-0.02em]">
              Meire <span className="italic">Cabeleireiras</span>
            </span>
          </p>
          <p className="font-serif text-[1.375rem] font-light italic text-champanhe lg:pb-2">{business.tagline}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 border-t border-[var(--line-light)] pt-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4">
            <h2 className="font-sans text-[0.9375rem] font-semibold">Contato</h2>
            <ul className="mt-4 space-y-3 text-champanhe">
              <li>
                <a
                  href={business.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-line link-quiet hover:text-papel"
                >
                  <InstagramIcon size={18} />@{business.instagram.handle}
                  <span className="sr-only">(abre o Instagram em nova aba)</span>
                </a>
              </li>
              {hasWhatsapp && (
                <li>
                  <a
                    href={whatsappUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-line link-quiet hover:text-papel"
                  >
                    <WhatsappIcon size={18} />
                    {formatPhone(business.whatsapp.number)}
                    <span className="sr-only">(WhatsApp, abre em nova aba)</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h2 className="font-sans text-[0.9375rem] font-semibold">{address || hours ? 'Visite o salão' : 'Endereço e horários'}</h2>
            {address || hours ? (
              <div className="mt-4 space-y-5 text-champanhe">
                {address && (
                  <address className="not-italic">
                    {fullAddress(address)}
                    {address.reference && <span className="block text-champanhe/75">{address.reference}</span>}
                    <a
                      href={mapsUrl(address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-line mt-2 text-papel"
                    >
                      Como chegar
                      <ArrowUpRightIcon size={15} />
                      <span className="sr-only">(abre o Google Maps em nova aba)</span>
                    </a>
                  </address>
                )}
                {hours && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                    {hours.map((row) => (
                      <div key={row.days} className="contents">
                        <dt>{row.days}</dt>
                        <dd className="text-papel tabular-nums">{row.hours}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ) : (
              <p className="mt-4 max-w-[22rem] text-champanhe">Informados no agendamento.</p>
            )}
          </div>

          <nav aria-label="Rodapé" className="lg:col-span-4">
            <h2 className="font-sans text-[0.9375rem] font-semibold">Navegue</h2>
            <ul className="mt-4 grid grid-cols-2 gap-y-3 text-champanhe">
              {NAV.map((item) => (
                <li key={item.href}>
                  <SectionLink href={item.href} className="link-line link-quiet hover:text-papel">
                    {item.label}
                  </SectionLink>
                </li>
              ))}
              <li>
                <SectionLink href="#agendar" className="link-line link-quiet hover:text-papel">
                  Agendar
                </SectionLink>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-[var(--line-light)] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-[0.8125rem] text-champanhe/80 max-lg:pb-28 lg:flex-row lg:items-center lg:justify-between">
          {/* O ano vem do build; na virada do ano o navegador corrige sem alerta. */}
          <p suppressHydrationWarning>
            © {YEAR} {business.name}. Todos os direitos reservados.
          </p>
          <p>Fotografias: trabalhos publicados em @{business.instagram.handle}.</p>
          <SectionLink href="#topo" className="link-line link-quiet self-start hover:text-papel lg:self-auto">
            Voltar ao topo
          </SectionLink>
        </div>
      </div>
    </footer>
  );
}
