#!/usr/bin/env node
// Gera as imagens do site (AVIF + WebP, várias larguras) a partir de
// assets/fotos/. Cada arquivo vira o espaço de foto com o mesmo nome
// (assets/fotos/casa-contemporanea.jpg → espaço "casa-contemporanea").
// Os espaços usados pelo site estão em src/data/media.ts.
// Uso: npm run images  (depois de `npm run videos`, que extrai pôsteres e quadros)
//      npm run images -- casa-contemporanea hero-cidade   (só estes espaços)
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'fotos');
const OUT = join(root, 'public', 'images');
const MANIFEST = join(root, 'src', 'data', 'images.generated.json');

/** Imagens de tela cheia (pôsteres e fundos) precisam de larguras maiores. */
const FULL = /^(hero-|cta-|torre-|escada-)/;
const WIDTHS = { full: [640, 960, 1440, 1920, 2400], default: [480, 800, 1200, 1600, 2000] };

/** Recorte por espaço: { left, top, width, height } em pixels do original. */
const CROPS = {};

/**
 * Tratamento único para todas (nada de retoque local): cor contida, sombras
 * um pouco mais densas e um leve calor nos claros, na direção do champanhe.
 * Os pôsteres de vídeo já saem tratados do ffmpeg e não passam de novo.
 */
function grade(pipeline, key) {
  if (/^(hero-|cta-)/.test(key)) return pipeline;
  return pipeline
    .recomb([
      [1.02, 0.01, 0],
      [0, 1, 0],
      [0, 0.01, 0.95],
    ])
    .modulate({ saturation: 0.84 })
    .linear(1.05, -6);
}

const hex = (n) => n.toString(16).padStart(2, '0');

const only = new Set(process.argv.slice(2));
const partial = only.size > 0;
if (!partial) await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC).catch(() => [])).filter(
  (f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(extname(f)) && (!partial || only.has(parse(f).name)),
);
const manifest = partial ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};

for (const file of files.sort()) {
  const key = parse(file).name;
  if (partial) for (const old of await readdir(OUT)) if (old.startsWith(`${key}-`) && /^\d+\.\w+$/.test(old.slice(key.length + 1))) await rm(join(OUT, old));
  let input = sharp(join(SRC, file)).rotate();
  if (CROPS[key]) input = input.extract(CROPS[key]);
  const buffer = await input.toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  const base = grade(sharp(buffer), key);
  const ladder = FULL.test(key) ? WIDTHS.full : WIDTHS.default;
  // A maior versão nunca passa do topo da escada (o original pode ser maior).
  const top = Math.min(width, ladder[ladder.length - 1]);
  const widths = [...new Set([...ladder.filter((w) => w < top - 48), top])];

  for (const w of widths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 50, effort: 4, chromaSubsampling: '4:2:0' }).toFile(join(OUT, `${key}-${w}.avif`));
    await resized.clone().webp({ quality: 74, effort: 6 }).toFile(join(OUT, `${key}-${w}.webp`));
  }

  const { dominant } = await base.clone().stats();
  manifest[key] = { width, height, widths, color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}` };
  console.log(`${key}: ${width}×${height} → ${widths.join(', ')}`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`manifesto: ${MANIFEST}`);
