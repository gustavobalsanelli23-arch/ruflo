type Props = {
  className?: string;
  /** Exibe a linha "Hair · Barueri" abaixo do nome. */
  withLocation?: boolean;
};

/** Logotipo tipográfico: "Studio Sene" em serifa com o descritor em caixa-alta espaçada. */
export function Wordmark({ className = '', withLocation = true }: Props) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-display text-[1.65rem] tracking-[-0.01em]">
        Studio <em className="italic">Sene</em>
      </span>
      {withLocation && (
        <span className="mt-1 pl-[0.1em] text-[0.5625rem] font-medium uppercase tracking-[0.42em] opacity-70">
          Hair · Barueri
        </span>
      )}
    </span>
  );
}
