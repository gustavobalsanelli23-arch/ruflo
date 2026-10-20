#!/usr/bin/env node
// Testes de navegação reais (Playwright + Chromium) contra o build de produção.
// Uso: npm run build && npm run test:e2e
// Sobe o `vite preview` sozinho, a menos que BASE_URL aponte para outro servidor.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL ?? 'http://localhost:4174/';
const DIRECT = 'https://ig.me/m/meire.cabeleireiras';
const PROFILE = 'https://www.instagram.com/meire.cabeleireiras/';

let server;
if (!process.env.BASE_URL) {
  server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`  ✗ ${name}\n    ${error.message}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const browser = await chromium.launch();
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ locale: 'pt-BR', ...opts });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && page.problems.push(`console: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && page.problems.push(`HTTP ${r.status()} ${r.url()}`));
  await page.goto(BASE, { waitUntil: 'load' });
  return page;
};
const scrollThrough = async (page) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(120);
  }
};
const visibleWorks = (page) =>
  page.evaluate(() => [...document.querySelectorAll('#trabalhos [data-work]')].map((li) => li.dataset.work));

console.log('\nHTML pré-renderizado');

await test('Conteúdo chega no HTML sem depender de JavaScript', async () => {
  const html = await (await fetch(BASE)).text();
  for (const text of ['Seu cabelo,', 'sua essência.', 'A arte na forma de beleza.', 'Especialidades', 'Mechas e iluminação', 'Escova modelada', 'meire.cabeleireiras']) {
    assert(html.includes(text), `faltando no HTML: ${text}`);
  }
  assert(!html.includes('__SITE_URL__'), 'marcador __SITE_URL__ não substituído');
});

await test('robots.txt e sitemap.xml publicados', async () => {
  const robots = await (await fetch(new URL('robots.txt', BASE))).text();
  const sitemap = await (await fetch(new URL('sitemap.xml', BASE))).text();
  assert(robots.includes('Sitemap: https://'), 'robots sem sitemap');
  assert(sitemap.includes('<loc>https://'), 'sitemap sem URL');
});

console.log('\nDesktop (1440×900)');
const desk = await newPage({ viewport: { width: 1440, height: 900 } });

await test('SEO: título, descrição, canonical e Open Graph', async () => {
  const title = await desk.title();
  assert(title.includes('Meire Cabeleireiras'), `título: ${title}`);
  const meta = await desk.evaluate(() => ({
    desc: document.querySelector('meta[name="description"]')?.content,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    lang: document.documentElement.lang,
  }));
  assert(meta.desc?.length > 80 && meta.desc.length < 170, `descrição: ${meta.desc?.length} caracteres`);
  assert(meta.canonical?.startsWith('https://'), `canonical: ${meta.canonical}`);
  assert(meta.ogImage?.endsWith('/og.jpg'), `og:image: ${meta.ogImage}`);
  assert(meta.lang === 'pt-BR', 'lang');
});

await test('Schema.org HairSalon só com dados verificados', async () => {
  const data = await desk.evaluate(() =>
    JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
  );
  const salon = data['@graph'].find((n) => n['@type'] === 'HairSalon');
  assert(salon?.name === 'Meire Cabeleireiras', 'HairSalon ausente');
  assert(salon.sameAs.includes(PROFILE), 'sameAs Instagram');
  assert(salon.employee?.name === 'Meire Costa', 'profissional');
  assert(!('telephone' in salon) && !('address' in salon), 'telefone/endereço inventados no schema');
});

await test('Estrutura: um único h1, seções rotuladas e âncoras válidas', async () => {
  const info = await desk.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    unlabeled: [...document.querySelectorAll('section[aria-labelledby]')]
      .filter((s) => !document.getElementById(s.getAttribute('aria-labelledby')))
      .map((s) => s.id),
    missing: [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h.length > 1 && !document.querySelector(h)),
    imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
  }));
  assert(info.h1 === 1, `h1: ${info.h1}`);
  assert(info.unlabeled.length === 0, `seções sem título: ${info.unlabeled}`);
  assert(info.missing.length === 0, `âncoras sem destino: ${info.missing.join(', ')}`);
  assert(info.imgsNoAlt === 0, 'imagens sem alt');
});

await test('Agendamento: sem WhatsApp configurado, todos os botões abrem o Direct', async () => {
  const links = await desk.evaluate(() =>
    [...document.querySelectorAll('a[data-booking]')].map((a) => ({ href: a.href, target: a.target, rel: a.rel, ch: a.dataset.booking })),
  );
  assert(links.length >= 10, `poucos botões de agendamento: ${links.length}`);
  for (const l of links) {
    assert(l.ch === 'instagram' && l.href === DIRECT, `link fora do padrão: ${l.href}`);
    assert(l.target === '_blank' && l.rel.includes('noopener'), 'target/rel');
  }
  const wa = await desk.evaluate(() => document.querySelectorAll('a[href*="wa.me"]').length);
  assert(wa === 0, 'link de WhatsApp sem número configurado');
});

