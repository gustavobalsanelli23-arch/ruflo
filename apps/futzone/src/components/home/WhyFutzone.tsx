import { Camera, Layers, RefreshCcw, Ruler } from 'lucide-react';
import { Reveal, stagger } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/Feedback';

/** Motivos para comprar — apenas fatos verdadeiros sobre o catálogo e a loja. */
export function WhyFutzone({ productCount, teamCount }: { productCount: number; teamCount: number }) {
  const items = [
    { icon: Layers, title: 'Catálogo completo', text: `${productCount} modelos de ${teamCount} times e seleções, do Brasileirão à Europa.` },
    { icon: Camera, title: 'Fotos reais', text: 'Cada camisa fotografada de verdade, em vários ângulos.' },
    { icon: Ruler, title: 'Do P ao 4GG', text: 'Grade completa de adulto e tamanhos infantis nos kits.' },
    { icon: RefreshCcw, title: 'Troca em até 7 dias', text: 'Direito de arrependimento garantido nas compras online.' },
  ];
  return (
    <section className="container-fz pt-20 sm:pt-28">
      <SectionHeading eyebrow="Por que a FutZone" title="Feita para quem vive o jogo" />
      <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={stagger(i, 70)} className="bg-bg p-6 sm:p-8">
            <Icon className="size-6 text-brand-400" strokeWidth={1.6} />
            <h3 className="mt-6 text-lg font-bold text-fg">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
