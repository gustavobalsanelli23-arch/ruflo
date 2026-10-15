import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { business, links, navItems, whatsapp, whatsappLink } from '../data/site';
import { useActiveSection } from '../hooks/useActiveSection';
import { useLockBody } from '../hooks/useLockBody';
import { useScrolled } from '../hooks/useScrolled';
import { InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { ease } from './ui/Reveal';
import { Wordmark } from './ui/Wordmark';

const ids = navItems.map((n) => n.id);

export function Header() {
  const scrolled = useScrolled(32);
  const active = useActiveSection(ids);
  const [open, setOpen] = useState(false);
  useLockBody(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header
        // Com o menu aberto, o cabeçalho fica acima do painel (z-55) para manter logo e botão de fechar visíveis.
        className={`fixed inset-x-0 top-0 transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-[var(--ease-editorial)] ${
          open ? 'z-[60]' : 'z-50'
        } ${scrolled && !open ? 'bg-cream/88 shadow-[0_1px_0_rgb(36_25_19/0.08)] backdrop-blur-md' : 'bg-transparent'}`}
      >
        <div
          className={`container-x flex items-center justify-between transition-[height] duration-500 ease-[var(--ease-editorial)] ${
            scrolled ? 'h-16 md:h-[4.5rem]' : 'h-[4.5rem] md:h-24'
          }`}
        >
          <a
            href="#inicio"
            aria-label={`${business.name} — voltar ao início`}
            className={`transition-colors duration-500 ${open ? 'text-ivory' : 'text-espresso'}`}
            onClick={() => setOpen(false)}
          >
            <Wordmark />
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={active === item.id ? 'true' : undefined}
                    className="group relative py-2 text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-espresso/75 transition-colors hover:text-espresso aria-[current]:text-espresso"
                  >
                    {item.label}
                    <span
                      className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-current transition-transform duration-500 ease-[var(--ease-editorial)] ${
                        active === item.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-dark hidden !min-h-11 !px-6 sm:inline-flex"
            >
              Agendar
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              className={`-mr-2 flex size-12 items-center justify-center lg:hidden ${
                open ? 'text-ivory' : 'text-espresso'
              }`}
            >
              <span
                className={`relative block h-3 transition-[width] duration-500 ${open ? 'w-6' : 'w-7'}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute left-0 h-px w-full bg-current transition-transform duration-500 ease-[var(--ease-editorial)] ${
                    open ? 'top-1/2 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute left-0 h-px bg-current transition-all duration-500 ease-[var(--ease-editorial)] ${
                    open ? 'top-1/2 w-full -rotate-45' : 'top-full w-4/6'
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
            className="fixed inset-0 z-[55] flex flex-col bg-espresso text-ivory lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.75, ease }}
          >
            <nav aria-label="Menu móvel" className="container-x flex flex-1 flex-col justify-center pt-20">
              <ul className="space-y-1">
                {navItems.map((item, i) => (
                  <li key={item.id} className="overflow-hidden">
                    <m.a
                      href={`#${item.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-5 py-2 font-display text-[clamp(2.75rem,12vw,4.5rem)] leading-none"
                      initial={{ y: '110%' }}
                      animate={{ y: '0%' }}
                      exit={{ y: '110%', transition: { duration: 0.3 } }}
                      transition={{ duration: 0.8, delay: 0.25 + i * 0.06, ease }}
                    >
                      <span className="font-sans text-[0.6875rem] tracking-[0.3em] text-gold">0{i + 1}</span>
                      {item.label}
                    </m.a>
                  </li>
                ))}
              </ul>
            </nav>
            <m.div
              className="container-x border-t border-ivory/12 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              <p className="eyebrow mb-4 text-ivory/60">{business.tagline}</p>
              <div className="flex flex-wrap gap-3">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-light flex-1">
                  <WhatsAppIcon className="size-4" /> {whatsapp.display}
                </a>
                <a
                  href={links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-light !px-5"
                  aria-label={`Instagram ${links.instagramHandle}`}
                >
                  <InstagramIcon className="size-4" />
                </a>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
