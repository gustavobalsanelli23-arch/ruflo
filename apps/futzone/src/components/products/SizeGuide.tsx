import type { Size } from '@/types/catalog';
import { adultSizeGuide, kidsSizeGuide } from '@/data/sizeGuide';
import { cn } from '@/lib/format';

type Cell = string | null;

/**
 * Tabela de tamanhos em aço, com emendas de 1px. O tamanho escolhido na
 * página vem marcado; medida que o fornecedor não informou aparece como
 * "não informado", nunca como um número inventado.
 */
export function SizeGuide({ kids, highlight }: { kids?: boolean; highlight?: Size | null }) {
  const head = kids ? ['Tamanho', 'Idade', 'Tórax (cm)', 'Comprimento (cm)'] : ['Tamanho', 'Tórax (cm)', 'Comprimento (cm)', 'Altura (m)'];
  const rows: Array<[Size, ...Cell[]]> = kids
    ? kidsSizeGuide.map((r) => [r.size, r.age, r.chest, r.length])
    : adultSizeGuide.map((r) => [r.size, r.chest, r.length, r.height]);
  const missing = rows.some(([, ...cells]) => cells.some((c) => !c));

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <thead className="bg-steel-2 text-left text-xs text-muted">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-3 align-bottom font-semibold sm:px-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line">
            {rows.map(([size, ...cells]) => {
              const mine = highlight === size;
              return (
                <tr key={size} className={cn('transition-colors duration-150', mine ? 'bg-brand-600/15' : 'hover:bg-steel-2/70')}>
                  <th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-bold tabular-nums text-fg sm:px-4">
                    {size}
                    {mine && <span className="ml-2 text-xs font-medium text-fg-2">seu tamanho</span>}
                  </th>
                  {cells.map((c, i) => (
                    <td key={i} className={cn('px-3 py-3 sm:px-4', c ? 'whitespace-nowrap tabular-nums text-fg-2' : 'text-xs text-muted')}>
                      {c ?? 'não informado'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {missing && <p className="border-t border-line px-3 py-3 text-xs text-fg-2 sm:px-4">O fornecedor ainda não informou as medidas destes tamanhos.</p>}
      <p className="border-t border-line px-3 py-3 text-xs text-muted sm:px-4">Medidas aproximadas da peça. Em caso de dúvida entre dois tamanhos, escolha o maior.</p>
    </div>
  );
}
