import Link from 'next/link';
import { cn } from '@/lib/format';

/**
 * Marca FUTZONE (versão tipográfica provisória).
 * Ao adicionar o arquivo oficial da logo em /public/brand, substitua o
 * conteúdo deste componente por <Image src="/brand/logo.svg" ... /> — todos os
 * lugares que exibem a marca usam este componente.
 */
export function Logo({ className, href = '/', compact }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="FutZone — página inicial">
      <span className="relative grid h-8 w-9 place-items-center" aria-hidden>
        <span className="absolute inset-0 -skew-x-12 rounded-md bg-brand-500 shadow-[0_6px_20px_-6px_var(--color-brand-500)] transition-transform duration-300 group-hover:-skew-x-[18deg]" />
        <span className="heading-display relative text-lg leading-none text-white">FZ</span>
      </span>
      {!compact && (
        <span className="heading-display text-[1.6rem] leading-none tracking-wide text-fg">
          FUT<span className="text-brand-400">ZONE</span>
        </span>
      )}
    </Link>
  );
}
