import { describe, expect, it } from 'vitest';
import { seedProducts } from '@/data/products';
import { collections } from '@/data/collections';
import { EMPTY_QUERY, inCollection, paramsFromQuery, queryCatalog, queryFromParams } from '@/lib/catalog';
import { findByRef, teamById } from '@/lib/product';

const published = seedProducts.filter((p) => p.status === 'published');

describe('coleções', () => {
  it('toda coleção tem capa existente e pelo menos um produto', () => {
    for (const c of collections) {
      expect(findByRef(seedProducts, c.cover), c.id).toBeDefined();
      expect(published.some((p) => inCollection(p, c.id)), c.id).toBe(true);
    }
  });

  it('Brasileirão traz apenas clubes brasileiros', () => {
    const list = published.filter((p) => inCollection(p, 'brasileirao'));
    expect(list.every((p) => p.category !== 'selecoes' && teamById(p.teamId)?.country === 'Brasil')).toBe(true);
  });

  it('filtro de coleção sobrevive à ida e volta pela URL', () => {
    const q = { ...EMPTY_QUERY, collections: ['retro' as const, 'infantis' as const] };
    expect(queryFromParams(paramsFromQuery(q)).collections).toEqual(['retro', 'infantis']);
    const results = queryCatalog(published, q);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => inCollection(p, 'retro') || inCollection(p, 'infantis'))).toBe(true);
  });
});

describe('busca', () => {
  it('encontra camisas pelo nome do jogador', () => {
    const results = queryCatalog(published, { ...EMPTY_QUERY, q: 'ronaldinho' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => /ronaldinho/i.test(p.name))).toBe(true);
  });

  it('encontra produtos pelo nome da coleção', () => {
    expect(queryCatalog(published, { ...EMPTY_QUERY, q: 'retrô' }).length).toBeGreaterThan(0);
  });
});
