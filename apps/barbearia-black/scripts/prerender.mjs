#!/usr/bin/env node
// Pré-renderiza a página (HTML estático) a partir do build SSR.
// Melhora SEO, primeira pintura e LCP; o cliente apenas hidrata.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const { render, schema, SITE_URL } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

/** Embute o CSS no HTML (elimina a requisição que bloqueia a renderização) e pré-carrega a fonte. */
async function inlineCss(html) {
  const re = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g;
  const preloads = new Set();
  for (const [tag, href] of [...html.matchAll(re)]) {
    const css = await readFile(join(dist, href), 'utf8');
    for (const font of css.match(/\/assets\/archivo-latin-wdth-normal-[\w-]+\.woff2/g) ?? []) preloads.add(font);
    html = html.replace(tag, `<style>${css}</style>`);
  }
  const links = [...preloads]
    .map((href) => `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`)
    .join('');
  return html.replace('</title>', `</title>${links}`);
}

const path = join(dist, 'index.html');
let html = await readFile(path, 'utf8');
if (!html.includes('<!--app-html-->')) throw new Error('Marcador <!--app-html--> ausente em index.html');
html = html.replace('<!--app-html-->', render());
html = html.replace('<!--schema-->', `<script type="application/ld+json">${schema().replace(/</g, '\\u003c')}</script>`);
// URLs absolutas (canonical, Open Graph) seguem o domínio configurado em SITE_URL.
html = html.replaceAll('%SITE_URL%', SITE_URL);
html = await inlineCss(html);
await writeFile(path, html);

for (const file of ['robots.txt', 'sitemap.xml']) {
  const p = join(dist, file);
  await writeFile(p, (await readFile(p, 'utf8')).replaceAll('%SITE_URL%', SITE_URL));
}

console.log(`pré-renderizado: index.html (${SITE_URL})`);
await rm(ssrDir, { recursive: true, force: true });
