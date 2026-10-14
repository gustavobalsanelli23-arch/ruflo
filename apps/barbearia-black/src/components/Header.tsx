import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { bookingChannel, bookingHref, business, links, nav } from '../data/site';
import { useActiveSection } from '../hooks/useActiveSection';
import { useLockBody } from '../hooks/useLockBody';
import { useScrolled } from '../hooks/useScrolled';
import { ArrowUpRight, InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Logo } from './ui/Logo';

const sectionIds = nav.map((n) => n.id);
const ease = [0.22, 1, 0.36, 1] as const;

export function Header() {
  const scrolled = useScrolled(40);
  const active = useActiveSection(sectionIds);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useLockBody(open);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Fecha o menu mobile ao voltar para a largura de desktop.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const solid = scrolled || open;
  const BookIcon = bookingChannel === 'whatsapp' ? WhatsAppIcon : InstagramIcon;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 ${
          solid ? 'border-b-2 border-chalk/10 bg-ink/95' : 'border-b-2 border-transparent bg-transparent'
        }`}
      >
        <div className="container-x relative flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
          <a href="#inicio" className="relative z-10 shrink-0" aria-label={`${business.name} — voltar ao início`}>
            <Logo className="h-9 w-auto lg:h-10" />
          </a>

          <nav aria-label="Navegação principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((item, i) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`group relative flex items-baseline gap-1.5 px-3.5 py-2 text-[0.9375rem] font-extrabold uppercase tracking-[0.04em] stretch-75 transition-colors duration-300 ${
                        isActive ? 'text-chalk' : 'text-paper/60 hover:text-chalk'
                      }`}
                    >
                      <span className="font-mono text-[0.625rem] font-medium tracking-normal text-paper/40">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-3.5 -bottom-px h-[3px] origin-left bg-chalk transition-transform duration-500 ease-[var(--ease-snap)] ${
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={bookingHref()}
              target="_blank"
              rel="noopener"
              className="btn btn-chalk hidden min-h-11 px-5 text-[0.875rem] shadow-none sm:inline-flex"
            >
              <BookIcon className="size-4" />
              Agendar
            </a>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              className="relative z-10 -mr-2 flex size-12 items-center justify-center lg:hidden"
            >
              <span className="relative block h-3.5 w-7" aria-hidden="true">
                <span
                  className={`absolute left-0 h-[3px] w-7 bg-chalk transition-all duration-500 ease-[var(--ease-snap)] ${
                    open ? 'top-[5px] rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute right-0 h-[3px] bg-chalk transition-all duration-500 ease-[var(--ease-snap)] ${
                    open ? 'top-[5px] w-7 -rotate-45' : 'top-[11px] w-4'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <m.div
            id="menu-mobile"
            key="menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
            className="paper fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto lg:hidden"
          >
            <nav aria-label="Menu" className="container-x flex min-h-full flex-col pb-10 pt-6">
              <ul className="border-t-2 border-ink">
                {nav.map((item, i) => (
                  <m.li
                    key={item.id}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease }}
                    className="border-b-2 border-ink"
                  >
                    <a
                      ref={i === 0 ? firstLinkRef : undefined}
                      href={`#${item.id}`}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between py-3"
                    >
                      <span className="poster text-[clamp(3rem,15vw,5.5rem)] text-ink transition-transform duration-300 group-active:translate-x-2">
                        {item.label}
                      </span>
                      <span className="tag text-ash">{String(i + 1).padStart(2, '0')}</span>
                    </a>
                  </m.li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3 pt-10">
                <a href={bookingHref()} target="_blank" rel="noopener" className="btn btn-ink w-full">
                  <BookIcon className="size-5" />
                  Agendar horário
                </a>
                <a href={links.instagram} target="_blank" rel="noopener" className="btn btn-line-ink w-full">
                  <InstagramIcon className="size-5" />@{business.instagramHandle}
                  <ArrowUpRight className="btn-arrow size-4" />
                </a>
              </div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
