import { useEffect, useRef, useState } from 'react';
import { business, fullAddress, mapsUrl, whatsappUrl } from '../config/site';
import { useGsap } from '../hooks/useGsap';
import { EASE, gsap, lockScroll, prefersReducedMotion } from '../lib/motion';
import { Emblem } from './Emblem';
import { InstagramIcon, WhatsAppIcon } from './icons';
import { AnchorLink, OpenStatus, WhatsAppButton, instagramLabel, navItems } from './ui';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  // Header discreto: ganha fundo ao rolar e se recolhe ao descer a página.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > window.innerHeight * 0.9);
        last = y;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Timeline do menu mobile: a cortina desce e os links sobem em sequência.
  useGsap(() => {
    const menu = menuRef.current!;
    const reduce = prefersReducedMotion();
    timeline.current = gsap
      .timeline({ paused: true, defaults: { ease: EASE.out } })
      .set(menu, { visibility: 'visible' })
      .fromTo(
        menu,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: reduce ? 0.01 : 0.9, ease: EASE.inOut },
      )
      .fromTo(
        '[data-menu-link]',
        { yPercent: 110 },
        { yPercent: 0, duration: reduce ? 0.01 : 1, stagger: 0.06 },
        reduce ? 0 : 0.35,
      )
      .fromTo(
        '[data-menu-foot]',
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 },
        '<0.2',
      );
  }, menuRef);

  useEffect(() => {
    const tl = timeline.current;
    const main = document.getElementById('conteudo');
    const footer = document.querySelector('footer');
    lockScroll(open);
    main?.toggleAttribute('inert', open);
    footer?.toggleAttribute('inert', open);
    if (!tl) return;
    if (open) {
      tl.timeScale(1).play();
      menuRef.current?.querySelector<HTMLElement>('nav a')?.focus({ preventScroll: true });
    } else if (tl.progress() > 0) {
      tl.timeScale(1.6).reverse();
    }
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-bone focus:px-4 focus:py-3 focus:text-ink"
      >
        Pular para o conteúdo
      </a>

      <header
        data-hero-item="header"
        className={`fixed inset-x-0 top-0 z-[80] transition-[transform,background-color,border-color] duration-700 ease-[var(--ease-out-expo)] ${
          hidden && !open ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled && !open ? 'border-b border-[var(--line)] bg-ink/85 backdrop-blur-md' : 'border-b border-transparent'}`}
      >
        <div
          className={`container-x flex items-center justify-between gap-6 transition-[height] duration-700 ease-[var(--ease-out-expo)] ${
            scrolled ? 'h-16' : 'h-20 lg:h-24'
          }`}
        >
          <AnchorLink href="#topo" className="group flex items-center gap-3" onNavigate={close}>
            <Emblem
              markOnly
              className="h-9 w-9 text-gold transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-[-8deg]"
            />
            <span className="flex flex-col leading-none" translate="no">
              <span className="font-serif text-[1.45rem] tracking-[0.06em]">GERI</span>
              <span className="signage mt-1 text-[0.58rem] text-parchment/80">Barbearia</span>
            </span>
            <span className="sr-only">Geri Barbearia, voltar ao topo</span>
          </AnchorLink>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-10 text-[0.9375rem]">
              {navItems.map((item) => (
                <li key={item.href}>
                  <AnchorLink href={item.href} className="link-line link-line--quiet text-bone/85 hover:text-bone">
                    {item.label}
                  </AnchorLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <WhatsAppButton source="header" variant="ghost" className="min-h-11 px-5 text-sm max-sm:hidden">
              WhatsApp
            </WhatsAppButton>
            <button
              ref={toggleRef}
              type="button"
              className="relative flex h-11 w-11 items-center justify-center lg:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setOpen((v) => !v)}
            >
              <span
                className={`absolute h-px w-6 bg-bone transition-transform duration-500 ease-[var(--ease-out-expo)] ${
                  open ? 'rotate-45' : '-translate-y-[4px]'
                }`}
              />
              <span
                className={`absolute h-px w-6 bg-bone transition-transform duration-500 ease-[var(--ease-out-expo)] ${
                  open ? '-rotate-45' : 'translate-y-[4px]'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={menuRef}
        id="menu-mobile"
        className="invisible fixed inset-0 z-[70] flex flex-col overflow-y-auto overscroll-contain bg-coffee pt-24 lg:hidden"
        style={{ clipPath: 'inset(0% 0% 100% 0%)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <nav aria-label="Menu principal" className="container-x flex-1">
          <ul className="border-t border-[var(--line)]">
            {navItems.map((item) => (
              <li key={item.href} className="overflow-hidden border-b border-[var(--line)]">
                <AnchorLink
                  href={item.href}
                  onNavigate={close}
                  className="flex items-baseline justify-between py-5 font-serif text-[2.6rem] leading-none"
                >
                  <span data-menu-link className="block">
                    {item.label}
                  </span>
                </AnchorLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="container-x space-y-6 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <div data-menu-foot>
            <WhatsAppButton source="menu" className="w-full" />
          </div>
          <OpenStatus className="text-parchment" />
          <div data-menu-foot className="flex flex-wrap items-center justify-between gap-4 text-sm text-parchment/80">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="link-line link-line--quiet">
              {business.address.street}, {business.address.city}
              <span className="sr-only">(abre o Google Maps; endereço completo: {fullAddress})</span>
            </a>
            <span className="flex items-center gap-5">
              <a
                href={business.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${instagramLabel}`}
              >
                <InstagramIcon />
              </a>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <WhatsAppIcon />
              </a>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
