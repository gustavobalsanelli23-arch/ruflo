#!/usr/bin/env node
// Gera as imagens otimizadas (WebP/AVIF) usadas pelo site a partir das
// fotografias originais publicadas em barbeariaconexao.com.br.
//
// Uso: npm run images
// Os originais ficam em assets-src/ (ignorado pelo git). Se um original não
// existir localmente, ele é baixado do site oficial.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets-src');
const OUT = join(root, 'public', 'images');
const ORIGIN = 'https://barbeariaconexao.com.br/wp-content/uploads/';

const BG = { r: 16, g: 16, b: 16, alpha: 1 }; // #101010
const WARM_WHITE = [245, 243, 239]; // #F5F3EF
const GOLD = [181, 154, 106]; // #B59A6A

/** Fotografias reais: [arquivo de saída, caminho original no WordPress]. */
const PHOTOS = [
  ['corte-degrade-barba-perfil', '2025/07/site-10-1.png'],
  ['barboterapia-toalha-quente', '2025/07/site-1.png'],
  ['corte-risco-nuca', '2025/07/site-1-1.png'],
  ['corte-cacheado-risco', '2025/07/site-11-1.png'],
  ['corte-texturizado', '2025/07/site-13.png'],
  ['corte-degrade-risco-topete', '2025/07/site-15.png'],
  ['corte-infantil-desenho', '2025/07/site-2-1.png'],
  ['corte-infantil-black', '2025/07/site-3-1.png'],
  ['corte-infantil-risco-perfil', '2025/07/site-4-1.png'],
  ['corte-infantil-degrade', '2025/07/site-5-1.png'],
  ['corte-social-curto', '2025/07/site-6-1.png'],
  ['corte-barba-desenhada', '2025/07/site-7-1.png'],
  ['corte-crespo-curto', '2025/07/site-8-1.png'],
  ['corte-cacheado-degrade', '2025/07/site-9-1.png'],
  ['fachada-unidade', '2025/07/site-800-x-1000-px-1-1.png'],
  ['equipe-conexao', '2026/01/site-800-x-1000-px-Apresentacao-1.png'],
];

/** Retratos da equipe, recortados acima da faixa com o nome. */
const TEAM = [
  ['barbeiro-isaac-cardoso', '2025/07/2-2.png', 540],
  ['barbeiro-bruno-lima', '2025/07/3-2.png', 540],
  ['barbeiro-ivan-araujo', '2025/08/Copia-de-Barbearia-Conexao.png', 560],
  ['barbeiro-carlos-eduardo', '2026/01/Copia-de-Barbearia-Conexao.png', 465],
];

