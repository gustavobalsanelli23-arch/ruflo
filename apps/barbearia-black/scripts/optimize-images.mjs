#!/usr/bin/env node
// Gera as imagens otimizadas do site (WebP/AVIF, ícones e Open Graph) a partir
// das fotografias originais publicadas no Instagram oficial (@theus_barbeiro_).
//
// Uso: npm run images
// Os originais ficam em assets-src/instagram/ (ignorado pelo git): capas dos
// reels e fotos dos carrosséis, salvas com o código da publicação no nome.
// A logo (public/brand/logo-barber-black.svg) foi vetorizada a partir da foto
// de perfil do mesmo Instagram; o script só a reaproveita para ícones e OG.
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets-src', 'instagram');
const OUT = join(root, 'public', 'images');
const PUBLIC = join(root, 'public');
const INK = { r: 11, g: 11, b: 11, alpha: 1 }; // #0b0b0b

/**
 * Fotografias reais: [nome de saída, arquivo original, recorte em frações (opcional)].
 * Capas de reel recebem uma margem de 2,5% para tirar os cantos arredondados do frame.
 */
const REEL = { left: 0.025, top: 0.02, width: 0.95, height: 0.96 };
const PHOTOS = [
  ['corte-freestyle-platinado', 'DdUKfGJhBYB-capa.jpg', REEL],
  ['corte-degrade-texturizado-perfil', 'DM3lmm-SiRA-2.jpg'],
  ['corte-degrade-nuca', 'DM3lmm-SiRA-3.jpg'],
  ['corte-degrade-frente', 'DM3lmm-SiRA-1.jpg'],
  ['corte-taper-nuca', 'DNLcVE5APer-1.jpg'],
  ['corte-taper-lateral', 'DNLcVE5APer-2.jpg'],
  ['corte-taper-ceu', 'DNLcVE5APer-3.jpg'],
  ['corte-freestyle-riscos', 'DPmpUE9AIYY-capa.jpg', REEL],
  ['corte-freestyle-texturizado', 'DXiX8CogFnr-capa.jpg', REEL],
  ['ambiente-cadeira-degrade', 'DOKRLeBgK6z-capa.jpg', REEL],
  // Matheus cortando: recorte abaixo do texto sobreposto ao reel.
  ['matheus-corte-infantil', 'DSlUSYKAD-H-capa.jpg', { left: 0.025, top: 0.25, width: 0.95, height: 0.73 }],
];

/** Miniaturas quadradas da seção Instagram: [código da publicação, arquivo original]. */
const FEED = [
  ['DdUKfGJhBYB', 'DdUKfGJhBYB-capa.jpg'],
  ['DXiX8CogFnr', 'DXiX8CogFnr-capa.jpg'],
  ['DPmpUE9AIYY', 'DPmpUE9AIYY-capa.jpg'],
  ['DOKRLeBgK6z', 'DOKRLeBgK6z-capa.jpg'],
  ['DNLcVE5APer', 'DNLcVE5APer-1.jpg'],
  ['DM3lmm-SiRA', 'DM3lmm-SiRA-1.jpg'],
];

async function load(file, crop) {
  const buf = await readFile(join(SRC, file));
  const img = sharp(buf).rotate();
  if (!crop) return img;
  const { width, height } = await img.metadata();
  return sharp(buf)
    .rotate()
    .extract({
      left: Math.round(width * crop.left),
      top: Math.round(height * crop.top),
      width: Math.round(width * crop.width),
      height: Math.round(height * crop.height),
    });
}

