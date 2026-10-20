import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { business } from '../config/site';
import { EASE, gsap, lockScroll, prefersReducedMotion, setupGsap } from '../lib/motion';
import { InstagramIcon } from './icons';
import { Lotus } from './Lotus';
import { BookingLink, NAV, SectionLink } from './ui';

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span translate="no" className={`inline-flex items-center gap-3 ${className}`}>
      <Lotus size={34} stroke={1.3} className="text-verde" />
      <span className="font-serif text-[1.3rem] leading-none font-normal tracking-[-0.01em]">
        Meire <span className="italic">Cabeleireiras</span>
      </span>
    </span>
  );
}

export function Header() {
  const bar = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Some ao rolar para baixo e volta ao rolar para cima (fora do topo).
  useEffect(() => {
    let last = window.scrollY;
    let hidden = false;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const shouldHide = y > window.innerHeight * 0.9 && y > last + 4;
      const shouldShow = y < last - 4 || y < window.innerHeight * 0.5;
      if (shouldHide && !hidden) hidden = true;
      else if (shouldShow && hidden) hidden = false;
      else {
        last = y;
        return;
      }
      bar.current?.toggleAttribute('data-hidden', hidden);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a
        href="#conteudo"
        className="fixed top-3 left-3 z-[80] -translate-y-24 rounded-full bg-floresta px-5 py-3 text-sm text-papel focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <header
        ref={bar}
        data-scrolled={scrolled || undefined}
        className="fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow] duration-700 ease-[var(--ease-out-expo)] data-[hidden]:-translate-y-full data-[scrolled]:bg-papel/88 data-[scrolled]:shadow-[0_1px_0_var(--line)] data-[scrolled]:backdrop-blur-md"
      >
        <div className="container-x flex h-[var(--header-h)] items-center justify-between gap-6">
          <SectionLink href="#topo" className="-ml-1 rounded-sm p-1">
            <Wordmark />
            <span className="sr-only">: voltar ao início</span>
          </SectionLink>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-9 text-[0.9375rem]">
              {NAV.map((item) => (
                <li key={item.href}>
                  <SectionLink href={item.href} className="link-line link-quiet">
                    {item.label}
                  </SectionLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <BookingLink className="btn btn-primary hidden min-h-11 px-5 text-[0.875rem] lg:inline-flex" label="Agendar" iconSize={17} />
            <button
              type="button"
              className="flex h-11 items-center gap-3 rounded-full pr-1 pl-4 text-[0.9375rem] lg:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              onClick={() => setOpen(true)}
            >
              Menu
              <span aria-hidden="true" className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full bg-floresta">
                <span className="h-px w-4 bg-papel" />
                <span className="h-px w-2.5 translate-x-[3px] bg-papel" />
              </span>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useLayoutEffect(() => {
    setupGsap();
    const el = root.current;
    if (!el) return;
    const reduce = prefersReducedMotion();
    if (open) {
      wasOpen.current = true;
      lockScroll(true);
      gsap.set(el, { visibility: 'visible' });
      const tl = gsap.timeline();
      tl.fromTo(
        el,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: reduce ? 0 : 0.9, ease: EASE.inOut },
      );
      tl.fromTo(
        el.querySelectorAll('[data-menu-line]'),
        { yPercent: reduce ? 0 : 110 },
        { yPercent: 0, duration: reduce ? 0 : 1, stagger: 0.06 },
        reduce ? 0 : 0.35,
      );
      tl.fromTo(
        el.querySelectorAll('[data-menu-fade]'),
        { autoAlpha: 0, y: reduce ? 0 : 12 },
        { autoAlpha: 1, y: 0, duration: reduce ? 0 : 0.8, stagger: 0.08 },
        reduce ? 0 : 0.6,
      );
      closeBtn.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      wasOpen.current = false;
      gsap.to(el, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: reduce ? 0 : 0.7,
        ease: EASE.inOut,
        onComplete: () => {
          gsap.set(el, { visibility: 'hidden' });
        },
      });
      lockScroll(false);
      document.querySelector<HTMLButtonElement>('button[aria-controls="menu-mobile"]')?.focus({ preventScroll: true });
    }
  }, [open]);

  // Esc fecha; Tab fica preso dentro do menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = [...(root.current?.querySelectorAll<HTMLElement>('a, button') ?? [])];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      ref={root}
      id="menu-mobile"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      className="invisible fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-floresta text-papel lg:hidden"
    >
      <div className="container-x flex h-[var(--header-h)] shrink-0 items-center justify-between">
        <span translate="no" className="inline-flex items-center gap-3">
          <Lotus size={34} stroke={1.3} className="text-rosa" />
          <span className="font-serif text-[1.3rem] leading-none">
            Meire <span className="italic">Cabeleireiras</span>
          </span>
        </span>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="flex h-11 items-center gap-3 rounded-full pr-1 pl-4 text-[0.9375rem]"
        >
          Fechar
          <span aria-hidden="true" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-papel">
            <span className="absolute h-px w-4 rotate-45 bg-floresta" />
            <span className="absolute h-px w-4 -rotate-45 bg-floresta" />
          </span>
        </button>
      </div>

      <nav aria-label="Menu" className="container-x flex flex-1 flex-col justify-center py-10">
        <ul className="space-y-1">
          {[{ href: '#topo', label: 'Início' } as const, ...NAV].map((item) => (
            <li key={item.href} className="overflow-hidden">
              <SectionLink
                href={item.href}
                onNavigate={onClose}
                className="block py-1 font-serif text-[clamp(2.6rem,11vw,4rem)] leading-[1.1] font-light"
              >
                <span data-menu-line className="block">
                  {item.label}
                </span>
              </SectionLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-x shrink-0 space-y-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div data-menu-fade className="hairline bg-[var(--line-light)]!" />
        <div data-menu-fade>
          <BookingLink className="btn btn-rose w-full" />
        </div>
        <a
          data-menu-fade
          href={business.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-champanhe"
        >
          <InstagramIcon size={18} />@{business.instagram.handle}
          <span className="sr-only">(abre o Instagram em nova aba)</span>
        </a>
      </div>
    </div>
  );
}
