import { ArrowUp } from 'lucide-react';
import { business, formatPhone, fullAddress, hasWhatsapp, mapsUrl, resolveChannel } from '../config/site';
import { nav } from '../data/content';
import { InstagramIcon, WhatsappIcon } from './Icons';
import { Logo } from './Logo';

export function Footer({ year }: { year: number }) {
  const channel = resolveChannel();
  const legal = [business.legalName, business.cnpj && `CNPJ ${business.cnpj}`, business.creci && `CRECI ${business.creci}`].filter(Boolean);
  return (
    <footer className="relative border-t border-line bg-night pb-[max(2rem,env(safe-area-inset-bottom))] pt-20">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo stacked />
            <p className="mt-6 max-w-xs text-[0.9375rem] leading-relaxed text-mineral">
              Assessoria imobiliária, investimentos e oportunidades estratégicas.
            </p>
          </div>

          <nav aria-label="Rodapé" className="md:col-span-3">
            <p className="kicker">Navegação</p>
            <ul className="mt-4 space-y-2.5">
              {nav.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="text-[0.9375rem] text-linen/80 transition-colors hover:text-linen">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <p className="kicker">Contato</p>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
              <li>
                <a href={business.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-linen/80 hover:text-linen">
                  <InstagramIcon size={16} />@{business.instagram.handle}
                </a>
              </li>
              {hasWhatsapp && (
                <li>
                  <a href={channel.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-linen/80 hover:text-linen">
                    <WhatsappIcon size={16} />
                    {formatPhone(business.whatsapp.number)}
                  </a>
                </li>
              )}
              {business.email && (
                <li>
                  <a href={`mailto:${business.email}`} className="text-linen/80 hover:text-linen">
                    {business.email}
                  </a>
                </li>
              )}
              {business.address && (
                <li>
                  <a href={mapsUrl(business.address)} target="_blank" rel="noopener noreferrer" className="text-linen/80 hover:text-linen">
                    {fullAddress(business.address)}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-line pt-8 text-[0.8125rem] text-mineral md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <p>
              © {year} {business.fullName}. Todos os direitos reservados.
            </p>
            {legal.length > 0 && <p>{legal.join(' — ')}</p>}
            <p>Fotografias e vídeos ilustrativos de banco de imagens (Burst e Mixkit).</p>
          </div>
          <a href="#inicio" className="inline-flex items-center gap-2 self-start text-linen/80 hover:text-linen md:self-auto">
            Voltar ao topo
            <ArrowUp size={14} strokeWidth={1.6} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
