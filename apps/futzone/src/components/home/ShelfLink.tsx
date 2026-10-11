import Link from 'next/link';
import { cn } from '@/lib/format';

/**
 * Ação do cabeçalho de seção, apoiada na linha da prateleira. Um único link
 * por seção (todas as larguras); o complemento invisível dá contexto ao
 * leitor de tela sem mudar o rótulo visível.
 */
export function ShelfLink({ href, context, label = 'Ver todos', className }: { href: string; context?: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center text-[0.74rem] font-bold uppercase tracking-[0.12em] text-fg underline decoration-line-strong underline-offset-[0.4em] transition-[color,text-decoration-color] duration-150 hover:decoration-fg active:opacity-70 focus-visible:rounded-[var(--radius-button)]',
        className,
      )}
    >
      {label}
      {context && <span className="sr-only"> {context}</span>}
    </Link>
  );
}
