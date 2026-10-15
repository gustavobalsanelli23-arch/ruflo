import { AnimatePresence, m } from 'framer-motion';
import { links, whatsappLink } from '../data/site';
import { useScrolled } from '../hooks/useScrolled';
import { InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { ease } from './ui/Reveal';

/**
 * Atalho de agendamento que aparece depois da primeira dobra: barra inferior
 * no celular e selo discreto no canto da tela no desktop.
 */
export function FloatingBooking() {
  const visible = useScrolled(640);

  return (
    <aside aria-label="Agendamento rápido">
      <AnimatePresence>
        {visible && (
          <>
            <m.div
              key="mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.6, ease }}
              className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-espresso/10 bg-cream/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden"
            >
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-dark flex-1 !min-h-12"
              >
                <WhatsAppIcon className="size-4" />
                Agendar horário
              </a>
              <a
                href={links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${links.instagramHandle}`}
                className="btn btn-outline !min-h-12 !px-4"
              >
                <InstagramIcon className="size-4" />
              </a>
            </m.div>

            <m.a
              key="desktop"
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.6, ease }}
              className="group fixed bottom-8 right-8 z-40 hidden items-center gap-3 bg-gold py-3.5 pl-4 pr-6 text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-espresso shadow-[0_20px_40px_-20px_rgb(22_16_12/0.6)] transition-colors duration-500 hover:bg-ivory md:flex"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-espresso/10 transition-colors group-hover:bg-gold/25">
                <WhatsAppIcon className="size-4" />
              </span>
              Agendar
            </m.a>
          </>
        )}
      </AnimatePresence>
    </aside>
  );
}
