import { adultSizeGuide, kidsSizeGuide } from '@/data/sizeGuide';

/** Tabela de tamanhos responsiva (rola horizontalmente em telas estreitas). */
export function SizeGuide({ kids }: { kids?: boolean }) {
  const head = kids ? ['Tamanho', 'Idade', 'Tórax (cm)', 'Comprimento (cm)'] : ['Tamanho', 'Tórax (cm)', 'Comprimento (cm)', 'Altura (m)'];
  const rows = kids
    ? kidsSizeGuide.map((r) => [r.size, r.age, r.chest, r.length])
    : adultSizeGuide.map((r) => [r.size, r.chest, r.length, r.height]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="bg-surface-2 text-left text-[0.7rem] uppercase tracking-wider text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([size, ...cells]) => (
            <tr key={size} className="transition-colors hover:bg-surface-2/60">
              <th scope="row" className="px-4 py-3 text-left font-bold text-brand-300">
                {size}
              </th>
              {cells.map((c, i) => (
                <td key={i} className="px-4 py-3 tabular-nums text-fg-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-3 text-xs text-muted">Medidas aproximadas da peça. Em caso de dúvida entre dois tamanhos, escolha o maior.</p>
    </div>
  );
}
