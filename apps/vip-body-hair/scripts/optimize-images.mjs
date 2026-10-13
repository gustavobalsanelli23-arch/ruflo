#!/usr/bin/env node
// Gera as imagens otimizadas (WebP/AVIF), logotipos, ícones e a imagem Open
// Graph do site a partir dos originais oficiais da VIP body & hair.
//
// Uso: npm run images
//
// Os originais ficam em assets-src/ (ignorado pelo git). Procedência:
// - logo-vip-original.png ........ logo.png de vipbodyhair.com.br
// - honey-blonde-{1,2,3}.jpg ..... post DeSla1ojkNT do @vipbodyhair (honey blonde)
// - ricky-moica-retrato.jpg ...... post DeKEQmqkX-j do @rickymoica (Wella, 2026)
// - maquiagem-editorial.jpg ...... capa do reel DeQFsrfOE0K do @vipbodyhair
// - bar-shakes.jpg ............... post DeKK2utuOwM do @vipbodyhair (shakes)
// - penteado-salao.jpg ........... post DeMzM5hkdgo do @vipbodyhair (penteado)
// - frame-*.png .................. quadros do reel DeUqVBoPl1o do @vipbodyhair
//                                  ("Nosso mood de sábado"), gravado no salão
import { mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets-src');
const OUT = join(root, 'public', 'images');
const PUBLIC = join(root, 'public');

const INK = { r: 15, g: 14, b: 12 }; // #0F0E0C
const INK_RGB = [15, 14, 12];

/**
 * Fotografias: [saída, original, recorte (opcional), larguras, avif?].
 * Recorte = { left, top, width, height } em pixels do original.
 */
const PHOTOS = [
  // Herói — honey blonde (resultado real publicado pelo salão).
  ['honey-blonde', 'honey-blonde-1.jpg', null, [480, 800, 1200], true],
  ['honey-blonde-luz', 'honey-blonde-2.jpg', null, [480, 800]],
  ['honey-blonde-perfil', 'honey-blonde-3.jpg', null, [480, 800]],
  // Diretor criativo (retrato 4:5).
  ['ricky-moica', 'ricky-moica-retrato.jpg', { left: 120, top: 680, width: 2160, height: 2700 }, [480, 800, 1100]],
  // Quadros do salão (720×1280 → 4:5 ou 9:16).
  ['salao-interior', 'frame-salao-interior.png', { left: 0, top: 170, width: 720, height: 900 }, [480, 720], true],
  ['salao-interior-alto', 'frame-salao-interior.png', null, [480, 720]],
  ['coloracao-mechas', 'frame-coloracao-mechas.png', { left: 0, top: 130, width: 720, height: 900 }, [480, 720]],
  ['spa-capilar', 'frame-spa-capilar.png', { left: 0, top: 260, width: 720, height: 900 }, [480, 720]],
  ['corte-preto-e-branco', 'frame-corte-pb.png', null, [480, 720]],
  ['corte-franja-resultado', 'frame-franja-resultado.png', { left: 0, top: 60, width: 720, height: 900 }, [480, 720]],
  ['corte-curto-resultado', 'frame-corte-curto-resultado.png', { left: 0, top: 110, width: 720, height: 900 }, [480, 720]],
  ['corte-consultoria', 'frame-corte-consultoria.png', { left: 0, top: 140, width: 720, height: 900 }, [480, 720]],
  ['diretor-criativo-atendimento', 'frame-diretor-criativo-acao.png', null, [480, 720]],
  ['ferramentas', 'frame-ferramentas.png', { left: 0, top: 220, width: 720, height: 900 }, [480, 720]],
  ['cafe-menu', 'frame-cafe.png', { left: 0, top: 380, width: 720, height: 720 }, [480, 720]],
  ['maquiagem-editorial', 'maquiagem-editorial.jpg', null, [480]],
  ['bar-shakes', 'bar-shakes.jpg', { left: 0, top: 90, width: 1080, height: 1350 }, [480, 800]],
  ['penteado-salao', 'penteado-salao.jpg', null, [480, 720]],
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeVariants(name, pipeline, widths, { avif = false } = {}) {
  for (const w of widths) {
    const base = pipeline.clone().resize({ width: w, withoutEnlargement: true });
    await base.clone().webp({ quality: 78, effort: 6 }).toFile(join(OUT, `${name}-${w}.webp`));
    if (avif) await base.clone().avif({ quality: 54, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`));
  }
  const meta = await pipeline.clone().resize({ width: widths[widths.length - 1], withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  return { width: meta.info.width, height: meta.info.height };
}

/** Recolore um PNG com transparência mantendo o alfa. */
async function recolor(buf, [r, g, b]) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const dims = {};
  for (const [name, file, crop, widths, avif] of PHOTOS) {
    const path = join(SRC, file);
    if (!(await exists(path))) throw new Error(`Original ausente: assets-src/${file}`);
    let img = sharp(path).rotate();
    if (crop) img = img.extract(crop);
    dims[name] = await writeVariants(name, img, widths, { avif });
  }

  // Logotipo oficial (branco sobre transparente) — recortado e em duas cores.
  const logoWhite = await sharp(join(SRC, 'logo-vip-original.png')).trim({ threshold: 1 }).png().toBuffer();
  const logoInk = await recolor(logoWhite, INK_RGB);
  for (const [suffix, buf] of [['branco', logoWhite], ['tinta', logoInk]]) {
    await sharp(buf).resize({ width: 640 }).png({ compressionLevel: 9 }).toFile(join(OUT, `logo-vip-${suffix}.png`));
    await sharp(buf).resize({ width: 640 }).webp({ quality: 92, alphaQuality: 100 }).toFile(join(OUT, `logo-vip-${suffix}.webp`));
  }

  // Monograma "VP" (sem BODY / HAIR) para o cabeçalho e os ícones. No original
  // 1303×921 as letras ocupam as colunas ~195–930; o final de "BODY" (colunas
  // até ~350, linhas 440–510) invade esse recorte e é apagado antes.
  const { data: logoRaw, info: logoInfo } = await sharp(join(SRC, 'logo-vip-original.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 440; y < 512; y++)
    for (let x = 0; x < 362; x++) logoRaw[(y * logoInfo.width + x) * 4 + 3] = 0;
  const mono = await sharp(logoRaw, { raw: logoInfo }).extract({ left: 190, top: 0, width: 745, height: 921 }).png().toBuffer().then((b) => sharp(b).trim({ threshold: 1 }).png().toBuffer());
  const monoInk = await recolor(mono, INK_RGB);
  for (const [suffix, buf] of [['branco', mono], ['tinta', monoInk]]) {
    await sharp(buf).resize({ height: 112 }).png({ compressionLevel: 9 }).toFile(join(OUT, `monograma-vp-${suffix}.png`));
  }

  const icon = async (size, pad, file, radius = 0) => {
    const inner = Math.round(size * (1 - pad * 2));
    const mark = await sharp(mono).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    let base = sharp({ create: { width: size, height: size, channels: 4, background: { ...INK, alpha: 1 } } }).composite([{ input: mark, gravity: 'center' }]);
    if (radius) {
      const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`);
      base = sharp(await base.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
    }
    await base.png().toFile(join(PUBLIC, file));
  };
  await icon(32, 0.1, 'favicon-32.png', 6);
  await icon(180, 0.16, 'apple-touch-icon.png');
  await icon(192, 0.16, 'icon-192.png');
  await icon(512, 0.16, 'icon-512.png');

  // Open Graph 1200×630: logotipo à esquerda, honey blonde à direita.
  const ogPhoto = await sharp(join(SRC, 'honey-blonde-1.jpg')).extract({ left: 0, top: 120, width: 1290, height: 1290 }).resize(630, 630).png().toBuffer();
  const ogLogo = await sharp(logoWhite).resize({ width: 380 }).png().toBuffer();
  const overlay = Buffer.from(
    `<svg width="1200" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0.46" stop-color="#0F0E0C"/><stop offset="0.6" stop-color="#0F0E0C" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/>` +
      `<rect x="96" y="436" width="48" height="1" fill="#C49A6C"/>` +
      `<text x="96" y="482" font-family="DejaVu Serif, Georgia, serif" font-size="25" letter-spacing="1" fill="#F3EEE7">Salão de beleza premium</text>` +
      `<text x="96" y="520" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" letter-spacing="5" fill="#B9B0A5">BETHAVILLE · BARUERI/SP</text></svg>`,
  );
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: { ...INK, alpha: 1 } } })
    .composite([
      { input: ogPhoto, left: 570, top: 0 },
      { input: overlay, left: 0, top: 0 },
      { input: ogLogo, left: 96, top: 120 },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(join(OUT, 'og-vip-body-hair.jpg'));

  console.log('Imagens geradas em public/images. Dimensões (maior variante):');
  for (const [name, d] of Object.entries(dims)) console.log(`  ${name}: ${d.width}×${d.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
