#!/usr/bin/env node
// Pré-renderiza o HTML (SSG) a partir do build SSR: o conteúdo chega pronto
// para buscadores e para a primeira pintura; o navegador só hidrata.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const { render, schema, heroPreload, pending, SITE_URL } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

/**
 * Embute o CSS no HTML (elimina a requisição que bloqueia a renderização) e
 * pré-carrega as fontes da primeira dobra: Inter (título e texto) e Chakra
 * Petch (rótulos).
 */
async function inlineCss(html) {
  const re = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g;
  const preloads = new Set();
  for (const [tag, href] of [...html.matchAll(re)]) {
    const css = await readFile(join(dist, href), 'utf8');
    for (const font of css.match(/\/assets\/(inter-latin-(400|700)-normal|chakra-petch-latin-700-normal)-[\w-]+\.woff2/g) ?? []) preloads.add(font);
    html = html.replace(tag, `<style>${css}</style>`);
  }
  const links = [...preloads]
    .map((href) => `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`)
    .join('');
  return html.replace('</title>', `</title>${links}`);
}

const file = join(dist, 'index.html');
let html = await readFile(file, 'utf8');
if (!html.includes('<!--app-html-->')) throw new Error('Marcador <!--app-html--> ausente em index.html');
html = html.replace('<!--app-html-->', render());
html = html.replace('<!--preload-->', heroPreload());
html = html.replace('<!--schema-->', `<script type="application/ld+json">${schema().replace(/</g, '\\u003c')}</script>`);
html = html.replaceAll('__SITE_URL__', SITE_URL);
// O HTML já chega pronto: o JS (hidratação e animações) cede a banda para o
// quadro do hero e as fontes, que decidem a primeira impressão (LCP).
html = html.replace('<script type="module" crossorigin', '<script type="module" fetchpriority="low" crossorigin');
html = await inlineCss(html);
await writeFile(file, html);

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`,
);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

await rm(ssrDir, { recursive: true, force: true });
console.log('pré-renderizado: index.html, sitemap.xml, robots.txt');

// O build não falha por isso, mas avisa: nada aqui pode ser inventado.
const todo = pending();
const lines = [
  todo.data.length && `dados ainda não confirmados: ${todo.data.join(', ')}`,
  todo.content.length && `conteúdo a validar com a VOP: ${todo.content.join(', ')}`,
  ...todo.catalog,
  ...todo.media,
].filter(Boolean);
if (lines.length) {
  console.warn('\n⚠  Antes de publicar:');
  for (const line of lines) console.warn(`   • ${line}`);
  console.warn('');
}