await test('Links do Instagram apontam para o perfil e para os posts reais', async () => {
  const hrefs = await desk.evaluate(() => [...document.querySelectorAll('a[href*="instagram.com"]')].map((a) => a.href));
  assert(hrefs.includes(PROFILE), 'perfil');
  const posts = hrefs.filter((h) => /instagram\.com\/(reel|p)\//.test(h));
  assert(new Set(posts).size >= 6, `posts: ${new Set(posts).size}`);
});

await test('Hero aparece inteiro depois da abertura', async () => {
  await desk.waitForTimeout(3500);
  const state = await desk.evaluate(() => {
    const items = [...document.querySelectorAll('[data-hero-item]')];
    return {
      hidden: items.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
      h1: document.querySelector('h1').getBoundingClientRect().height,
    };
  });
  assert(state.hidden === 0, `${state.hidden} elementos do hero ainda escondidos`);
  assert(state.h1 > 100, 'h1 sem altura');
});

await test('Menu do topo rola até a seção', async () => {
  await desk.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Especialidades' }).click();
  await desk.waitForTimeout(1900);
  const top = await desk.evaluate(() => document.getElementById('especialidades').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `seção não chegou ao topo (top=${top})`);
});

await test('Especialidades: a prévia acompanha o serviço em foco', async () => {
  const row = desk.locator('[data-specialty]').nth(3);
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await desk.waitForTimeout(1100);
  const caption = await desk.locator('#especialidades figcaption').innerText();
  assert(/camadas/i.test(caption), `legenda da prévia: ${caption}`);
});

await test('Galeria: filtros mostram só categorias com fotos e filtram com animação', async () => {
  const group = desk.getByRole('group', { name: 'Filtrar trabalhos' });
  await group.scrollIntoViewIfNeeded();
  const labels = await group.getByRole('button').allInnerTexts();
  assert(!labels.some((l) => /Ruivos|Penteados/.test(l)), `filtro vazio exibido: ${labels}`);
  assert((await visibleWorks(desk)).length === 7, 'todas no início');
  await group.getByRole('button', { name: /Mechas/ }).click();
  await desk.waitForTimeout(1600);
  const mechas = await visibleWorks(desk);
  assert(mechas.length === 1 && mechas[0] === 'mechas-loiras', `mechas: ${mechas}`);
  assert((await group.getByRole('button', { name: /Mechas/ }).getAttribute('aria-pressed')) === 'true', 'aria-pressed');
  await group.getByRole('button', { name: /Cortes/ }).click();
  await desk.waitForTimeout(1600);
  assert((await visibleWorks(desk)).length === 2, 'cortes');
  // Cliques seguidos durante a animação: vale o último.
  await group.getByRole('button', { name: /Mechas/ }).click();
  await desk.waitForTimeout(150);
  await group.getByRole('button', { name: /Escova/ }).click();
  await desk.waitForTimeout(2600);
  const escova = await visibleWorks(desk);
  assert(escova.length === 2 && escova.includes('liso'), `clique durante a animação ignorado: ${escova}`);
  await group.getByRole('button', { name: /Todos/ }).click();
  await desk.waitForTimeout(1600);
  assert((await visibleWorks(desk)).length === 7, 'voltar para todos');
  const hidden = await desk.evaluate(
    () => [...document.querySelectorAll('#trabalhos [data-work]')].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
  );
  assert(hidden === 0, `${hidden} fotos ficaram transparentes depois do filtro`);
});

await test('Galeria: lightbox abre, navega com setas e fecha com Esc devolvendo o foco', async () => {
  const first = desk.getByRole('button', { name: /^Ampliar:/ }).first();
  await first.scrollIntoViewIfNeeded();
  await desk.waitForTimeout(900);
  await first.click();
  const dialog = desk.getByRole('dialog', { name: 'Foto ampliada' });
  await dialog.waitFor({ state: 'visible' });
  await desk.waitForTimeout(700);
  assert((await dialog.innerText()).includes('1 / 7'), 'contador inicial');
  assert(await dialog.getByRole('link', { name: /Ver no Instagram/ }).isVisible(), 'link do post');
  await desk.keyboard.press('ArrowRight');
  await desk.waitForTimeout(400);
  assert((await dialog.innerText()).includes('2 / 7'), 'seta direita');
  await desk.keyboard.press('ArrowLeft');
  await desk.keyboard.press('ArrowLeft');
  await desk.waitForTimeout(400);
  assert((await dialog.innerText()).includes('7 / 7'), 'volta do primeiro para o último');
  await desk.keyboard.press('Escape');
  await desk.waitForTimeout(700);
  assert(!(await dialog.isVisible()), 'lightbox não fechou');
  const focused = await desk.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  assert(focused?.startsWith('Ampliar:'), `foco não voltou para a miniatura (${focused})`);
});

await test('Todas as seções ficam visíveis ao rolar (nenhuma revelação travada)', async () => {
  await scrollThrough(desk);
  await desk.waitForTimeout(1500);
  const stuck = await desk.evaluate(() =>
    [...document.querySelectorAll('[data-reveal], [data-work-in]')]
      .filter((el) => Number(getComputedStyle(el).opacity) < 0.99)
      .map((el) => el.closest('section')?.id + ':' + el.textContent.slice(0, 30)),
  );
  assert(stuck.length === 0, `ainda escondidos: ${stuck.join(' | ')}`);
});

await test('Todas as imagens carregam (sem 404 e sem erros de console)', async () => {
  const broken = await desk.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
  );
  assert(broken.length === 0, `imagens quebradas: ${broken.join(', ')}`);
  assert(desk.problems.length === 0, desk.problems.join('\n'));
});

