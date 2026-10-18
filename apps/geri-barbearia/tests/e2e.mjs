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
const WA = 'https://wa.me/5547992537118?text=';

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
  const ctx = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', ...opts });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && page.problems.push(`console: ${m.text()}`));
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

console.log('\nDesktop (1440×900)');
const desk = await newPage({ viewport: { width: 1440, height: 900 } });

await test('SEO: título, descrição, canonical e Open Graph', async () => {
  const title = await desk.title();
  assert(title.includes('Geri Barbearia') && title.includes('Benedito Novo'), `título: ${title}`);
  const meta = await desk.evaluate(() => ({
    desc: document.querySelector('meta[name="description"]')?.content,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    lang: document.documentElement.lang,
  }));
  assert(meta.desc?.length > 80, 'descrição curta demais');
  assert(meta.canonical?.startsWith('https://'), `canonical: ${meta.canonical}`);
  assert(meta.ogImage?.endsWith('/og.jpg') && !meta.ogImage.includes('__SITE_URL__'), `og:image: ${meta.ogImage}`);
  assert(meta.lang === 'pt-BR', 'lang');
});

await test('Schema.org HairSalon com telefone, endereço e horários', async () => {
  const data = await desk.evaluate(() =>
    JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
  );
  const shop = data['@graph'].find((n) => n['@type'] === 'HairSalon');
  assert(shop, 'HairSalon ausente');
  assert(shop.telephone === '+5547992537118', `telefone: ${shop.telephone}`);
  assert(shop.address.addressLocality === 'Benedito Novo', 'cidade');
  assert(shop.openingHoursSpecification.length === 3, 'horários');
});

await test('Estrutura: um único h1 e todas as seções do menu existem', async () => {
  const info = await desk.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    missing: [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h.length > 1 && !document.querySelector(h)),
  }));
  assert(info.h1 === 1, `h1: ${info.h1}`);
  assert(info.missing.length === 0, `âncoras sem destino: ${info.missing.join(', ')}`);
});

await test('WhatsApp: todos os botões abrem o número certo com mensagem pronta', async () => {
  const links = await desk.evaluate(() =>
    [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => ({ href: a.href, target: a.target, rel: a.rel })),
  );
  assert(links.length >= 8, `poucos links de WhatsApp: ${links.length}`);
  for (const l of links) {
    assert(l.href.startsWith(WA), `link fora do padrão: ${l.href}`);
    const msg = decodeURIComponent(l.href.slice(WA.length));
    assert(msg.startsWith('Olá, Geri!'), `mensagem: ${msg}`);
    assert(l.target === '_blank' && l.rel.includes('noopener'), 'target/rel');
  }
});

await test('Instagram e Google Maps apontam para os endereços reais', async () => {
  const hrefs = await desk.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.href));
  assert(
    hrefs.some((h) => h === 'https://www.instagram.com/geri_barbearia/'),
    'Instagram',
  );
  const maps = hrefs.find((h) => h.includes('google.com/maps'));
  assert(
    maps &&
      decodeURIComponent(maps).includes('Rua Celso Ramos, 5330') &&
      decodeURIComponent(maps).includes('Benedito Novo'),
    'Maps',
  );
});

await test('Status de funcionamento calculado no navegador', async () => {
  const text = await desk.locator('#topo [aria-live="polite"]').innerText();
  assert(/Aberto agora|Fechado agora|Pausa para o almoço/.test(text), `status: ${text}`);
});

await test('Menu do topo rola até a seção', async () => {
  await desk.waitForTimeout(4500); // abertura + entrada do hero
  await desk.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Serviços' }).click();
  await desk.waitForTimeout(1900);
  const top = await desk.evaluate(() => document.getElementById('servicos').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `seção não chegou ao topo (top=${top})`);
});

await test('Galeria: lightbox abre, navega com setas e fecha com Esc devolvendo o foco', async () => {
  const first = desk.getByRole('button', { name: /^Ampliar:/ }).first();
  await first.scrollIntoViewIfNeeded();
  await desk.waitForTimeout(800);
  await first.click();
  const dialog = desk.getByRole('dialog', { name: 'Foto ampliada' });
  await dialog.waitFor({ state: 'visible' });
  await desk.waitForTimeout(600);
  assert((await dialog.innerText()).includes('1 / 7'), 'contador inicial');
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

await test('Todas as imagens carregam (sem 404 e sem erros de console)', async () => {
  await scrollThrough(desk);
  await desk.waitForTimeout(800);
  const broken = await desk.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
  );
  assert(broken.length === 0, `imagens quebradas: ${broken.join(', ')}`);
  assert(desk.problems.length === 0, desk.problems.join('\n'));
});

console.log('\nCelular (390×844, toque)');
const mob = await newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

await test('Menu mobile abre, fecha com Esc e navega', async () => {
  await mob.waitForTimeout(4500);
  const toggle = mob.locator('button[aria-controls="menu-mobile"]');
  await toggle.click();
  await mob.waitForTimeout(1100);
  const menu = mob.locator('#menu-mobile');
  assert((await toggle.getAttribute('aria-expanded')) === 'true', 'aria-expanded');
  assert(await menu.isVisible(), 'menu invisível');
  await mob.keyboard.press('Escape');
  await mob.waitForTimeout(900);
  assert((await toggle.getAttribute('aria-expanded')) === 'false', 'Esc não fechou');
  assert(
    (await mob.evaluate(() => document.activeElement?.getAttribute('aria-controls'))) === 'menu-mobile',
    'foco não voltou ao botão',
  );
  await toggle.click();
  await mob.waitForTimeout(1100);
  await menu.getByRole('link', { name: 'Visite' }).click();
  await mob.waitForTimeout(1800);
  const top = await mob.evaluate(() => document.getElementById('visite').getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `não rolou até Visite (top=${top})`);
});

await test('Barra fixa de WhatsApp aparece depois do hero', async () => {
  await mob.evaluate(() => window.scrollTo(0, document.getElementById('servicos').offsetTop));
  await mob.waitForTimeout(900);
  const bar = mob.locator('a[data-cta="barra-mobile"]');
  const box = await bar.boundingBox();
  assert(box && box.y + box.height <= 844 + 1, 'barra não visível');
});

await test('Sem rolagem horizontal em 320, 375, 768, 1024, 1280 e 1920 px', async () => {
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  for (const width of [320, 375, 768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    await scrollThrough(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 0, `${width}px: ${overflow}px de sobra horizontal`);
  }
  await page.close();
});

console.log('\nprefers-reduced-motion');
await test('Com reduced-motion o conteúdo aparece sem abertura nem animação', async () => {
  const page = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const state = await page.evaluate(() => ({
    motion: document.documentElement.classList.contains('js-motion'),
    intro: getComputedStyle(document.querySelector('.intro')).display,
    h1: getComputedStyle(document.querySelector('h1')).visibility,
  }));
  assert(!state.motion && state.intro === 'none' && state.h1 === 'visible', JSON.stringify(state));
});

await test('Sem JavaScript o site continua legível (HTML pré-renderizado)', async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE);
  const text = await page.locator('body').innerText();
  for (const expected of ['Mais que um corte', 'Serviços', 'Trabalhos', 'Sua vez na cadeira', '(47) 99253-7118']) {
    assert(text.includes(expected), `faltou "${expected}"`);
  }
  await ctx.close();
});

await browser.close();
server?.kill();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} testes passaram`);
process.exit(failed ? 1 : 0);
