#!/usr/bin/env node
// Gera o quadro parado do hero (a primeira pintura, antes da cena 3D) a partir
// da própria cena: abre o build no Chromium, esconde a interface, espera o
// primeiro quadro do capítulo 1 e fotografa em paisagem e em retrato.
// Uso: npm run build && npm run poster  (depois, npm run build de novo)
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'images', 'hero');
const BASE = 'http://localhost:4177/';

const server = spawn('npx', ['vite', 'preview', '--port', '4177', '--strictPort'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* subindo */
  }
  await new Promise((r) => setTimeout(r, 250));
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const shots = [
  { name: 'casa-vop', viewport: { width: 1600, height: 1000 }, scale: 1.25, width: 2000 },
  { name: 'casa-vop-retrato', viewport: { width: 450, height: 975 }, scale: 2, width: 900 },
];
for (const s of shots) {
  const page = await browser.newPage({ viewport: s.viewport, deviceScaleFactor: s.scale });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.addStyleTag({ content: '.st-header,.st-frame,.st-veil{visibility:hidden!important}.st-bg{background:none!important;transform:none!important}.st-bg canvas{transition:none!important}' });
  await page.waitForSelector('#inicio canvas[data-ready]', { timeout: 60000 });
  await page.waitForTimeout(400);
  const png = await page.locator('#inicio .st-bg').screenshot();
  for (const [format, opts] of [
    ['webp', { quality: 80 }],
    ['avif', { quality: 55 }],
  ]) {
    const file = join(out, `${s.name}.${format}`);
    await sharp(png).resize({ width: s.width })[format](opts).toFile(file);
    console.log(file.replace(root + '/', ''));
  }
  await page.close();
}
await browser.close();
server.kill();