console.log('\nCelular (390×844, toque)');
const mob = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

await test('Primeira dobra: título e botão de agendar visíveis', async () => {
  await mob.waitForTimeout(3500);
  const box = await mob.locator('#topo a[data-booking]').boundingBox();
  assert(box && box.y + box.height <= 844, `botão abaixo da dobra (y=${box?.y})`);
});

await test('Menu mobile abre, prende o foco, fecha com Esc e navega', async () => {
  const toggle = mob.locator('button[aria-controls="menu-mobile"]');
  await toggle.click();
  await mob.waitForTimeout(1200);
  const menu = mob.locator('#menu-mobile');
  assert((await toggle.getAttribute('aria-expanded')) === 'true', 'aria-expanded');
  assert(await menu.isVisible(), 'menu invisível');
  assert(await mob.evaluate(() => document.getElementById('menu-mobile').contains(document.activeElement)), 'foco fora do menu');
  await mob.keyboard.press('Escape');
  await mob.waitForTimeout(900);
  assert((await toggle.getAttribute('aria-expanded')) === 'false', 'Esc não fechou');
  assert(
    (await mob.evaluate(() => document.activeElement?.getAttribute('aria-controls'))) === 'menu-mobile',
    'foco não voltou ao botão',
  );
  await toggle.click();
  await mob.waitForTimeout(1200);
  await menu.getByRole('link', { name: 'Trabalhos' }).click();
  await mob.waitForTimeout(1600);
  const top = await mob.evaluate(() => document.getElementById('trabalhos').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `não rolou até Trabalhos (top=${top})`);
  assert((await mob.evaluate(() => document.documentElement.style.overflow)) === '', 'rolagem ficou travada');
});

await test('Barra fixa de agendamento aparece depois do hero e some no agendamento', async () => {
  const bar = mob.locator('div.fixed:has(a[data-booking])').last();
  await mob.evaluate(() => window.scrollTo(0, document.getElementById('especialidades').offsetTop + 200));
  await mob.waitForTimeout(1000);
  assert((await bar.getAttribute('data-visible')) === 'true', 'não apareceu');
  await mob.evaluate(() => document.getElementById('agendar').scrollIntoView());
  await mob.waitForTimeout(1000);
  assert((await bar.getAttribute('data-visible')) === null, 'continuou sobre a seção de agendamento');
});

await test('Sem rolagem horizontal em larguras comuns', async () => {
  for (const width of [320, 360, 390, 414, 768, 1024, 1280]) {
    await mob.setViewportSize({ width, height: 844 });
    await mob.waitForTimeout(250);
    const over = await mob.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll('main *, header *, footer *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || el.closest('svg, ul.snap-x, [role="group"]')) return false;
          return r.right > vw + 1 && getComputedStyle(el).position !== 'fixed';
        })
        .slice(0, 3)
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`);
    });
    const scrollX = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(scrollX <= 0, `${width}px: rolagem horizontal de ${scrollX}px`);
    assert(over.length === 0, `${width}px: elementos vazando: ${over.join(', ')}`);
  }
  assert(mob.problems.length === 0, mob.problems.join('\n'));
});

console.log('\nMovimento reduzido');
const calm = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

await test('Com prefers-reduced-motion, tudo aparece de imediato e no lugar', async () => {
  await calm.waitForTimeout(300);
  const hidden = await calm.evaluate(() =>
    [...document.querySelectorAll('[data-hero-item], [data-reveal], [data-work-in]')].filter(
      (el) => getComputedStyle(el).visibility === 'hidden' || Number(getComputedStyle(el).opacity) < 0.99,
    ).length,
  );
  assert(hidden === 0, `${hidden} elementos escondidos`);
  assert(!(await calm.evaluate(() => document.documentElement.classList.contains('lenis'))), 'Lenis ativo');
});

await browser.close();
server?.kill();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passaram`);
process.exit(failed ? 1 : 0);
