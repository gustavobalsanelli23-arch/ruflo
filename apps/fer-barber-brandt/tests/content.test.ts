import { describe, expect, it } from 'vitest';
import { type PhotoSlot, copy, monthYear, photos, services, transformations, workTitle, works } from '../src/data/content';
import { COLUMN_OFFSETS, COLUMN_WEIGHTS, toColumns } from '../src/lib/gallery';
import { hasPhoto, ratioOf } from '../src/components/Picture';

const slots: PhotoSlot[] = [
  ...Object.values(photos),
  ...works.map((w) => w.photo),
  ...transformations.flatMap((t) => [t.before, t.after]),
];

describe('fotos', () => {
  it('cada espaço de foto tem pauta, e cada lista tem ids únicos', () => {
    for (const list of [works.map((w) => w.photo), transformations.flatMap((t) => [t.before, t.after])]) {
      const ids = list.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
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

  it('todas as fotos do site são reais (há arquivo para cada espaço)', () => {
    const missing = slots.filter((s) => !hasPhoto(s)).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it('a proporção vem da foto real', () => {
    expect(ratioOf(photos.hero)).toBeCloseTo(1, 2);
    expect(ratioOf(photos.ambiente)).toBeCloseTo(640 / 1136, 2);
  });

  it('galeria e antes e depois apontam para posts reais, com data', () => {
    for (const item of [...works, ...transformations]) {
      expect(item.post).toMatch(/^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/$/);
      expect(item.date).toMatch(/^2026-\d{2}-\d{2}$/);
    }
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
    const offsets = COLUMN_OFFSETS[count];
    const heights = toColumns(works, count).map((col, c) =>
      col.reduce((h, w) => h + weights[c] / ratioOf(w.photo), weights[c] * offsets[c]),
    );
    const tallest = Math.max(...heights);
    expect(Math.min(...heights) / tallest).toBeGreaterThan(0.7);
  });

  it('título padrão numerado enquanto não houver legenda', () => {
    expect(workTitle({ photo: works[0].photo }, 0)).toBe('Trabalho 01');
    expect(workTitle(works[0], 0)).toBe('Degradê na zero');
  });

  it('data por extenso em UTC', () => {
    expect(monthYear('2026-09-19')).toBe('setembro de 2026');
  });
});

describe('textos e serviços', () => {
  it('ênfases do manifesto estão pareadas', () => {
    expect(copy.manifesto.split('*').length % 2).toBe(1);
  });

  it('serviços com id único, com fonte e sem preço inventado', () => {
    expect(new Set(services.map((s) => s.id)).size).toBe(services.length);
    for (const s of services) {
      expect(s.source.length).toBeGreaterThan(10);
      expect(s.price).toBeUndefined();
      expect(s.duration).toBeUndefined();
    }
  });
});
