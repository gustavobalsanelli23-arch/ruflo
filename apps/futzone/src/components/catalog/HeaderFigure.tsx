/**
 * Número da prateleira, alinhado à direita da linha do cabeçalho: o dado
 * (quantos produtos, quantos times) em algarismos display, a unidade em cinza.
 * Sem 'use client': serve tanto ao servidor quanto ao CatalogCount.
 */
export function HeaderFigure({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <p className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="heading-display text-[2rem] tabular-nums text-fg sm:text-[2.5rem]">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </p>
  );
}
