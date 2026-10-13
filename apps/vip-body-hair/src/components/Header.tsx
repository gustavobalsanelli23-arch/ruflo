import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { address, hours, links, logo, nav, whatsapp } from '../data/site';
import { useActiveSection } from '../hooks/useActiveSection';
import { useLockBody } from '../hooks/useLockBody';
import { useScrolled } from '../hooks/useScrolled';
import { ArrowUpRight, Instagram, WhatsApp } from './ui/Icons';
import { ease } from './ui/Reveal';
import { WhatsAppLink } from './ui/WhatsAppLink';

const ids = nav.map((n) => n.id);

export function Header() {
  const scrolled = useScrolled(40);
  const active = useActiveSection(ids);
  const [open, setOpen] = useState(false);
  useLockBody(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled && !open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,color,border-color,backdrop-filter] duration-700 ease-[var(--ease-lux)] ${
          solid ? 'border-b border-ink/10 bg-paper/85 text-ink backdrop-blur-xl' : 'border-b border-transparent text-bone'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:h-20 md:px-10">
          <a href="#topo" className="group flex items-center gap-3.5" aria-label="VIP body & hair — início">
            <span className="relative block h-9 w-[29px] md:h-10 md:w-[32px]">
              <img
                src={logo.monoWhite.src}
                width={logo.monoWhite.width}
                height={logo.monoWhite.height}
                alt=""
                className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${solid ? 'opacity-0' : 'opacity-100'}`}
              />
              <img
                src={logo.monoInk.src}
                width={logo.monoInk.width}
                height={logo.monoInk.height}
                alt=""
                className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${solid ? 'opacity-100' : 'opacity-0'}`}
              />
            </span>
            <span className="hidden h-6 w-px bg-current opacity-25 sm:block" aria-hidden />
            <span className="eyebrow hidden text-[0.625rem] sm:block">body &amp; hair</span>
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {nav.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={active === item.id ? 'true' : undefined}
                    className={`eyebrow link-line pb-1 text-[0.65rem] transition-opacity duration-300 ${
                      active === item.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={active === item.id ? { backgroundSize: '100% 1px' } : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <WhatsAppLink
              source="header"
              className={`btn hidden min-h-11 px-5 text-[0.65rem] sm:inline-flex ${solid ? 'btn-outline-dark' : 'btn-outline-light'}`}
            >
              Agendar
            </WhatsAppLink>
            <button
              type="button"
              className="relative -mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls="menu-mobile"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="relative block h-3 w-6" aria-hidden>
                <span
                  className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-500 ease-[var(--ease-lux)] ${
                    open ? 'translate-y-1.5 rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-px bg-current transition-all duration-500 ease-[var(--ease-lux)] ${
                    open ? 'w-full -translate-y-1.5 -rotate-45' : 'w-2/3'
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
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="grain fixed inset-0 z-40 flex flex-col bg-ink text-bone lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.8, ease }}
          >
            <nav aria-label="Menu móvel" className="flex flex-1 flex-col justify-center px-6 pt-20">
              <ul className="space-y-1">
                {nav.map((item, i) => (
                  <li key={item.id} className="overflow-hidden">
                    <m.a
                      href={`#${item.id}`}
                      onClick={() => setOpen(false)}
                      className="display flex items-baseline gap-4 py-2 text-[2.6rem] xs:text-5xl"
                      initial={{ y: '110%' }}
                      animate={{ y: '0%' }}
                      transition={{ duration: 0.9, delay: 0.25 + i * 0.07, ease }}
                    >
                      <span className="font-sans text-xs tracking-[0.2em] text-honey">0{i + 1}</span>
                      {item.label}
                    </m.a>
                  </li>
                ))}
              </ul>
            </nav>
            <m.div
              className="safe-bottom space-y-6 border-t border-bone/10 px-6 pb-8 pt-7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <WhatsAppLink source="menu" className="btn btn-light w-full" onClick={() => setOpen(false)}>
                <WhatsApp width={18} height={18} /> Agendar pelo WhatsApp
              </WhatsAppLink>
              <div className="flex items-end justify-between gap-6 text-sm text-mist">
                <p>
                  {address.street} · {address.district}
                  <br />
                  {hours.short}
                </p>
                <a
                  href={links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-bone"
                  aria-label={`Instagram ${links.instagramHandle}`}
                >
                  <Instagram /> <ArrowUpRight width={14} height={14} />
                </a>
              </div>
              <p className="sr-only">WhatsApp {whatsapp.display}</p>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
