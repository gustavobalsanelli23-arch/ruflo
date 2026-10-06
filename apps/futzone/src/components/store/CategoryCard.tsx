import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CategoryArt, type CategoryArtId } from '@/components/brand/CategoryArt';

interface CategoryCardProps {
  id: CategoryArtId;
  title: string;
  description: string;
  href: string;
  count?: number;
}

export function CategoryCard({ id, title, description, href, count }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/60 hover:shadow-[0_24px_50px_-28px_var(--color-brand-500)]"
    >
      <div className="relative grid aspect-[5/4] place-items-center overflow-hidden bg-[radial-gradient(90%_80%_at_50%_100%,color-mix(in_oklab,var(--color-brand-500)_22%,transparent),transparent_70%)]">
        <div className="pitch-lines absolute inset-0 opacity-60" />
        <div className="grid h-full w-full place-items-center transition-transform duration-500 group-hover:scale-105">
          <CategoryArt id={id} />
        </div>
        {count !== undefined && (
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-fg-2 backdrop-blur">
            {count} {count === 1 ? 'modelo' : 'modelos'}
          </span>
        )}
      </div>
      <div className="flex flex-1 items-start gap-3 border-t border-line p-4">
        <div className="flex-1">
          <h3 className="heading-display text-xl transition-colors group-hover:text-brand-300 sm:text-2xl">{title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{description}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-fg-2 transition-all group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
