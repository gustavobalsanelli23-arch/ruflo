'use client';

import { useMemo } from 'react';
import { usePublicProducts, useStoreData } from '@/context/StoreDataContext';
import { HeaderFigure } from './HeaderFigure';
import { productNoun, scopeProducts, type CatalogPreset } from './scope';

/**
 * Total de produtos publicados na vitrine. Os produtos do painel vivem no
 * navegador: até a hidratação mostra só um bloco de carregamento, para não
 * divergir do HTML do servidor.
 */
export function CatalogCount({ preset, variant = 'figure' }: { preset?: CatalogPreset; variant?: 'figure' | 'value' }) {
  const products = usePublicProducts();
  const { hydrated } = useStoreData();
  const total = useMemo(() => scopeProducts(products, preset).length, [products, preset]);

  if (!hydrated) {
    const block = <span aria-hidden className="skeleton inline-block h-[0.8em] w-[1.6em] translate-y-[0.06em] rounded-sm align-baseline" />;
    return variant === 'figure' ? <HeaderFigure value={block} label="produtos" /> : block;
  }
  return variant === 'figure' ? <HeaderFigure value={total} label={productNoun(total)} /> : <>{total}</>;
}
