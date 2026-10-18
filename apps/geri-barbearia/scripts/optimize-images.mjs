#!/usr/bin/env node
// Gera as imagens otimizadas (AVIF + WebP, várias larguras) a partir das
// fotografias originais publicadas no Instagram oficial (@geri_barbearia).
//
// Uso: npm run images
// Os originais ficam em assets/instagram/ (ver assets/instagram/manifest.json).
// Todas recebem a mesma correção de cor, leve e quente, para que fotos tiradas
// em luzes diferentes conversem entre si sem perder a fidelidade do trabalho.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'instagram');
const OUT = join(root, 'public', 'images');
const MANIFEST = join(root, 'src', 'data', 'images.generated.json');

/** [chave usada no código, arquivo original] */
const PHOTOS = [
  ['freestyle-ring-light', 'desenho-freestyle-ring-light.jpg'],
  ['freestyle-navalha', 'degrade-freestyle-navalha.jpg'],
  ['desenho-raio', 'desenho-raio.jpg'],
  ['degrade-em-v', 'degrade-em-v.jpg'],
  ['degrade-em-v-desenho-1', 'degrade-em-v-desenho-1.jpg'],
  ['degrade-em-v-desenho-2', 'degrade-em-v-desenho-2.jpg'],
  ['corte-infantil', 'corte-infantil-1.jpg'],
  ['certificado', 'certificado-corte-na-tesoura.jpg'],
  ['fachada', 'fachada-novo-endereco.jpg'],
];

const WIDTHS = [480, 800, 1200, 1600];

/** Correção de cor da casa: menos saturação, leve aquecimento, contraste suave. */
function grade(pipeline) {
  return pipeline
    .modulate({ saturation: 0.84, brightness: 0.98 })
    .recomb([
      [1.04, 0.02, 0],
      [0.01, 1.0, 0.0],
      [0, 0.03, 0.9],
    ])
    .linear(1.06, -5);
}

const hex = (n) => n.toString(16).padStart(2, '0');

await mkdir(OUT, { recursive: true });
const manifest = {};

for (const [key, file] of PHOTOS) {
  const input = sharp(join(SRC, file)).rotate();
  const { width, height } = await input.metadata();
  const base = grade(input.clone());
  const widths = [...new Set([...WIDTHS.filter((w) => w < width), width])];

  for (const w of widths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 52, effort: 6 })
      .toFile(join(OUT, `${key}-${w}.avif`));
    await resized
      .clone()
      .webp({ quality: 78, effort: 6 })
      .toFile(join(OUT, `${key}-${w}.webp`));
  }

  const { dominant } = await base.clone().stats();
  manifest[key] = {
    width,
    height,
    widths,
    color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
  };
  console.log(`${key}: ${widths.join(', ')}`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifesto: ${MANIFEST}`);
