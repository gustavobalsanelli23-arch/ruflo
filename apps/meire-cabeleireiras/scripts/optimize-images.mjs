#!/usr/bin/env node
// Gera as imagens otimizadas (AVIF + WebP, várias larguras) a partir das
// fotografias publicadas no Instagram oficial (@meire.cabeleireiras).
//
// Uso: npm run images
// Os originais ficam em assets/instagram/ (ver assets/instagram/manifest.json).
// Cada foto pode ter um recorte: as capas de reels trazem moldura, colagem ou
// texto sobreposto, e o site usa só a fotografia do trabalho.
// A correção de cor é mínima de propósito: o tom do loiro é o próprio trabalho.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'instagram');
const OUT = join(root, 'public', 'images');
const MANIFEST = join(root, 'src', 'data', 'images.generated.json');

/**
 * [chave usada no código, arquivo original, recorte opcional { left, top, width, height }]
 * Para incluir uma foto nova: coloque o original em assets/instagram/, adicione
 * uma linha aqui e uma entrada em src/data/content.ts (galeria).
 */
const PHOTOS = [
  ['escova-modelada', 'escova-modelada.jpg'],
  // Sem a frase sobreposta no rodapé da capa.
  ['correcao-de-cor', 'correcao-de-cor.jpg', { left: 0, top: 0, width: 640, height: 930 }],
  // Só a foto de dentro da moldura em degradê.
  ['mechas-loiras', 'mechas-loiras-corte-degrade.jpg', { left: 68, top: 132, width: 524, height: 936 }],
  // Detalhe da textura, sem a frase sobreposta.
  ['loiro-manteiga', 'loiro-manteiga-corte-modelagem.jpg', { left: 0, top: 0, width: 640, height: 900 }],
  // Um dos quatro quadros da colagem (o único sem marca d'água).
  ['liso', 'liso.jpg', { left: 0, top: 570, width: 298, height: 566 }],
  // As duas fotos da colagem, separadas.
  ['bege-dourado', 'loiro-bege-dourado.jpg', { left: 70, top: 124, width: 410, height: 472 }],
  ['bege-dourado-costas', 'loiro-bege-dourado.jpg', { left: 262, top: 600, width: 330, height: 440 }],
];

const WIDTHS = [320, 480, 640];

/** Ajuste leve e igual para todas: flores menos saturadas, contraste suave. */
function grade(pipeline) {
  return pipeline.modulate({ saturation: 0.93 }).linear(1.03, -3);
}

const hex = (n) => n.toString(16).padStart(2, '0');

await mkdir(OUT, { recursive: true });
const manifest = {};

for (const [key, file, crop] of PHOTOS) {
  let input = sharp(join(SRC, file)).rotate();
  if (crop) input = input.extract(crop);
  const buffer = await input.toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  const base = grade(sharp(buffer));
  const widths = [...new Set([...WIDTHS.filter((w) => w < width - 48), width])];

  for (const w of widths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 50, effort: 6, chromaSubsampling: '4:2:0' })
      .toFile(join(OUT, `${key}-${w}.avif`));
    await resized
      .clone()
      .webp({ quality: 74, effort: 6 })
      .toFile(join(OUT, `${key}-${w}.webp`));
  }

  const { dominant } = await base.clone().stats();
  manifest[key] = {
    width,
    height,
    widths,
    color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
  };
  console.log(`${key}: ${width}×${height} → ${widths.join(', ')}`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifesto: ${MANIFEST}`);