const LOGO = '2025/07/Logo-cabecalho.png';
const SYMBOL = '2025/07/cropped-212.png';

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function source(wpPath) {
  const local = join(SRC, wpPath.replaceAll('/', '_'));
  if (!(await exists(local))) {
    const res = await fetch(ORIGIN + wpPath, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36',
        Accept: 'image/png,image/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`Falha ao baixar ${wpPath}: HTTP ${res.status}`);
    await mkdir(SRC, { recursive: true });
    await writeFile(local, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(local);
}

async function writeVariants(name, pipeline, widths, { avif = false } = {}) {
  for (const w of widths) {
    const base = pipeline.clone().resize({ width: w, withoutEnlargement: true });
    await base.clone().webp({ quality: 76, effort: 6 }).toFile(join(OUT, `${name}-${w}.webp`));
    if (avif) await base.clone().avif({ quality: 52, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`));
  }
}

/** Recolore o logotipo: azul → branco quente, faixas do escudo → dourado. */
async function recolorLogo(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, b] = [data[i], data[i + 2]];
    // Azul vira branco quente; o restante (faixas brancas do logo horizontal,
    // faixas pretas do símbolo quadrado e o texto "BARBEARIA") vira dourado.
    const [nr, ng, nb] = b - r > 60 ? WARM_WHITE : GOLD;
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
  return sharp(data, { raw: info });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const [name, wp] of PHOTOS) {
    const img = sharp(await source(wp));
    await writeVariants(name, img, [480, 800]);
  }

  // Herói: versão monocromática pré-processada (sem custo de filtro no navegador).
  const hero = sharp(await source('2025/07/site-10-1.png'))
    .grayscale()
    .linear(1.12, -14)
    .tint({ r: 222, g: 214, b: 200 });
  await writeVariants('hero-monocromatico', hero, [480, 800], { avif: true });

  // CTA final: barboterapia monocromática.
  const cta = sharp(await source('2025/07/site-1.png')).grayscale().linear(1.05, -10);
  await writeVariants('cta-barboterapia-mono', cta, [800], { avif: true });

  for (const [name, wp, centerX] of TEAM) {
    const h = 640;
    const w = 512;
    const left = Math.max(0, Math.min(1080 - w, Math.round(centerX - w / 2)));
    const img = sharp(await source(wp)).extract({ left, top: 0, width: w, height: h });
    await writeVariants(name, img, [512]);
  }

  // Logotipo horizontal recolorido (PNG com transparência, 2 tamanhos).
  const logo = await recolorLogo(await source(LOGO));
  await logo.clone().png({ compressionLevel: 9 }).toFile(join(OUT, 'logo-conexao.png'));
  await logo.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(join(OUT, 'logo-conexao.webp'));

  // Símbolo (escudo) para favicon/ícones. No arquivo 512×512 original o escudo
  // ocupa as colunas 157–354 e as linhas 78–279; logo abaixo começa o "C" do
  // logotipo, por isso o recorte é fixo.
  const symbolSrc = await recolorLogo(await source(SYMBOL));
  const shieldPng = await sharp(await symbolSrc.png().toBuffer())
    .extract({ left: 155, top: 76, width: 202, height: 206 })
    .png()
    .toBuffer();
  await sharp(shieldPng).resize({ height: 160 }).png().toFile(join(OUT, 'escudo.png'));

  const icon = async (size, pad, file, radius = 0) => {
    const inner = Math.round(size * (1 - pad * 2));
    const mark = await sharp(shieldPng).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const mask = radius
      ? Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`)
      : null;
    let base = sharp({ create: { width: size, height: size, channels: 4, background: BG } }).composite([{ input: mark, gravity: 'center' }]);
    if (mask) base = sharp(await base.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
    await base.png().toFile(join(root, 'public', file));
  };
  await icon(32, 0.12, 'favicon-32.png', 6);
  await icon(180, 0.18, 'apple-touch-icon.png');
  await icon(192, 0.18, 'icon-192.png');
  await icon(512, 0.18, 'icon-512.png');

  // Open Graph 1200×630: foto monocromática à direita, logo à esquerda.
  const ogPhoto = await sharp(await source('2025/07/site-10-1.png'))
    .grayscale()
    .linear(1.12, -14)
    .resize(630, 630)
    .png()
    .toBuffer();
  const ogLogo = await logo.clone().resize({ width: 420 }).png().toBuffer();
  const fade = Buffer.from(
    `<svg width="1200" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0.42" stop-color="#101010"/><stop offset="0.62" stop-color="#101010" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/>` +
      `<rect x="80" y="372" width="56" height="1" fill="rgb(${GOLD.join(',')})"/>` +
      `<text x="80" y="420" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" letter-spacing="5" fill="rgb(${WARM_WHITE.join(',')})">BARUERI, SP  ·  DESDE 2015</text></svg>`,
  );
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: BG } })
    .composite([
      { input: ogPhoto, left: 570, top: 0 },
      { input: fade, left: 0, top: 0 },
      { input: ogLogo, left: 80, top: 220 },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(join(OUT, 'og-conexao-barbearia.jpg'));

  console.log('Imagens geradas em public/images');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
