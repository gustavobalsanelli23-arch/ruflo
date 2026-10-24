#!/usr/bin/env node
// Gera os ícones (a partir de public/favicon.svg) e a imagem de compartilhamento
// (public/og.jpg, 1200×630) renderizando scripts/og.html com as fontes do site.
// O monograma do favicon foi traçado das próprias fontes (F da Archivo
// condensada, b do Instrument Serif itálico).
//
// Uso: npm run brand   (depois de npm run images, para a foto do hero entrar)
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const images = JSON.parse(await readFile(join(root, 'src', 'data', 'images.generated.json'), 'utf8'));

const svg = await readFile(join(pub, 'favicon.svg'));
await sharp(svg, { density: 384 }).resize(32, 32).png().toFile(join(pub, 'favicon-32.png'));
for (const size of [180, 192, 512]) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(join(pub, size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`));
}

const hero = images.hero ? `hero-${images.hero.widths.find((w) => w >= 800) ?? images.hero.width}.webp` : '';
// CHROMIUM_PATH: usa um Chromium já instalado (ex.: CI sem download do Playwright).
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${pathToFileURL(join(root, 'scripts', 'og.html')).href}${hero ? `?hero=${hero}` : ''}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const png = await page.screenshot({ type: 'png' });
await browser.close();
await writeFile(join(pub, 'og.jpg'), await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer());

console.log(`ícones e og.jpg gerados em public/${hero ? ' (com a foto do hero)' : ''}`);
