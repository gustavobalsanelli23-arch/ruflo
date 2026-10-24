import { describe, expect, it } from 'vitest';
import { type PhotoSlot, copy, monthYear, photos, services, workTitle, works } from '../src/data/content';
import { COLUMN_WEIGHTS, toColumns } from '../src/lib/gallery';
import { hasPhoto, ratioOf } from '../src/components/Picture';

const slots: PhotoSlot[] = [...Object.values(photos), ...works.map((w) => w.photo)];

describe('fotos', () => {
  it('cada espaço de foto tem id único e pauta', () => {
    const ids = slots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const slot of slots) {
      expect(slot.brief.length).toBeGreaterThan(10);
      expect(slot.ratio).toBeGreaterThan(0);
    }
  });

  it('foto real exige texto alternativo', () => {
    for (const slot of slots) {
      if (hasPhoto(slot)) expect(slot.alt?.length ?? 0).toBeGreaterThan(5);
    }
  });

  it('sem arquivo, a proporção é a da placa', () => {
    expect(ratioOf(photos.hero)).toBe(photos.hero.ratio);
  });
});

describe('galeria', () => {
  it('distribui todas as fotos, sem repetir e sem coluna vazia', () => {
    for (const count of [2, 3]) {
      const cols = toColumns(works, count);
      expect(cols).toHaveLength(count);
      expect(cols.every((c) => c.length > 0)).toBe(true);
      expect(cols.flat().map((w) => w.photo.id).sort()).toEqual(works.map((w) => w.photo.id).sort());
    }
  });

  it('as colunas ficam com alturas parecidas', () => {
    const count = 3;
    const weights = COLUMN_WEIGHTS[count];
    const heights = toColumns(works, count).map((col, c) =>
      col.reduce((h, w) => h + weights[c] / ratioOf(w.photo), 0),
    );
    const tallest = Math.max(...heights);
    expect(Math.min(...heights) / tallest).toBeGreaterThan(0.55);
  });

  it('título padrão numerado enquanto não houver legenda', () => {
    expect(workTitle(works[0], 0)).toBe('Trabalho 01');
    expect(workTitle({ ...works[0], title: 'Degradê' }, 0)).toBe('Degradê');
  });

  it('data por extenso em UTC', () => {
    expect(monthYear('2026-09-19')).toBe('setembro de 2026');
  });
});

describe('textos e serviços', () => {
  it('ênfases do manifesto estão pareadas', () => {
    expect(copy.manifesto.split('*').length % 2).toBe(1);
  });

  it('serviços com id único e sem preço inventado', () => {
    expect(new Set(services.map((s) => s.id)).size).toBe(services.length);
    for (const s of services) {
      expect(s.price).toBeUndefined();
      expect(s.duration).toBeUndefined();
    }
  });
});
