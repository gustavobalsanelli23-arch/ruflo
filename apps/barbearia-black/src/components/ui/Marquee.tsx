type Props = { items: string[]; className?: string; reverse?: boolean };

/** Faixa corrida: duas cópias idênticas deslizando em loop (CSS puro, para no reduced-motion). */
export function Marquee({ items, className = '', reverse }: Props) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <li key={i} className="flex items-center">
          <span className="poster px-5 text-[clamp(1.75rem,4vw,3rem)] leading-none md:px-7">{item}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 md:size-5">
            <path d="M3 3l14 14M17 3 3 17" stroke="currentColor" strokeWidth="3.4" strokeLinecap="square" />
          </svg>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max" style={reverse ? { animationDirection: 'reverse' } : undefined}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
