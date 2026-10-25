#!/usr/bin/env node
// Pré-renderiza o HTML (SSG) a partir do build SSR: o conteúdo chega pronto
// para buscadores e para a primeira pintura; o navegador só hidrata.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const { render, schema, heroPreload, pending, SITE_URL } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

/**
 * Embute o CSS no HTML (elimina a requisição que bloqueia a renderização) e
 * pré-carrega as duas fontes do nome (o h1 usa as duas).
 */
async function inlineCss(html) {
  const re = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g;
  const preloads = new Set();
  for (const [tag, href] of [...html.matchAll(re)]) {
    const css = await readFile(join(dist, href), 'utf8');
    for (const font of css.match(/\/assets\/(archivo|instrument-serif)-[\w-]+\.woff2/g) ?? []) preloads.add(font);
    html = html.replace(tag, `<style>${css}</style>`);
  }
  const links = [...preloads]
    .map((href) => `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`)
    .join('');
  return html.replace('</title>', `</title>${links}`);
}

/**
 * A abertura (src/lib/intro.ts, sem dependências) vai inline logo depois do
 * HTML do app: roda durante o parse, sem esperar o bundle do React.
 */
async function introScript() {
  const source = await readFile(join(root, 'src', 'lib', 'intro.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, removeComments: true },
  });
  const body = outputText.replace(/^export \{\};?$/m, '').replace(/^export /gm, '');
  return `<script>(function(){${body}\nplayIntro();})();</script>`;
}

const file = join(dist, 'index.html');
let html = await readFile(file, 'utf8');
if (!html.includes('<!--app-html-->')) throw new Error('Marcador <!--app-html--> ausente em index.html');
html = html.replace('<!--app-html-->', render());
html = html.replace('<!--preload-->', heroPreload());
html = html.replace('<!--intro-->', await introScript());
html = html.replace('<!--schema-->', `<script type="application/ld+json">${schema().replace(/</g, '\\u003c')}</script>`);
html = html.replaceAll('__SITE_URL__', SITE_URL);
// O HTML já chega pronto: o JS (hidratação e animações) cede a banda para a
// foto do hero e as fontes, que decidem a primeira impressão (LCP).
html = html.replace('<script type="module" crossorigin', '<script type="module" fetchpriority="low" crossorigin');
html = await inlineCss(html);
await writeFile(file, html);

// Sitemap e robots com o mesmo endereço público.
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
  todo.photos.length && `fotos reais ainda não enviadas (${todo.photos.length}): ${todo.photos.join(', ')}`,
  todo.data.length && `dados ainda não confirmados: ${todo.data.join(', ')}`,
  todo.services.length && `a confirmar: ${todo.services.join(', ')}`,
].filter(Boolean);
if (lines.length) {
  console.warn('\n⚠  Antes de publicar:');
  for (const line of lines) console.warn(`   • ${line}`);
  console.warn('');
}
