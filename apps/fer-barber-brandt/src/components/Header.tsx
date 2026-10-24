import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { business } from '../config/site';
import { EASE, gsap, lockScroll, prefersReducedMotion, setupGsap } from '../lib/motion';
import { InstagramIcon } from './icons';
import { BookingLink, InstagramLink, NAV, SectionLink } from './ui';

/** Assinatura tipográfica: FER (condensada) · barber (itálico) · BRANDT. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span translate="no" className={`inline-flex items-baseline gap-[0.28em] leading-none ${className}`}>
      <span className="font-extrabold tracking-[0.02em] uppercase font-stretch-[62%]">Fer</span>
      <span className="serif text-[1.08em] tracking-[-0.01em]">barber</span>
      <span className="font-extrabold tracking-[0.02em] uppercase font-stretch-[62%]">Brandt</span>
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
        className="label fixed top-3 left-3 z-[80] -translate-y-24 bg-osso px-5 py-3 text-carvao focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <header
        ref={bar}
        data-scrolled={scrolled || undefined}
        className="fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow] duration-700 ease-[var(--ease-out-expo)] data-[hidden]:-translate-y-full data-[scrolled]:bg-carvao/82 data-[scrolled]:shadow-[0_1px_0_var(--line-dark)] data-[scrolled]:backdrop-blur-md"
      >
        <div className="container-x flex h-[var(--header-h)] items-center justify-between gap-6">
          <SectionLink href="#topo" data-intro="nav" className="-ml-1 rounded-sm p-1 text-[1.3rem] lg:text-[1.45rem]">
            <Wordmark />
            <span className="sr-only">: voltar ao início</span>
          </SectionLink>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {NAV.map((item) => (
                <li key={item.href} data-intro="nav">
                  <SectionLink href={item.href} className="link-line link-quiet label text-[0.7rem]">
                    {item.label}
                  </SectionLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <BookingLink
              data-intro="nav"
              className="btn btn-ghost hidden min-h-11 px-5 text-[0.6875rem] lg:inline-flex"
              label="Agendar"
              arrow
              iconSize={15}
            />
            <button
              type="button"
              data-intro="nav"
              className="label flex h-11 items-center gap-3 pr-0.5 pl-3 text-[0.7rem] lg:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              onClick={() => setOpen(true)}
            >
              Menu
              <span aria-hidden="true" className="flex h-10 w-10 flex-col items-center justify-center gap-[6px] shadow-[inset_0_0_0_1px_var(--line-dark)]">
                <span className="h-px w-[18px] bg-osso" />
                <span className="h-px w-[18px] bg-osso" />
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
      tl.fromTo(el, { yPercent: -100 }, { yPercent: 0, duration: reduce ? 0 : 0.85, ease: EASE.inOut });
      tl.fromTo(el.querySelector('[data-menu-inner]'), { yPercent: 100 }, { yPercent: 0, duration: reduce ? 0 : 0.85, ease: EASE.inOut }, 0);
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
        yPercent: -100,
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
      className="invisible fixed inset-0 z-[60] overflow-hidden bg-grafite text-osso lg:hidden"
    >
      <div data-menu-inner className="flex h-full flex-col overflow-y-auto overscroll-contain">
        <div className="container-x flex h-[var(--header-h)] shrink-0 items-center justify-between">
          <span className="text-[1.3rem]">
            <Wordmark />
          </span>
          <button ref={closeBtn} type="button" onClick={onClose} className="label flex h-11 items-center gap-3 pr-0.5 pl-3 text-[0.7rem]">
            Fechar
            <span aria-hidden="true" className="relative flex h-10 w-10 items-center justify-center bg-osso">
              <span className="absolute h-px w-[18px] rotate-45 bg-carvao" />
              <span className="absolute h-px w-[18px] -rotate-45 bg-carvao" />
            </span>
          </button>
        </div>

        <nav aria-label="Menu" className="container-x flex flex-1 flex-col justify-center py-10">
          <ul>
            {[{ href: '#topo', label: 'Início' } as const, ...NAV, { href: '#agendar', label: 'Agendar' } as const].map((item, i) => (
              <li key={item.href} className="overflow-hidden border-b border-[var(--line-dark)]">
                <SectionLink
                  href={item.href}
                  onNavigate={onClose}
                  className="flex items-baseline justify-between py-2.5 text-[clamp(2.6rem,13vw,4.5rem)] leading-[0.95] font-extrabold uppercase font-stretch-[62%]"
                >
                  <span data-menu-line className="block">
                    {item.label}
                  </span>
                  <span data-menu-line aria-hidden="true" className="label block text-fumo tabular-nums">
                    0{i}
                  </span>
                </SectionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="container-x shrink-0 space-y-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div data-menu-fade>
            <BookingLink className="btn btn-light w-full" />
          </div>
          <div data-menu-fade className="flex items-center justify-between">
            <InstagramLink className="link-line link-quiet label text-[0.7rem] text-fumo">
              <InstagramIcon size={16} />@{business.instagram.handle}
            </InstagramLink>
            <ArrowUpRight size={16} strokeWidth={1.5} className="text-fumo" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