async function writeVariants(name, pipeline, widths, { avif = false } = {}) {
  const { width } = await sharp(await pipeline.clone().toBuffer()).metadata();
  const sizes = [...new Set(widths.map((w) => Math.min(w, width)))];
  for (const w of sizes) {
    const base = pipeline.clone().resize({ width: w, withoutEnlargement: true });
    await base.clone().webp({ quality: 78, effort: 6 }).toFile(join(OUT, `${name}-${w}.webp`));
    if (avif) await base.clone().avif({ quality: 50, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`));
  }
  const meta = await sharp(await pipeline.clone().resize({ width: sizes[sizes.length - 1] }).toBuffer()).metadata();
  return { name, widths: sizes, width: meta.width, height: meta.height };
}

/** Preto e branco de alto contraste, como xerox de pôster. */
const bw = (img) => img.grayscale().linear(1.18, -18).sharpen({ sigma: 0.6 });

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {};

  for (const [name, file, crop] of PHOTOS) {
    report[name] = await writeVariants(name, await load(file, crop), [480, 960]);
  }

  // Herói: recorte 4:5 do freestyle platinado, P&B pré-processado (sem filtro no navegador).
  const heroSrc = await load('DdUKfGJhBYB-capa.jpg', REEL);
  const { width: hw } = await sharp(await heroSrc.clone().toBuffer()).metadata();
  const heroCrop = sharp(await heroSrc.clone().toBuffer()).extract({ left: 0, top: 0, width: hw, height: Math.round(hw * 1.25) });
  report['hero-freestyle-pb'] = await writeVariants('hero-freestyle-pb', bw(heroCrop), [480, 800, 1100], { avif: true });

  for (const [code, file] of FEED) {
    // Materializa o quadrado antes: um segundo resize do sharp substituiria o primeiro.
    const square = await (await load(file, file.includes('capa') ? REEL : undefined))
      .resize(560, 560, { fit: 'cover', position: 'attention' })
      .toBuffer();
    report[`feed-${code}`] = await writeVariants(`feed-${code}`, sharp(square), [560]);
  }

  // Logo: PNG branco para o Open Graph e ícones a partir do "B" ornamentado.
  const logoSvg = await readFile(join(PUBLIC, 'brand', 'logo-barber-black.svg'));
  const logoPng = await sharp(logoSvg, { density: 144 }).resize({ width: 1200 }).png().toBuffer();

  // Monograma: só o "B" (metade esquerda da logo, antes do "arber"/"lack").
  const { width: lw, height: lh } = await sharp(logoPng).metadata();
  const mask = Buffer.from(
    `<svg width="${lw}" height="${lh}"><polygon points="0,0 ${Math.round(lw * 0.445)},0 ${Math.round(lw * 0.445)},${Math.round(lh * 0.4)} ${Math.round(lw * 0.5)},${Math.round(lh * 0.4)} ${Math.round(lw * 0.5)},${lh} 0,${lh}" fill="#fff"/></svg>`,
  );
  const monogram = await sharp(logoPng).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const monoTrim = await sharp(monogram).trim({ threshold: 1 }).png().toBuffer();
  await sharp(monoTrim).resize({ height: 400 }).png().toFile(join(OUT, 'monograma-b.png'));

  const icon = async (size, pad, file) => {
    const inner = Math.round(size * (1 - pad * 2));
    const mark = await sharp(monoTrim).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
      .composite([{ input: mark, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(join(PUBLIC, file));
  };
  await icon(32, 0.06, 'favicon-32.png');
  await icon(180, 0.14, 'apple-touch-icon.png');
  await icon(192, 0.14, 'icon-192.png');
  await icon(512, 0.14, 'icon-512.png');

  // Open Graph 1200×630: logo à esquerda, corte freestyle P&B à direita.
  const ogPhoto = await bw(sharp(await heroSrc.clone().toBuffer()))
    .resize(560, 630, { fit: 'cover', position: 'north' })
    .png()
    .toBuffer();
  const ogLogo = await sharp(logoPng).resize({ width: 470 }).png().toBuffer();
  const tape = Buffer.from(
    `<svg width="1200" height="630">` +
      `<rect x="640" y="0" width="560" height="630" fill="none" stroke="#ffffff" stroke-width="14"/>` +
      `<rect x="70" y="520" width="56" height="5" fill="#ffffff"/>` +
      `<text x="146" y="530" font-family="DejaVu Sans Mono, monospace" font-size="22" letter-spacing="4" fill="#ffffff">@THEUS_BARBEIRO_</text></svg>`,
  );
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: INK } })
    .composite([
      { input: ogPhoto, left: 640, top: 0 },
      { input: ogLogo, left: 70, top: 90 },
      { input: tape, left: 0, top: 0 },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(join(OUT, 'og-barbearia-black.jpg'));

  console.log(JSON.stringify(report, null, 1));
  console.log('Imagens geradas em public/images');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
