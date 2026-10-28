import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type Column } from '@/components/data/data-table';
import { Delta } from '@/components/data/delta';
import { MARGIN_BAND, PriorityMark, StatusBadge } from '@/components/data/status';

describe('Delta', () => {
  it('shows sign, direction and the comparison for screen readers', () => {
    render(<Delta value={0.006} />);
    const delta = screen.getByText('+0,6%').closest('span');
    expect(delta).toHaveClass('text-positive-text');
    expect(delta).toHaveTextContent('em relação ao período anterior');
  });

  it('marks a rise as bad when lower is better', () => {
    render(<Delta value={0.05} goodWhen="down" />);
    expect(screen.getByText('+5,0%').closest('span')).toHaveClass('text-critical-text');
  });

  it('explains when there is no base to compare', () => {
    render(<Delta value={null} />);
    expect(screen.getByText('Sem base de comparação')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('pairs the status colour with a written label', () => {
    render(<StatusBadge spec={MARGIN_BAND.negative} />);
    expect(screen.getByText('Negativa')).toBeInTheDocument();
  });
});

describe('PriorityMark', () => {
  it('always writes the priority, in full or short form', () => {
    const { rerender } = render(<PriorityMark priority="high" />);
    expect(screen.getByText('Prioridade alta')).toBeInTheDocument();
    rerender(<PriorityMark priority="medium" short />);
    expect(screen.getByText('Média')).toBeInTheDocument();
  });
});

interface Row {
  id: string;
  name: string;
  value: number;
}

const rows: Row[] = [
  { id: 'a', name: 'Azeite', value: 10 },
  { id: 'b', name: 'Banana', value: 30 },
  { id: 'c', name: 'Café', value: 20 },
];

const columns: Column<Row>[] = [
  { id: 'name', header: 'Produto', sortValue: (r) => r.name, cell: (r) => r.name },
  { id: 'value', header: 'Valor', align: 'right', sortValue: (r) => r.value, cell: (r) => String(r.value) },
];

function names() {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);
}

describe('DataTable', () => {
  it('sorts by a column and exposes aria-sort', async () => {
    const user = userEvent.setup();
    render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} caption="Teste" />);
    await user.click(screen.getByRole('button', { name: /Valor/ }));
    expect(names()).toEqual(['Banana', 'Café', 'Azeite']);
    expect(screen.getByRole('columnheader', { name: /Valor/ })).toHaveAttribute('aria-sort', 'descending');
    await user.click(screen.getByRole('button', { name: /Valor/ }));
    expect(names()).toEqual(['Azeite', 'Café', 'Banana']);
  });

  it('filters with counts, searches and offers a way out of an empty result', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        caption="Teste"
        searchText={(r) => r.name}
        filters={[
          { id: 'all', label: 'Todos', predicate: () => true },
          { id: 'big', label: 'Acima de 15', predicate: (r) => r.value > 15 },
        ]}
      />,
    );
    await user.click(screen.getByRole('radio', { name: /Acima de 15/ }));
    expect(names()).toEqual(['Banana', 'Café']);
    await user.type(screen.getByRole('searchbox'), 'azeite');
    expect(await screen.findByText('Nada encontrado com esses filtros')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(names()).toHaveLength(3);
  });

  it('reports filter changes when the filter is controlled (kept in the URL)', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        caption="Teste"
        filters={[
          { id: 'all', label: 'Todos', predicate: () => true },
          { id: 'big', label: 'Acima de 15', predicate: (r) => r.value > 15 },
        ]}
        filterValue="big"
        onFilterChange={onFilterChange}
      />,
    );
    expect(names()).toEqual(['Banana', 'Café']);
    await user.click(screen.getByRole('radio', { name: /Todos/ }));
    expect(onFilterChange).toHaveBeenCalledWith('all');
  });
});
