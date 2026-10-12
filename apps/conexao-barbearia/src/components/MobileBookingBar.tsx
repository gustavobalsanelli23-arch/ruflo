import { AnimatePresence, m } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { links, whatsappLink } from '../data/site';
import { track } from '../lib/analytics';
import { WhatsAppIcon } from './ui/Icons';

/**
 * Barra fixa de agendamento para celulares: aparece depois da primeira dobra e
 * some quando o CTA final ou o rodapé (que já têm os mesmos botões) estão na tela.
 */
export function MobileBookingBar() {
  const [pastHero, setPastHero] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const targets = ['agendar', 'contato'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setCtaVisible(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));

    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const show = pastHero && !ctaVisible;

  return (
    <AnimatePresence>
      {show && (
        <m.div
          key="booking-bar"
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden"
        >
          <div className="flex gap-2">
            <a
              href={links.booking}
              target="_blank"
              rel="noopener"
              onClick={() => track('Schedule', { origem: 'barra-mobile' })}
              className="btn btn-gold min-h-12 flex-1"
            >
              Agendar horário
              <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener"
              onClick={() => track('Contact', { origem: 'barra-mobile' })}
              aria-label="Falar no WhatsApp"
              className="btn btn-ghost min-h-12 w-12 px-0"
            >
              <WhatsAppIcon className="size-5" />
            </a>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
