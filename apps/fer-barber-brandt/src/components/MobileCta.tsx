import { useEffect, useState } from 'react';
import { BookingLink } from './ui';

/**
 * Barra de agendamento fixa no celular: aparece depois do hero e sai de cena
 * quando a seção de agendamento ou o rodapé já estão na tela.
 */
export function MobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('topo');
    const blockers = [document.getElementById('agendar'), document.querySelector('footer')].filter(Boolean) as Element[];
    if (!hero) return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target, e.isIntersecting));
        const heroVisible = seen.get(hero) ?? true;
        const blocked = blockers.some((b) => seen.get(b));
        setVisible(!heroVisible && !blocked);
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    [hero, ...blockers].forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      data-visible={visible || undefined}
      aria-hidden={!visible}
      inert={!visible}
      className="fixed inset-x-0 bottom-0 z-40 translate-y-full px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-700 ease-[var(--ease-out-expo)] data-[visible]:translate-y-0 lg:hidden"
    >
      <BookingLink className="btn btn-gold mx-auto flex w-full max-w-md shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]" />
    </div>
  );
}
