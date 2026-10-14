type Props = { index: string; children: string; tone?: 'light' | 'dark'; className?: string };

/** Rótulo de seção em estêncil: "[02] SOBRE ———". */
export function SectionLabel({ index, children, tone = 'light', className = '' }: Props) {
  const muted = tone === 'light' ? 'text-smoke' : 'text-ash';
  const strong = tone === 'light' ? 'text-chalk' : 'text-ink';
  const bar = tone === 'light' ? 'bg-chalk' : 'bg-ink';
  return (
    <p className={`tag flex items-center gap-3 ${muted} ${className}`}>
      <span className={strong}>[{index}]</span>
      {children}
      <span aria-hidden="true" className={`h-[3px] w-10 ${bar}`} />
    </p>
  );
}
