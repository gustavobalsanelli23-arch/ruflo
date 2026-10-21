#!/usr/bin/env node
// Pré-renderiza a página (HTML estático) a partir do build SSR.
// Melhora SEO, primeira pintura e LCP; o cliente apenas hidrata.
//
// URL pública: defina SITE_URL (ex.: https://studiosenehair.com.br). Na Vercel,
// sem SITE_URL, usa o domínio de produção do projeto automaticamente. Sem
// nenhum dos dois, as tags que exigem URL absoluta (canonical, og:url,
// sitemap) são omitidas em vez de apontarem para um domínio inventado.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const { render, schema } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = (process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : '')).replace(/\/+$/, '');

/**
 * Embute o CSS no HTML para eliminar a requisição que bloqueia a renderização,
 * e pré-carrega as duas fontes usadas na primeira dobra.
 */
async function inlineCss(html) {
  const re = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g;
  const preloads = new Set();
  for (const [tag, href] of [...html.matchAll(re)]) {
    const css = await readFile(join(dist, href), 'utf8');
    for (const font of css.match(
      /\/assets\/(?:instrument-serif-latin-400-normal|jost-latin-wght-normal)-[\w-]+\.woff2/g,
    ) ?? [])
      preloads.add(font);
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
html = html.replaceAll('__SITE_URL__', siteUrl);
html = html.replace(
  '<!--canonical-->',
  siteUrl ? `<link rel="canonical" href="${siteUrl}/" /><meta property="og:url" content="${siteUrl}/" />` : '',
);
html = html.replace(
  '<!--schema-->',
  `<script type="application/ld+json">${schema(siteUrl).replace(/</g, '\\u003c')}</script>`,
);
html = await inlineCss(html);
await writeFile(path, html);
console.log(`pré-renderizado: index.html${siteUrl ? ` (${siteUrl})` : ' (sem SITE_URL: canonical omitido)'}`);

await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`,
);
if (siteUrl) {
  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`,
  );
}

await rm(ssrDir, { recursive: true, force: true });
