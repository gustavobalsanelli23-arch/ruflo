#!/usr/bin/env node
// Pré-renderiza as páginas (HTML estático) a partir do build SSR.
// Melhora SEO, primeira pintura e LCP; o cliente apenas hidrata.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const { render, schema } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

/**
 * Embute o CSS no HTML para eliminar a requisição que bloqueia a renderização,
 * e pré-carrega as fontes usadas na primeira dobra (Bodoni regular e itálico, Jost — latin).
 */
async function inlineCss(html) {
  const re = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g;
  const preloads = new Set();
  for (const [tag, href] of [...html.matchAll(re)]) {
    const css = await readFile(join(dist, href), 'utf8');
    for (const font of css.match(/\/assets\/(?:bodoni-moda-latin-opsz-normal|bodoni-moda-latin-opsz-italic|jost-latin-wght-normal)-[\w-]+\.woff2/g) ?? [])
      preloads.add(font);
    html = html.replace(tag, `<style>${css}</style>`);
  }
  const links = [...preloads]
    .map((href) => `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`)
    .join('');
  return html.replace('</title>', `</title>${links}`);
}

const pages = [
  { file: 'index.html', page: 'home' },
  { file: 'politica-de-privacidade/index.html', page: 'politica-de-privacidade' },
];

for (const { file, page } of pages) {
  const path = join(dist, file);
  let html = await readFile(path, 'utf8');
  if (!html.includes('<!--app-html-->')) throw new Error(`Marcador <!--app-html--> ausente em ${file}`);
  html = html.replace('<!--app-html-->', render(page));
  html = html.replace(
    '<!--schema-->',
    page === 'home' ? `<script type="application/ld+json">${schema().replace(/</g, '\\u003c')}</script>` : '',
  );
  html = await inlineCss(html);
  await writeFile(path, html);
  console.log(`pré-renderizado: ${file}`);
}

await rm(ssrDir, { recursive: true, force: true });
