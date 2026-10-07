import Link from 'next/link';
import { cn } from '@/lib/format';

/**
 * Logo oficial FutZone (arquivos em /public/brand, fundo transparente).
 * - `wordmark`: só "FUTZONE" — cabeçalho, menu mobile e painel admin.
 * - `full`: bola + FUTZONE + "Camisas de time" — hero e rodapé.
 */
const VARIANTS = {
  wordmark: { src: '/brand/logo-wordmark.png', width: 480, height: 127 },
  full: { src: '/brand/logo-full.png', width: 900, height: 576 },
} as const;

interface LogoProps {
  variant?: keyof typeof VARIANTS;
  href?: string | null;
  className?: string;
  /** Classe de altura/largura da imagem (ex.: "h-7"). */
  imgClassName?: string;
  priority?: boolean;
}

export function Logo({ variant = 'wordmark', href = '/', className, imgClassName, priority }: LogoProps) {
  const v = VARIANTS[variant];
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={v.src}
      width={v.width}
      height={v.height}
      alt="FutZone — Camisas de time"
      fetchPriority={priority ? 'high' : undefined}
      className={cn('select-none', variant === 'wordmark' ? 'h-7 w-auto sm:h-8' : 'h-auto', imgClassName)}
      draggable={false}
    />
  );
  if (!href) return <span className={cn('inline-flex', className)}>{img}</span>;
  return (
    <Link href={href} className={cn('inline-flex shrink-0 transition-opacity hover:opacity-90', className)} aria-label="FutZone — página inicial">
      {img}
    </Link>
  );
}
