import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { bookingChannel, bookingHref, links } from '../data/site';
import { InstagramIcon, WhatsAppIcon } from './ui/Icons';

/**
 * Barra fixa de agendamento no mobile. Aparece depois da primeira dobra e some
 * quando a seção de agendamento ou o rodapé entram na tela (já têm os próprios botões).
 */
export function MobileBookingBar() {
  const [pastHero, setPastHero] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const targets = ['agendar', 'rodape'].map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setHidden(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const show = pastHero && !hidden;
  const BookIcon = bookingChannel === 'whatsapp' ? WhatsAppIcon : InstagramIcon;

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%' }}
          transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-chalk/15 bg-ink/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden"
        >
          <div className="flex gap-2">
            <a href={bookingHref()} target="_blank" rel="noopener" className="btn btn-chalk min-h-12 flex-1 shadow-none">
              <BookIcon className="size-5" />
              Agendar horário
            </a>
            <a
              href={links.instagram}
              target="_blank"
              rel="noopener"
              aria-label="Instagram da Barbearia Black"
              className="btn btn-line min-h-12 w-12 px-0"
            >
              <InstagramIcon className="size-5" />
            </a>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
