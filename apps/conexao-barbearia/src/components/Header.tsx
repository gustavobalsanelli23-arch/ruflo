import { AnimatePresence, m } from 'framer-motion';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { instagramHandle, links, nav, navExtra, units, whatsapp, whatsappLink } from '../data/site';
import { useActiveSection } from '../hooks/useActiveSection';
import { useLockBody } from '../hooks/useLockBody';
import { useScrolled } from '../hooks/useScrolled';
import { track } from '../lib/analytics';
import { InstagramIcon, WhatsAppIcon } from './ui/Icons';

const sectionIds = nav.map((n) => n.id);
const ease = [0.22, 1, 0.36, 1] as const;

export function Header() {
  const scrolled = useScrolled(32);
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

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          solid ? 'border-b border-line/80 bg-ink/90 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
        }`}
      >
        {/* Gradiente de leitura enquanto o header está transparente sobre a foto */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/70 to-transparent transition-opacity duration-500 ${
            solid ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <div
          className={`container-x relative flex items-center justify-between transition-[height] duration-500 ${
            scrolled ? 'h-16 lg:h-[4.5rem]' : 'h-16 lg:h-24'
          }`}
        >
          <a href="#inicio" className="relative z-10 shrink-0" aria-label="Conexão Barbearia — voltar ao início">
            <img
              src="/images/logo-conexao.webp"
              alt="Conexão Barbearia"
              width={450}
              height={109}
              className={`h-auto transition-[width] duration-500 ${scrolled ? 'w-[132px] lg:w-[150px]' : 'w-[140px] lg:w-[172px]'}`}
            />
          </a>

          <nav aria-label="Navegação principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {nav.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`group relative py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] transition-colors duration-300 ${
                        isActive ? 'text-bone' : 'text-bone/65 hover:text-bone'
                      }`}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-0.5 left-0 h-px bg-accent transition-all duration-500 ease-editorial ${
                          isActive ? 'w-full' : 'w-0 group-hover:w-full'
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={links.booking}
              target="_blank"
              rel="noopener"
              onClick={() => track('Schedule', { origem: 'header' })}
              className="btn btn-accent hidden min-h-11 px-5 text-[0.6875rem] sm:inline-flex"
            >
              Agendar horário
              <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              className="relative z-10 -mr-2 flex size-11 items-center justify-center lg:hidden"
            >
              <span className="relative block h-3 w-6" aria-hidden="true">
                <span
                  className={`absolute left-0 h-px w-6 bg-bone transition-all duration-500 ease-editorial ${
                    open ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute left-0 h-px bg-bone transition-all duration-500 ease-editorial ${
                    open ? 'top-1.5 w-6 -rotate-45' : 'top-3 w-4'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Fora do <header>: o backdrop-filter dele criaria um bloco de contenção para o menu fixo. */}
      <AnimatePresence>
        {open && (
          <m.div
            id="menu-mobile"
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-ink lg:hidden"
          >
            <nav aria-label="Menu" className="container-x flex min-h-full flex-col pb-10 pt-8">
              <ul className="border-t border-line">
                {[...nav, ...navExtra].map((item, i) => (
                  <m.li
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.05 + i * 0.04, ease }}
                    className="border-b border-line"
                  >
                    <a
                      ref={i === 0 ? firstLinkRef : undefined}
                      href={`#${item.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-5 py-4"
                    >
                      <span className="w-6 text-[0.6875rem] font-semibold tabular-nums tracking-[0.2em] text-accent">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-display text-[2rem] uppercase leading-none text-bone">{item.label}</span>
                    </a>
                  </m.li>
                ))}
              </ul>

              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease }}
                className="mt-auto grid gap-3 pt-10"
              >
                <a
                  href={links.booking}
                  target="_blank"
                  rel="noopener"
                  onClick={() => track('Schedule', { origem: 'menu-mobile' })}
                  className="btn btn-accent w-full"
                >
                  Agendar horário
                  <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
                </a>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener"
                  onClick={() => track('Contact', { origem: 'menu-mobile' })}
                  className="btn btn-ghost w-full"
                >
                  <WhatsAppIcon className="size-4" />
                  WhatsApp {whatsapp.display}
                </a>
                {links.instagram && (
                  <a
                    href={links.instagram}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Instagram da Conexão Barbearia: ${instagramHandle}`}
                    className="btn btn-ghost w-full"
                  >
                    <InstagramIcon className="size-4" />
                    Instagram
                  </a>
                )}
                <a href={links.subscription} target="_blank" rel="noopener" className="btn btn-ghost w-full">
                  Assinatura
                  <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
                </a>
                <ul className="mt-6 grid gap-3 text-sm text-bone/55">
                  {units.map((u) => (
                    <li key={u.id} className="flex gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                      <span>
                        <span className="text-bone/80">{u.shortName}</span> · {u.street} — {u.complement}
                      </span>
                    </li>
                  ))}
                </ul>
              </m.div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
