import { ArrowUp } from 'lucide-react';
import { business } from '../config/site';
import { Wordmark } from './Header';
import { InstagramLink, NAV, SectionLink } from './ui';

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line-dark)] pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] max-lg:pb-28 lg:pt-24">
      <div className="container-x">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <SectionLink href={item.href} className="link-line link-quiet label text-[0.7rem]">
                    {item.label}
                  </SectionLink>
                </li>
              ))}
              <li>
                <SectionLink href="#agendar" className="link-line link-quiet label text-[0.7rem]">
                  Agendar
                </SectionLink>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-8">
            <InstagramLink className="link-line link-quiet label text-[0.7rem]">Instagram</InstagramLink>
            <SectionLink href="#topo" className="link-line link-quiet label text-[0.7rem]">
              Topo
              <ArrowUp size={13} strokeWidth={1.5} aria-hidden="true" />
            </SectionLink>
          </div>
        </div>

        {/* A assinatura, de ponta a ponta. */}
        {/* Largura do container ÷ proporção do letreiro (≈ 7,54 em): ocupa a linha toda. */}
        <p aria-hidden="true" className="mt-16 text-[calc((min(100vw,96rem)-2*var(--gutter))/7.75)] whitespace-nowrap lg:mt-24">
          <Wordmark />
        </p>

        <div className="mt-10 flex flex-col gap-2 text-[0.8125rem] text-fumo sm:flex-row sm:justify-between">
          <p>
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {business.name}
          </p>
          <p>@{business.instagram.handle}</p>
        </div>
      </div>
    </footer>
  );
}
