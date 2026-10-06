import type { CategoryId } from '@/types/catalog';
import { JerseyArt } from './JerseyArt';

export type CategoryArtId = CategoryId | 'promocoes';

/**
 * Ilustrações próprias da FutZone para os cards de categoria.
 * Usam a paleta da marca (azul + grafite), sem cores de clubes reais.
 */
export function CategoryArt({ id }: { id: CategoryArtId }) {
  const blue = 'var(--color-brand-500)';
  const deep = 'var(--color-brand-800)';
  const light = '#e9eef7';
  const dark = '#1b1f26';

  switch (id) {
    case 'clubes':
      return (
        <div className="relative h-full w-full">
          <JerseyArt primary={deep} secondary={light} className="absolute left-[4%] top-[14%] h-[74%] -rotate-12 opacity-70" />
          <JerseyArt primary={blue} secondary={light} className="absolute right-[6%] top-[6%] h-[86%] rotate-6" />
        </div>
      );
    case 'retro':
      return <JerseyArt primary={light} secondary={blue} cut="retro" className="h-[88%] -rotate-3 sepia-[.25]" />;
    case 'kits':
      return <JerseyArt primary={blue} secondary={dark} cut="kit" className="h-[92%]" />;
    case 'selecoes':
      return (
        <div className="relative grid h-full w-full place-items-center">
          <JerseyArt primary={light} secondary={blue} view="back" number="9" className="h-[86%]" />
          <svg viewBox="0 0 24 24" className="absolute right-[18%] top-[10%] size-8 text-brand-400" aria-hidden>
            <path fill="currentColor" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" />
          </svg>
        </div>
      );
    case 'femininas':
      return <JerseyArt primary={blue} secondary={light} cut="fitted" className="h-[88%] rotate-3" />;
    case 'promocoes':
      return (
        <div className="relative grid h-full w-full place-items-center">
          <JerseyArt primary={dark} secondary={blue} className="h-[80%] -rotate-6 opacity-80" />
          <span className="heading-display absolute bottom-[14%] right-[12%] rotate-[-8deg] rounded-lg bg-brand-500 px-3 py-1.5 text-3xl text-white shadow-xl">
            -%
          </span>
        </div>
      );
  }
}
