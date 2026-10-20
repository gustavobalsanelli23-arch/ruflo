#!/usr/bin/env node
// Gera os ícones (a partir de public/favicon.svg) e a imagem de compartilhamento
// (public/og.jpg, 1200×630) renderizando scripts/og.html com as fontes do site.
//
// Uso: npm run brand   (depois de npm run images)
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const INK = '#19372C';

const svg = await readFile(join(pub, 'favicon.svg'));
await sharp(svg, { density: 384 }).resize(32, 32).png().toFile(join(pub, 'favicon-32.png'));
for (const size of [192, 512]) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(pub, `icon-${size}.png`));
}
// Apple pede fundo opaco e margem: a flor de lótus fica centralizada no verde da casa.
const inner = await sharp(svg, { density: 384 }).resize(148, 148).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: INK } })
  .composite([{ input: inner, left: 16, top: 16 }])
  .png()
  .toFile(join(pub, 'apple-touch-icon.png'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(root, 'scripts', 'og.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const png = await page.screenshot({ type: 'png' });
await browser.close();
await writeFile(join(pub, 'og.jpg'), await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer());

console.log('ícones e og.jpg gerados em public/');
