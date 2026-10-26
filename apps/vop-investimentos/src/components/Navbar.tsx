import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { business, resolveChannel } from '../config/site';
import { nav } from '../data/content';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { EASE_OUT, SETTLE } from '../lib/motion';
import { InstagramIcon } from './Icons';
import { Logo } from './Logo';
import { Magnetic } from './Magnetic';

/** Seção visível no meio da tela (para marcar o link ativo). */
function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const ids = nav.map((n) => n.id);

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(ids);
  const reduce = useReducedMotion();
  // O foco circula entre o menu aberto e o cabeçalho (onde fica o botão de fechar).
  const trap = useRef<HTMLDivElement>(null);
  const channel = resolveChannel();
  const close = useCallback(() => setOpen(false), []);

  useScrollLock(open);
  useFocusTrap(trap, open, close);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fecha o menu ao passar para a tela larga (rotação do tablet, por exemplo).
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1280px)');
    const onChange = () => mql.matches && setOpen(false);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <div ref={trap}>
      <m.header
        data-reveal
        className="fixed inset-x-0 top-0 z-50"
        initial={{ y: -24, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)', ...SETTLE }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_OUT, delay: 0.15 }}
      >
        <div className="container-x pt-3 sm:pt-4">
          <nav
            aria-label="Principal"
            className={[
              'flex h-14 items-center justify-between rounded-full pl-5 pr-2 transition-colors duration-500 sm:pl-6',
              // Sobre o vídeo, vidro sutil; com a página rolando por baixo, vidro forte e véu.
              scrolled ? 'liquid-glass-strong glass-veil' : 'liquid-glass bg-night/20',
            ].join(' ')}
          >
            <a href="#inicio" className="rounded-full" aria-label={`${business.fullName}, voltar ao início`}>
              <span className="hidden sm:inline-flex">
                <Logo />
              </span>
              <span className="inline-flex sm:hidden">
                <Logo compact />
              </span>
            </a>

            <ul className="hidden items-center gap-1 xl:flex">
              {nav.map((item) => {
                const current = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={current ? 'location' : undefined}
                      className={[
                        'relative flex h-10 items-center rounded-full px-4 text-[0.9375rem] font-normal transition-colors duration-300',
                        current ? 'text-linen' : 'text-linen/75 hover:text-linen',
                      ].join(' ')}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={[
                          'absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-champagne transition-opacity duration-300',
                          current ? 'opacity-100' : 'opacity-0',
                        ].join(' ')}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex">
                <Magnetic>
                  <a href={channel.href} target="_blank" rel="noopener noreferrer" className="btn btn-solid h-10 min-h-0 px-5 text-[0.875rem]">
                    Fale com um especialista
                    <ArrowUpRight className="btn-icon" size={16} strokeWidth={1.6} aria-hidden="true" />
                  </a>
                </Magnetic>
              </span>
              <button
                type="button"
                className="liquid-glass flex size-10 items-center justify-center rounded-full xl:hidden"
                aria-expanded={open}
                aria-controls="menu-movel"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="sr-only">{open ? 'Fechar menu' : 'Abrir menu'}</span>
                <span aria-hidden="true" className="relative block h-3 w-[18px]">
                  <span
                    className={[
                      'absolute left-0 h-px w-full bg-linen transition-transform duration-500 ease-out',
                      open ? 'top-1/2 rotate-45' : 'top-0',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'absolute left-0 h-px w-full bg-linen transition-transform duration-500 ease-out',
                      open ? 'top-1/2 -rotate-45' : 'top-full',
                    ].join(' ')}
                  />
                </span>
              </button>
            </div>
          </nav>
        </div>
      </m.header>

      <AnimatePresence>
        {open && (
          <m.div
            id="menu-movel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-40 flex flex-col bg-night/90 pt-24 backdrop-blur-xl xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
          >
            <nav aria-label="Menu" className="container-x flex flex-1 flex-col">
              <ul className="flex flex-col">
                {nav.map((item, i) => (
                  <m.li
                    key={item.id}
                    className="border-b border-line"
                    initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', ...SETTLE }}
                    transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT, delay: 0.08 + i * 0.06 }}
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={close}
                      data-autofocus={i === 0 ? true : undefined}
                      aria-current={active === item.id ? 'location' : undefined}
                      className="display flex items-baseline justify-between py-4 text-[2.6rem] leading-none sm:text-5xl"
                    >
                      {item.label}
                      {active === item.id && <span aria-hidden="true" className="size-1.5 rounded-full bg-champagne" />}
                    </a>
                  </m.li>
                ))}
              </ul>
              <m.div
                className="mt-auto flex flex-col gap-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.4 }}
              >
                <a href={channel.href} target="_blank" rel="noopener noreferrer" className="btn btn-solid w-full" onClick={close}>
                  Fale com um especialista
                  <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
                </a>
                <a
                  href={business.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-2 text-sm text-mineral hover:text-linen"
                >
                  <InstagramIcon size={16} />@{business.instagram.handle}
                </a>
              </m.div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
