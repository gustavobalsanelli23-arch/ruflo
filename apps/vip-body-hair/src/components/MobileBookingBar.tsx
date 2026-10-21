import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { business } from '../data/site';
import { track } from '../lib/analytics';
import { Phone, WhatsApp } from './ui/Icons';
import { ease } from './ui/Reveal';
import { WhatsAppLink } from './ui/WhatsAppLink';

/**
 * Barra fixa de agendamento no celular: aparece depois da primeira dobra e some
 * quando o formulário de contato ou o rodapé estão na tela (já há CTAs ali).
 */
export function MobileBookingBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hideFor = new Set<Element>();
    const targets = ['contato', 'rodape'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    let pastHero = false;
    const update = () => setVisible(pastHero && hideFor.size === 0);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? hideFor.add(e.target) : hideFor.delete(e.target)));
        update();
      },
      { rootMargin: '0px 0px -30% 0px' },
    );
    targets.forEach((t) => io.observe(t));
    const onScroll = () => {
      pastHero = window.scrollY > window.innerHeight * 0.8;
      update();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-bone/10 bg-ink/95 backdrop-blur-lg md:hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="flex gap-2 p-3">
            <WhatsAppLink source="barra-movel" className="btn btn-light min-h-12 flex-1 px-4 text-[0.68rem]">
              <WhatsApp width={18} height={18} />
              Agendar horário
            </WhatsAppLink>
            <a
              href={business.phone.href}
              className="btn btn-outline-light min-h-12 w-12 px-0"
              aria-label={`Ligar para ${business.phone.display}`}
              onClick={() => track('Contact', { channel: 'telefone', source: 'barra-movel' })}
            >
              <Phone width={18} height={18} />
            </a>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
