import { address, bookingChannel, bookingHref, business, formatPhone, hours, links, location, nav, whatsappNumber } from '../data/site';
import { ArrowUpRight, InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Logo } from './ui/Logo';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="rodape" className="concrete relative overflow-hidden border-t-2 border-chalk/10 pb-28 pt-16 md:pb-10 md:pt-24">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Logo className="h-auto w-44 md:w-56" />
            <p className="poster mt-8 text-[clamp(2.5rem,6vw,4.5rem)] text-chalk">{business.name}</p>
            <p className="mt-3 max-w-xs text-pretty text-smoke">Por {business.barber}. Técnica, personalidade e atitude em cada corte.</p>
          </div>

          <nav aria-label="Rodapé" className="lg:col-span-2">
            <p className="tag text-smoke">Navegar</p>
            <ul className="mt-5 space-y-2.5">
              {nav.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="link-line text-lg font-bold uppercase text-paper stretch-75">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <p className="tag text-smoke">Contato</p>
            <ul className="mt-5 space-y-3">
              <li>
                <a href={links.instagram} target="_blank" rel="noopener" className="link-line font-semibold text-paper">
                  <InstagramIcon className="size-4" />@{business.instagramHandle}
                </a>
              </li>
              {whatsappNumber ? (
                <li>
                  <a href={bookingHref()} target="_blank" rel="noopener" className="link-line font-semibold text-paper">
                    <WhatsAppIcon className="size-4" />
                    {formatPhone(whatsappNumber)}
                  </a>
                </li>
              ) : (
                <li>
                  <a href={links.instagramDirect} target="_blank" rel="noopener" className="link-line font-semibold text-paper">
                    <ArrowUpRight className="size-4" />
                    Direct do Instagram
                  </a>
                </li>
              )}
              <li className="text-paper">
                {address ? (
                  <span>
                    {address.street}
                    {address.district ? `, ${address.district}` : ''} · {address.city}/{address.state}
                  </span>
                ) : (
                  <span>
                    {location.locality} · {location.city}/{location.region}
                  </span>
                )}
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="tag text-smoke">Horários</p>
            {hours ? (
              <dl className="mt-5 space-y-3 text-paper">
                {hours.map((h) => (
                  <div key={h.days} className="border-b border-chalk/10 pb-3">
                    <dt className="text-lg font-bold uppercase stretch-75">{h.days}</dt>
                    {h.time.map((t) => (
                      <dd key={t} className="tabular-nums text-smoke">
                        {t}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-5 text-pretty text-paper">
                <a href={bookingHref()} target="_blank" rel="noopener" className="link-line font-semibold">
                  {bookingChannel === 'whatsapp' ? 'Consulte os horários no WhatsApp' : 'Consulte os horários pelo Direct'}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t-2 border-chalk/10 pt-6 text-sm text-smoke md:flex-row md:items-center md:justify-between">
          <p suppressHydrationWarning>
            © {year} {business.name}. Todos os direitos reservados.
          </p>
          <a href="#inicio" className="tag link-line self-start text-paper md:self-auto">
            Voltar ao topo ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
