#!/usr/bin/env node
// Gera as imagens otimizadas (AVIF + WebP, várias larguras) a partir das
// fotografias reais da barbearia, guardadas em assets/fotos/.
//
// Uso: npm run images
// Origem de cada foto (post, data, legenda): assets/fotos/manifest.json.
// Cada arquivo de assets/fotos/ vira o espaço de foto com o mesmo nome
// (ex.: assets/fotos/hero.jpg → espaço "hero"; trabalho-03.jpg → "trabalho-03").
// Os nomes possíveis estão em src/data/content.ts (photos e works).
// Recortes opcionais ficam em CROPS (capas de reels costumam ter texto por cima).
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'fotos');
const OUT = join(root, 'public', 'images');
const MANIFEST = join(root, 'src', 'data', 'images.generated.json');

/** Recorte por espaço: { left, top, width, height } em pixels do original. */
const CROPS = {
  // 'trabalho-05': { left: 0, top: 0, width: 640, height: 960 },
};

/** A foto do hero ocupa até ~60% de uma tela larga: precisa de larguras maiores. */
const WIDTHS = { hero: [480, 800, 1200, 1600, 2000], default: [480, 800, 1200, 1600] };

/**
 * Ajuste leve e igual para todas (nada de retoque local): esquenta um pouco o
 * branco frio da luz de janela, em direção ao marrom e creme do emblema, com
 * contraste de cinema e cor um pouco contida.
 */
function grade(pipeline) {
  return pipeline
    .recomb([
      [1.03, 0.02, 0],
      [0, 1, 0],
      [0, 0.02, 0.9],
    ])
    .modulate({ saturation: 0.9 })
    .linear(1.06, -7);
}

const hex = (n) => n.toString(16).padStart(2, '0');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
// logo-perfil.jpg é só referência de paleta (100×100): não vira imagem do site.
const files = (await readdir(SRC).catch(() => [])).filter(
  (f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(extname(f)) && !f.startsWith('logo-'),
);
const manifest = {};

for (const file of files.sort()) {
  const key = parse(file).name;
  let input = sharp(join(SRC, file)).rotate();
  if (CROPS[key]) input = input.extract(CROPS[key]);
  const buffer = await input.toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  const base = grade(sharp(buffer));
  const ladder = WIDTHS[key] ?? WIDTHS.default;
  const widths = [...new Set([...ladder.filter((w) => w < width - 48), width])];

  for (const w of widths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' }).toFile(join(OUT, `${key}-${w}.avif`));
    await resized.clone().webp({ quality: 76, effort: 6 }).toFile(join(OUT, `${key}-${w}.webp`));
  }

  const { dominant } = await base.clone().stats();
  manifest[key] = { width, height, widths, color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}` };
  console.log(`${key}: ${width}×${height} → ${widths.join(', ')}`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(files.length ? `manifesto: ${MANIFEST}` : 'nenhuma foto em assets/fotos/ — o site usa as placas de espera');
