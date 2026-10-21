import { business } from '../../data/site';

/** Dimensões do SVG vetorizado da logo original (public/brand/logo-barber-black.svg). */
export const LOGO_SIZE = { width: 1194, height: 1027 } as const;

type Props = { className?: string; decorative?: boolean; priority?: boolean };

/** Logo oficial: lettering gótico "Barber Black", vetorizado a partir do perfil do Instagram. */
export function Logo({ className, decorative, priority }: Props) {
  return (
    <img
      src="/brand/logo-barber-black.svg"
      alt={decorative ? '' : business.name}
      aria-hidden={decorative || undefined}
      width={LOGO_SIZE.width}
      height={LOGO_SIZE.height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
