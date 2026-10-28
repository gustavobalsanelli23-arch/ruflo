import type { ProductStock } from '@/lib/data/types';
import { formatCurrency, formatDays, formatPercent } from '@/lib/format';

interface CategoryStock {
  name: string;
  value: number;
  share: number;
  items: number;
  attention: number;
  coverage: number | null;
}

function byCategory(products: ProductStock[]): CategoryStock[] {
  const total = products.reduce((sum, p) => sum + p.stockValue, 0);
  const groups = new Map<string, ProductStock[]>();
  for (const product of products) groups.set(product.category, [...(groups.get(product.category) ?? []), product]);
  return [...groups.entries()]
    .map(([name, items]) => {
      const value = items.reduce((sum, p) => sum + p.stockValue, 0);
      const daily = items.reduce((sum, p) => sum + p.dailyUnits * (p.onHand > 0 ? p.stockValue / p.onHand : 0), 0);
      return {
        name,
        value,
        share: total > 0 ? value / total : 0,
        items: items.length,
        attention: items.filter((p) => p.status !== 'healthy').length,
        coverage: daily > 0 ? value / daily : null,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Where the money on the shelf sits: value at cost per category, with how long it lasts. */
export function StockByCategory({ products }: { products: ProductStock[] }) {
  const rows = byCategory(products);
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Valor em estoque, cobertura e itens em alerta por categoria</caption>
        <thead>
          <tr className="border-y text-xs text-muted-foreground">
            <th scope="col" className="h-9 pl-5 text-left font-medium">
              Categoria
            </th>
            <th scope="col" className="hidden h-9 px-3 font-medium sm:table-cell">
              <span className="sr-only">Participação no estoque, em barra</span>
            </th>
            <th scope="col" className="h-9 px-3 text-right font-medium">
              Valor a custo
            </th>
            <th scope="col" className="h-9 px-3 text-right font-medium">
              Cobertura
            </th>
            <th scope="col" className="h-9 pr-5 pl-3 text-right font-medium">
              Em alerta
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.name} className="transition-colors hover:bg-accent/60">
              <th scope="row" className="py-2.5 pl-5 text-left font-normal">
                <span className="block text-foreground">{row.name}</span>
                <span className="block text-xs text-subtle-foreground tabular">{formatPercent(row.share)} do estoque</span>
              </th>
              <td className="hidden w-[32%] px-3 sm:table-cell" aria-hidden="true">
                <span className="block h-2 rounded-r-[3px] bg-series-1" style={{ width: `${(row.value / max) * 100}%` }} />
              </td>
              <td className="px-3 text-right font-medium tabular text-foreground">{formatCurrency(row.value, { whole: true })}</td>
              <td className="px-3 text-right tabular text-muted-foreground">{row.coverage === null ? 'Sem venda' : formatDays(row.coverage)}</td>
              <td className="pr-5 pl-3 text-right tabular text-muted-foreground">
                {row.attention > 0 ? `${row.attention} de ${row.items}` : <span className="text-subtle-foreground">nenhum</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
