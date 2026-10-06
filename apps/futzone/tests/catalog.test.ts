import { describe, expect, it } from 'vitest';
import { seedProducts } from '@/data/products';
import { EMPTY_QUERY, filterProducts, paramsFromQuery, queryCatalog, queryFromParams, sortProducts } from '@/lib/catalog';
import { isOnSale, productHref, stockFor } from '@/lib/product';

const published = seedProducts.filter((p) => p.status === 'published');

describe('catálogo', () => {
  it('cada produto tem id único e URL amigável única', () => {
    expect(new Set(seedProducts.map((p) => p.id)).size).toBe(seedProducts.length);
    expect(new Set(seedProducts.map(productHref)).size).toBe(seedProducts.length);
    expect(productHref(seedProducts[0])).toBe('/camisas/flamengo/camisa-flamengo-26-27');
  });

  it('busca por nome ignora acentos e caixa', () => {
    const r = filterProducts(published, { ...EMPTY_QUERY, q: 'SAO paulo' });
    expect(r.map((p) => p.teamId)).toEqual(['sao-paulo']);
  });

  it('busca com vários termos exige todos', () => {
    const r = filterProducts(published, { ...EMPTY_QUERY, q: 'flamengo retro' });
    expect(r).toHaveLength(1);
    expect(r[0].category).toBe('retro');
  });

  it('filtra por time, categoria, tamanho, preço e promoção', () => {
    expect(filterProducts(published, { ...EMPTY_QUERY, teams: ['brasil'] }).every((p) => p.teamId === 'brasil')).toBe(true);
    expect(filterProducts(published, { ...EMPTY_QUERY, categories: ['kits'] }).every((p) => p.category === 'kits')).toBe(true);
    const sized = filterProducts(published, { ...EMPTY_QUERY, sizes: ['XGG'] });
    expect(sized.length).toBeGreaterThan(0);
    expect(sized.every((p) => stockFor(p, 'XGG') > 0)).toBe(true);
    expect(filterProducts(published, { ...EMPTY_QUERY, price: 'ate-250' }).every((p) => p.price <= 25000)).toBe(true);
    expect(filterProducts(published, { ...EMPTY_QUERY, onSale: true }).every(isOnSale)).toBe(true);
  });

  it('ordena por preço e novidades', () => {
    const asc = sortProducts(published, 'preco-asc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const newest = sortProducts(published, 'novidades');
    expect(newest[0].createdAt >= newest[newest.length - 1].createdAt).toBe(true);
  });

  it('serializa a busca na URL e lê de volta', () => {
    const q = { ...EMPTY_QUERY, q: 'brasil', teams: ['brasil'], sizes: ['M' as const], price: '350-450', onSale: true, sort: 'preco-desc' as const };
    expect(queryFromParams(paramsFromQuery(q))).toEqual(q);
    expect(queryCatalog(published, q).every((p) => p.teamId === 'brasil')).toBe(true);
  });
});
