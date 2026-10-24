#!/usr/bin/env node
// Testes de navegação reais (Playwright + Chromium) contra o build de produção.
// Uso: npm run build && npm run test:e2e
// Sobe o `vite preview` sozinho, a menos que BASE_URL aponte para outro servidor.
// CHROMIUM_PATH usa um Chromium já instalado no lugar do baixado pelo Playwright.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL ?? 'http://localhost:4175/';
const DIRECT = 'https://ig.me/m/ferbarber.brandt';
const PROFILE = 'https://www.instagram.com/ferbarber.brandt/';

let server;
if (!process.env.BASE_URL) {
  server = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { cwd: root, stdio: 'ignore' });
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const newPage = async (opts = {}, { go = true } = {}) => {
  const ctx = await browser.newContext({ locale: 'pt-BR', ...opts });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && page.problems.push(`console: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && page.problems.push(`HTTP ${r.status()} ${r.url()}`));
  if (go) await page.goto(BASE, { waitUntil: 'load' });
  return page;
};
const scrollThrough = async (page) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) {
    await page.mouse.wheel(0, 450);
    await page.waitForTimeout(110);
  }
};
const hiddenIntro = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[data-intro]')].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length);

console.log('\nHTML pré-renderizado');

await test('Conteúdo chega no HTML sem depender de JavaScript', async () => {
  const html = await (await fetch(BASE)).text();
  for (const text of ['Fer', 'barber', 'Brandt', 'Corte com assinatura.', 'Serviços', 'Corte e barba', 'Trabalho', 'ferbarber.brandt']) {
    assert(html.includes(text), `faltando no HTML: ${text}`);
  }
  assert(!html.includes('__SITE_URL__'), 'marcador __SITE_URL__ não substituído');
  assert(!html.includes('<!--preload-->') && !html.includes('<!--schema-->'), 'marcadores do head não substituídos');
  assert(/<style>[^<]{1000,}/.test(html), 'CSS não foi embutido');
  assert(/rel="preload" as="font"[^>]+archivo/.test(html), 'fonte do título sem preload');
});

await test('robots.txt e sitemap.xml publicados', async () => {
  const robots = await (await fetch(new URL('robots.txt', BASE))).text();
  const sitemap = await (await fetch(new URL('sitemap.xml', BASE))).text();
  assert(robots.includes('Sitemap: https://'), 'robots sem sitemap');
  assert(sitemap.includes('<loc>https://'), 'sitemap sem URL');
});

console.log('\nDesktop (1440×900)');
const desk = await newPage({ viewport: { width: 1440, height: 900 } }, { go: false });

await test('Abertura: a timeline segue a ordem combinada e espera as fontes', async () => {
  await desk.goto(BASE, { waitUntil: 'commit' });
  await desk.waitForFunction(() => document.getAnimations().some((a) => a.effect?.target?.dataset?.intro), null, { timeout: 5000 });
  const order = await desk.evaluate(() => {
    const first = {};
    for (const a of document.getAnimations()) {
      const intro = a.effect?.target?.dataset?.intro;
      if (!intro) continue;
      const delay = a.effect.getTiming().delay;
      first[intro] = Math.min(first[intro] ?? Infinity, delay);
    }
    return { first, fontsLoaded: document.fonts.status === 'loaded', cls: document.documentElement.className };
  });
  const seq = ['nav', 'mask', 'eyebrow', 'line', 'text', 'cta', 'tick', 'extra'];
  for (let i = 1; i < seq.length; i++) {
    assert(order.first[seq[i]] >= order.first[seq[i - 1]], `${seq[i]} começa antes de ${seq[i - 1]}: ${JSON.stringify(order.first)}`);
  }
  assert(order.fontsLoaded, 'timeline começou antes das fontes');
  assert(!order.cls.includes('js-intro'), 'classe de espera continua no <html> durante a timeline');
  const lines = await desk.evaluate(() => [...document.querySelectorAll('h1 [data-intro="line"]')].map((l) => getComputedStyle(l.parentElement).overflow));
  assert(lines.length === 2 && lines.every((o) => o === 'hidden'), `linhas do título sem overflow hidden: ${lines}`);
});

await test('Abertura: termina com tudo visível e sem estilos temporários', async () => {
  await desk.waitForTimeout(3600);
  const state = await desk.evaluate(() => ({
    left: document.getAnimations().filter((a) => a.effect?.target?.dataset?.intro).length,
    will: [...document.querySelectorAll('[data-intro]')].filter((el) => getComputedStyle(el).willChange !== 'auto').length,
    done: document.documentElement.classList.contains('intro-done'),
  }));
  assert((await hiddenIntro(desk)) === 0, 'elementos do hero ainda escondidos');
  assert(state.left === 0, `${state.left} animações da abertura não foram limpas`);
  assert(state.will === 0, 'will-change esquecido');
  assert(state.done, 'abertura não sinalizou o fim');
});

await test('SEO: título, descrição, canonical e Open Graph', async () => {
  const title = await desk.title();
  assert(title.includes('Fer Barber Brandt'), `título: ${title}`);
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

await test('Schema.org só com dados verificados', async () => {
  const data = await desk.evaluate(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent));
  const shop = data['@graph'].find((n) => n['@type'] === 'HairSalon');
  assert(shop?.name === 'Fer Barber Brandt', 'HairSalon ausente');
  assert(shop.sameAs.includes(PROFILE), 'sameAs Instagram');
  for (const key of ['telephone', 'address', 'openingHours', 'knowsAbout', 'priceRange']) {
    assert(!(key in shop), `${key} inventado no schema`);
  }
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
    sections: [...document.querySelectorAll('main > section')].map((s) => s.id),
  }));
  assert(info.h1 === 1, `h1: ${info.h1}`);
  assert(info.unlabeled.length === 0, `seções sem título: ${info.unlabeled}`);
  assert(info.missing.length === 0, `âncoras sem destino: ${info.missing.join(', ')}`);
  assert(info.imgsNoAlt === 0, 'imagens sem alt');
  for (const id of ['topo', 'sobre', 'servicos', 'galeria', 'agendar', 'contato']) {
    assert(info.sections.includes(id), `seção ausente: ${id}`);
  }
});

await test('Agendamento: todos os botões funcionam e abrem o Direct (único canal confirmado)', async () => {
  const links = await desk.evaluate(() =>
    [...document.querySelectorAll('a[data-booking]')].map((a) => ({ href: a.href, target: a.target, rel: a.rel, ch: a.dataset.booking })),
  );
  assert(links.length >= 8, `poucos botões de agendamento: ${links.length}`);
  for (const l of links) {
    assert(l.ch === 'instagram' && l.href === DIRECT, `link fora do padrão: ${l.ch} ${l.href}`);
    assert(l.target === '_blank' && l.rel.includes('noopener'), 'target/rel');
  }
  const deadButtons = await desk.evaluate(() =>
    [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
  );
  assert(deadButtons === 0, `${deadButtons} links sem destino`);
  const text = await desk.evaluate(() => document.body.innerText);
  assert(!/R\$\s?\d/.test(text), 'preço exibido sem confirmação');
  assert(!/wa\.me/.test(await desk.content()), 'link de WhatsApp sem número confirmado');
});

await test('Menu do topo rola até a seção', async () => {
  await desk.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Serviços' }).click();
  await desk.waitForTimeout(2000);
  const top = await desk.evaluate(() => document.getElementById('servicos').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `seção não chegou ao topo (top=${top})`);
});

await test('Serviços: a linha inteira leva ao agendamento daquele serviço', async () => {
  const link = desk.getByRole('link', { name: /Agendar Barba/ });
  assert((await link.count()) === 1, 'link da linha "Barba"');
  const [row, area] = await Promise.all([
    desk.locator('[data-service="barba"]').boundingBox(),
    link.boundingBox(),
  ]);
  assert(Math.abs(row.width - area.width) < 2 && Math.abs(row.height - area.height) < 2, 'o link não cobre a linha');
  await desk.waitForTimeout(600);
  const bg = await desk.evaluate(() => getComputedStyle(document.getElementById('servicos')).backgroundColor);
  assert(bg === 'rgb(235, 230, 221)', `seção de serviços não ficou clara: ${bg}`);
});

await test('Galeria: lightbox abre, navega com setas e fecha com Esc devolvendo o foco', async () => {
  const first = desk.getByRole('button', { name: /^Ampliar:/ }).first();
  await first.scrollIntoViewIfNeeded();
  await desk.waitForTimeout(1200);
  await first.click();
  const dialog = desk.getByRole('dialog', { name: 'Foto ampliada' });
  await dialog.waitFor({ state: 'visible' });
  await desk.waitForTimeout(700);
  assert((await dialog.innerText()).includes('01 / 08'), 'contador inicial');
  await desk.keyboard.press('ArrowRight');
  await desk.waitForTimeout(400);
  assert((await dialog.innerText()).includes('02 / 08'), 'seta direita');
  await desk.keyboard.press('ArrowLeft');
  await desk.keyboard.press('ArrowLeft');
  await desk.waitForTimeout(400);
  assert((await dialog.innerText()).includes('08 / 08'), 'volta do primeiro para o último');
  assert(await dialog.getByRole('link', { name: /Instagram|post/ }).isVisible(), 'link para o Instagram');
  await desk.keyboard.press('Escape');
  await desk.waitForTimeout(700);
  assert(!(await dialog.isVisible()), 'lightbox não fechou');
  const focused = await desk.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  assert(focused?.startsWith('Ampliar:'), `foco não voltou para a miniatura (${focused})`);
  assert((await desk.evaluate(() => document.documentElement.style.overflow)) === '', 'rolagem ficou travada');
});

await test('Todas as seções ficam visíveis ao rolar (nenhuma revelação travada)', async () => {
  await desk.evaluate(() => window.scrollTo(0, 0));
  await desk.waitForTimeout(400);
  await scrollThrough(desk);
  await desk.waitForTimeout(1800);
  const stuck = await desk.evaluate(() =>
    [...document.querySelectorAll('[data-reveal]')]
      .filter((el) => {
        const s = getComputedStyle(el);
        const mover = el.querySelector('[data-reveal-mover]');
        return Number(s.opacity) < 0.99 || (mover && getComputedStyle(mover).transform !== 'none');
      })
      .map((el) => el.closest('section')?.id + ':' + el.textContent.slice(0, 30)),
  );
  assert(stuck.length === 0, `ainda escondidos: ${stuck.join(' | ')}`);
});

await test('Sem erros de console, sem 404 e sem imagens quebradas', async () => {
  const broken = await desk.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
  );
  assert(broken.length === 0, `imagens quebradas: ${broken.join(', ')}`);
  assert(desk.problems.length === 0, desk.problems.join('\n'));
});

await test('Layout estável: nenhum deslocamento acumulado relevante (CLS)', async () => {
  const page = await newPage({ viewport: { width: 1440, height: 900 } }, { go: false });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const cls = await page.evaluate(() => window.__cls);
  assert(cls < 0.05, `CLS ${cls.toFixed(3)}`);
  await page.context().close();
});

console.log('\nCelular (390×844, toque)');
const mob = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

await test('Primeira dobra: nome e botão de agendar visíveis', async () => {
  await mob.waitForTimeout(3000);
  const box = await mob.locator('#topo a[data-booking]').boundingBox();
  assert(box && box.y + box.height <= 844, `botão abaixo da dobra (y=${box?.y})`);
  assert((await hiddenIntro(mob)) === 0, 'hero com elementos escondidos');
  assert(box.height >= 44, 'área de toque do botão menor que 44px');
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
  await menu.getByRole('link', { name: /Galeria/ }).click();
  await mob.waitForTimeout(1600);
  const top = await mob.evaluate(() => document.getElementById('galeria').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `não rolou até a Galeria (top=${top})`);
  assert((await mob.evaluate(() => document.documentElement.style.overflow)) === '', 'rolagem ficou travada');
});

await test('Barra fixa de agendamento aparece depois do hero e some no agendamento', async () => {
  const bar = mob.locator('div.fixed:has(a[data-booking])').last();
  await mob.evaluate(() => window.scrollTo(0, document.getElementById('sobre').offsetTop + 200));
  await mob.waitForTimeout(1000);
  assert((await bar.getAttribute('data-visible')) === 'true', 'não apareceu');
  await mob.evaluate(() => document.getElementById('agendar').scrollIntoView());
  await mob.waitForTimeout(1000);
  assert((await bar.getAttribute('data-visible')) === null, 'continuou sobre a seção de agendamento');
});

await test('Sem rolagem horizontal em larguras comuns', async () => {
  for (const width of [320, 360, 390, 414, 768, 1024, 1280, 1920]) {
    await mob.setViewportSize({ width, height: 844 });
    await mob.waitForTimeout(300);
    const over = await mob.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll('main *, header *, footer *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // O fundo do agendamento e a foto do hero (que cresce 4% na rolagem) ficam
          // recortados pelo overflow da própria seção.
          if (r.width === 0 || el.closest('svg, [data-backdrop], [data-hero-media], .crop-marks')) return false;
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

console.log('\nMovimento reduzido, sem JavaScript e com JavaScript quebrado');

await test('Com prefers-reduced-motion, tudo aparece de imediato e sem rolagem suave', async () => {
  const calm = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await calm.waitForTimeout(300);
  const state = await calm.evaluate(() => ({
    hidden: [...document.querySelectorAll('[data-intro], [data-reveal]')].filter(
      (el) => getComputedStyle(el).visibility === 'hidden' || Number(getComputedStyle(el).opacity) < 0.99,
    ).length,
    intro: document.documentElement.classList.contains('js-intro'),
    lenis: document.documentElement.classList.contains('lenis'),
    drift: getComputedStyle(document.querySelector('.drift')).animationName,
  }));
  assert(state.hidden === 0, `${state.hidden} elementos escondidos`);
  assert(!state.intro && !state.lenis, 'abertura ou Lenis ativos');
  assert(state.drift === 'none', 'zoom contínuo ativo com movimento reduzido');
  await calm.context().close();
});

await test('Sem JavaScript, o conteúdo inteiro continua visível', async () => {
  const page = await newPage({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  // Sem JS nenhuma classe de espera é aplicada: o CSS não esconde nada.
  assert(!(await page.evaluate(() => document.documentElement.classList.contains('js-intro'))), 'classe de espera aplicada sem JS');
  assert((await hiddenIntro(page)) === 0, 'hero escondido sem JS');
  const h1 = await page.locator('h1').boundingBox();
  assert(h1 && h1.height > 100, 'h1 sem altura');
  await page.context().close();
});

await test('Se o JS principal falhar, o timer de segurança mostra o hero', async () => {
  const page = await newPage({ viewport: { width: 1280, height: 800 } }, { go: false });
  await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
  await page.goto(BASE, { waitUntil: 'load' }).catch(() => undefined);
  assert((await hiddenIntro(page)) > 0, 'o hero deveria esperar a abertura');
  await page.waitForTimeout(4500);
  assert((await hiddenIntro(page)) === 0, 'hero continuou escondido sem o JS');
  await page.context().close();
});

await browser.close();
server?.kill();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passaram`);
process.exit(failed ? 1 : 0);
