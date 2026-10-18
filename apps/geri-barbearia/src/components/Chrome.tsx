import { useEffect, useRef, useState } from 'react';
import { WhatsAppButton } from './ui';

/**
 * Barra fixa de WhatsApp no celular: aparece depois do hero e some quando a
 * seção "Visite" (que já tem o botão grande) ou o rodapé estão na tela.
 */
export function MobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('topo');
    const targets = [document.getElementById('visite'), document.querySelector('footer')].filter(Boolean) as Element[];
    let pastHero = false;
    const covering = new Set<Element>();
    const update = () => setVisible(pastHero && covering.size === 0);

    const heroObserver = new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    const endObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? covering.add(e.target) : covering.delete(e.target)));
      update();
    });
    if (hero) heroObserver.observe(hero);
    targets.forEach((t) => endObserver.observe(t));
    return () => {
      heroObserver.disconnect();
      endObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--line)] bg-ink/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-700 ease-[var(--ease-out-expo)] md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!visible}
      inert={!visible}
    >
      <WhatsAppButton source="barra-mobile" className="min-h-12 w-full" />
    </div>
  );
}

/**
 * Indicador de rolagem em forma de poste de barbeiro (desktop): as listras
 * giram com a rolagem e o poste se preenche conforme a página avança.
 */
export function PoleProgress() {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (fill.current) {
        fill.current.style.transform = `scaleY(${progress})`;
        fill.current.style.backgroundPositionY = `${window.scrollY * 0.12}px`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 right-5 z-[50] hidden h-32 w-[7px] -translate-y-1/2 overflow-hidden rounded-full border border-gold/50 lg:block xl:right-7"
    >
      <div
        ref={fill}
        style={{ transform: 'scaleY(0)' }}
        className="h-full w-full origin-top bg-[repeating-linear-gradient(-35deg,var(--color-bone)_0_5px,var(--color-gold)_5px_10px,var(--color-wood)_10px_15px)] bg-size-[100%_30px]"
      />
    </div>
  );
}
