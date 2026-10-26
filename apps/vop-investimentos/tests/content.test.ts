import { describe, expect, it } from 'vitest';
import { about, hero, investments, nav, pendingContent, regions, services } from '../src/data/content';
import { heroClips, photos, videoSources } from '../src/data/media';
import { catalog, demoProperties } from '../src/data/properties';
import images from '../src/data/images.generated.json';
import {
  defaultFilters,
  filterOptions,
  filterProperties,
  formatArea,
  formatPrice,
  interestMessage,
  isFiltered,
  isWide,
  specs,
} from '../src/lib/catalog';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');

describe('textos do briefing', () => {
  it('mantém as frases pedidas', () => {
    expect(hero.headline.join(' ')).toBe('Mais do que encontrar imóveis. Construir patrimônio.');
    expect(about.title.join(' ')).toBe('Relacionamentos construídos sobre confiança. Patrimônio construído com estratégia.');
    expect(investments.title.join(' ')).toBe('Decisões inteligentes começam com uma visão além do presente.');
    expect(investments.pillars.map((p) => p.title)).toEqual(['Análise estratégica', 'Inteligência de mercado', 'Segurança na operação']);
  });

  it('menu na ordem pedida', () => {
    expect(nav.map((n) => n.label)).toEqual(['Início', 'Imóveis', 'Investimentos', 'Sobre', 'Contato']);
  });

  it('não promete rentabilidade nem inventa números', () => {
    const all = JSON.stringify({ hero, services, investments, regions, about });
    expect(all).not.toMatch(/garantid|rentabilidade de|\d+ anos|\d+\s?%|clientes satisfeitos|milhões em/i);
    expect(about.foundedYear).toBeNull();
    expect(about.history).toEqual([]);
  });

  it('o que vem do briefing aparece como pendência até ser confirmado', () => {
    expect(services.confirmed).toBe(false);
    expect(regions.confirmed).toBe(false);
    expect(pendingContent()).toEqual(expect.arrayContaining(['serviços (vindos do briefing)', 'regiões de atuação (vindas do briefing)']));
  });
});

describe('mídia', () => {
  it('toda foto usada tem versões geradas e texto alternativo', () => {
    for (const slot of Object.values(photos)) {
      const m = (images as Record<string, { widths: number[] }>)[slot.id];
      expect(m, slot.id).toBeTruthy();
      expect(slot.alt.length).toBeGreaterThan(10);
      for (const w of m.widths) {
        expect(existsSync(join(root, 'public', 'images', `${slot.id}-${w}.avif`)), `${slot.id}-${w}.avif`).toBe(true);
        expect(existsSync(join(root, 'public', 'images', `${slot.id}-${w}.webp`)), `${slot.id}-${w}.webp`).toBe(true);
      }
    }
  });

  it('todo clipe tem as versões paisagem e retrato', () => {
    for (const clip of heroClips) {
      for (const o of ['landscape', 'portrait'] as const) {
        expect(existsSync(join(root, 'public', videoSources(clip, o))), videoSources(clip, o)).toBe(true);
      }
    }
  });
});

describe('catálogo', () => {
  it('imóveis demonstrativos são marcados como tal', () => {
    expect(catalog.demo).toBe(true);
    expect(demoProperties.every((p) => p.demo && p.code.startsWith('EX-'))).toBe(true);
  });

  it('ids e códigos únicos; regiões existem; percurso com ao menos dois ambientes', () => {
    expect(new Set(demoProperties.map((p) => p.id)).size).toBe(demoProperties.length);
    expect(new Set(demoProperties.map((p) => p.code)).size).toBe(demoProperties.length);
    const names = regions.items.map((r) => r.name);
    for (const p of demoProperties) {
      expect(names).toContain(p.location.region);
      expect(p.rooms.length).toBeGreaterThanOrEqual(2);
      for (const room of p.rooms) {
        expect(room.name.length).toBeGreaterThan(2);
        expect((images as Record<string, unknown>)[room.photo.id], room.photo.id).toBeTruthy();
        for (const h of room.hotspots ?? []) {
          expect(h.x).toBeGreaterThanOrEqual(0);
          expect(h.x).toBeLessThanOrEqual(100);
          expect(h.y).toBeGreaterThanOrEqual(0);
          expect(h.y).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('filtra por finalidade, tipo, região e faixa de preço', () => {
    const list = demoProperties;
    expect(filterProperties(list, defaultFilters)).toHaveLength(list.length);
    expect(filterProperties(list, { ...defaultFilters, purpose: 'investir' }).map((p) => p.code)).toEqual(['EX-02', 'EX-04', 'EX-05']);
    expect(filterProperties(list, { ...defaultFilters, type: 'Casa' }).every((p) => p.type === 'Casa')).toBe(true);
    expect(filterProperties(list, { ...defaultFilters, region: 'Barueri' }).map((p) => p.code)).toEqual(['EX-03', 'EX-05']);
    expect(filterProperties(list, { ...defaultFilters, price: 'ate-2' }).map((p) => p.code)).toEqual(['EX-05']);
    expect(filterProperties(list, { ...defaultFilters, price: '2-a-5' }).map((p) => p.code)).toEqual(['EX-03', 'EX-04']);
    expect(filterProperties(list, { ...defaultFilters, price: 'acima-5' }).map((p) => p.code)).toEqual(['EX-01']);
    expect(filterProperties(list, { ...defaultFilters, price: 'consulta' }).map((p) => p.code)).toEqual(['EX-02']);
    expect(filterProperties(list, { purpose: 'investir', type: 'Casa', region: 'Barueri', price: 'todas' })).toEqual([]);
  });

  it('só oferece filtros que separam alguma coisa', () => {
    const all = filterOptions(demoProperties);
    expect(all.show).toEqual({ purpose: true, type: true, region: true, price: true });
    const one = filterOptions([demoProperties[0]]);
    expect(one.show).toEqual({ purpose: false, type: false, region: false, price: false });
    expect(all.types).toEqual(['Apartamento', 'Casa', 'Cobertura']);
  });

  it('isFiltered e o ritmo da grade', () => {
    expect(isFiltered(defaultFilters)).toBe(false);
    expect(isFiltered({ ...defaultFilters, region: 'Alphaville' })).toBe(true);
    expect([0, 1, 2, 3, 4].map((i) => isWide(i, 5))).toEqual([true, false, false, true, true]);
    expect([0, 1, 2, 3].map((i) => isWide(i, 4))).toEqual([true, false, false, true]);
    expect([0, 1].map((i) => isWide(i, 2))).toEqual([true, true]);
  });

  it('formata valores, áreas e ficha', () => {
    expect(formatPrice(7_900_000)).toBe('R$ 7.900.000');
    expect(formatPrice(null)).toBe('Sob consulta');
    expect(formatArea(1200)).toBe('1.200 m²');
    expect(specs(demoProperties[2])).toEqual([
      { label: 'Área', value: '380 m²' },
      { label: 'Dormitórios', value: '4 (3 suítes)' },
      { label: 'Vagas', value: '4' },
    ]);
    expect(interestMessage(demoProperties[0])).toContain('EX-01');
  });
});
