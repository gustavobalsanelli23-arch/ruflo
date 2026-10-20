import { describe, expect, it } from 'vitest';
import images from '../src/data/images.generated.json';
import {
  categories,
  filterWorks,
  latestPosts,
  monthYear,
  specialties,
  visibleCategories,
  works,
} from '../src/data/content';
import { toColumns } from '../src/lib/gallery';

describe('fotos', () => {
  it('toda foto usada existe no manifesto gerado por `npm run images`', () => {
    for (const key of [...works.map((w) => w.image), ...specialties.map((s) => s.image)]) {
      expect(images, key).toHaveProperty(key);
    }
  });

  it('todas têm texto alternativo descritivo e link para o post real', () => {
    for (const w of works) {
      expect(w.alt.length, w.image).toBeGreaterThan(20);
      expect(w.post).toMatch(/^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/$/);
      expect(w.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('não há fotos repetidas na galeria', () => {
    expect(new Set(works.map((w) => w.image)).size).toBe(works.length);
  });
});

describe('filtros da galeria', () => {
  it('mostra só categorias com pelo menos uma foto (sem filtro vazio)', () => {
    const visible = visibleCategories();
    expect(visible.every((c) => c.count > 0)).toBe(true);
    const ids = visible.map((c) => c.id);
    // Ainda não há fotos de ruivos nem de penteados: os filtros ficam escondidos.
    expect(ids).not.toContain('ruivos');
    expect(ids).not.toContain('penteados');
    expect(ids).toEqual(expect.arrayContaining(['loiros', 'mechas', 'cortes', 'escova']));
  });

  it('um filtro passa a aparecer assim que uma foto recebe a categoria', () => {
    const extra = [...works, { ...works[0], image: 'liso' as const, categories: ['ruivos' as const] }];
    expect(visibleCategories(extra).map((c) => c.id)).toContain('ruivos');
  });

  it('a ordem dos filtros segue a lista de categorias', () => {
    const order = categories.map((c) => c.id as string);
    const ids = visibleCategories().map((c) => c.id as string);
    expect([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(ids);
  });

  it('filtra por categoria e "todos" devolve tudo', () => {
    expect(filterWorks('todos')).toHaveLength(works.length);
    expect(filterWorks('mechas').every((w) => w.categories.includes('mechas'))).toBe(true);
    expect(filterWorks('ruivos')).toHaveLength(0);
  });
});

describe('colunas da galeria', () => {
  it.each([2, 3])('distribui todas as fotos em %i colunas, sem perder nem repetir', (count) => {
    const cols = toColumns(works, count);
    expect(cols).toHaveLength(count);
    const flat = cols.flat();
    expect(flat).toHaveLength(works.length);
    expect(new Set(flat.map((w) => w.image)).size).toBe(works.length);
    // Ordem de leitura preservada dentro de cada coluna.
    for (const col of cols) {
      const idx = col.map((w) => works.indexOf(w));
      expect(idx).toEqual([...idx].sort((a, b) => a - b));
    }
  });

  it('nenhuma coluna fica vazia quando há fotos suficientes', () => {
    expect(toColumns(works, 3).every((c) => c.length > 0)).toBe(true);
  });

  it('com poucas fotos, ocupa as primeiras colunas (sem coluna vazia no meio)', () => {
    const two = toColumns(works.slice(0, 2), 3);
    expect(two.map((c) => c.length)).toEqual([1, 1, 0]);
  });
});

describe('Instagram', () => {
  it('um card por post, do mais recente para o mais antigo', () => {
    const posts = latestPosts.map((p) => p.post);
    expect(new Set(posts).size).toBe(posts.length);
    const dates = latestPosts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('datas', () => {
  it('mês por extenso', () => {
    expect(monthYear('2026-09-19')).toBe('setembro de 2026');
    expect(monthYear('2026-03-01')).toBe('março de 2026');
  });
});
