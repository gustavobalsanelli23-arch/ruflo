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
const BASE = process.env.BASE_URL ?? 'http://localhost:4176/';
const DIRECT = 'https://ig.me/m/vop_investimentos';
const PROFILE = 'https://www.instagram.com/vop_investimentos/';

let server;
if (!process.env.BASE_URL) {
  server = spawn('npx', ['vite', 'preview', '--port', '4176', '--strictPort'], { cwd: root, stdio: 'ignore' });
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
    console.log(`  ✗ ${name}\n    ${error.message.split('\n')[0]}`);
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
  const ours = (url) => !url || url.startsWith(BASE);
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && ours(m.location().url) && page.problems.push(`console: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && ours(r.url()) && page.problems.push(`HTTP ${r.status()} ${r.url()}`));
  if (go) await page.goto(BASE, { waitUntil: 'load' });
  return page;
};
const desktop = { viewport: { width: 1440, height: 900 } };
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const scrollThrough = async (page) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
};
/** Elementos com entrada animada que ficaram escondidos (opacidade < 0.99). */
const hiddenReveals = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal]')]
      .filter((el) => el.getClientRects().length && parseFloat(getComputedStyle(el).opacity) < 0.99)
      .map((el) => (el.textContent || el.className).toString().trim().slice(0, 40)),
  );

console.log(`\nVOP Investimentos — e2e em ${BASE}\n`);

await test('HTML pré-renderizado traz título, h1, seções e JSON-LD', async () => {
  const html = await (await fetch(BASE)).text();
  assert(html.includes('<title>VOP Investimentos Imobiliários'), 'title');
  assert(/<h1[^>]*>.*Mais do que encontrar imóveis\. Construir patrimônio\./s.test(html), 'h1 no HTML');
  for (const id of ['inicio', 'inteligencia', 'imoveis', 'investimentos', 'regioes', 'sobre', 'contato']) assert(html.includes(`id="${id}"`), `seção #${id}`);
  assert(html.includes('"@type":"RealEstateAgent"'), 'JSON-LD');
  assert(!html.includes('areaServed'), 'regiões não confirmadas não entram no JSON-LD');
  assert(html.includes('og:image') && html.includes('rel="preload" as="image"'), 'OG e preload do pôster');
  assert(!html.includes('__SITE_URL__'), 'placeholder de URL resolvido');
});

await test('desktop: sem erros, tudo revelado após a rolagem, um único h1', async () => {
  const page = await newPage(desktop);
  await scrollThrough(page);
  const hidden = await hiddenReveals(page);
  assert(hidden.length === 0, `ainda escondidos: ${hidden.slice(0, 5).join(' | ')}`);
  assert((await page.locator('h1').count()) === 1, 'um h1');
  assert(page.problems.length === 0, page.problems.join('\n'));
  await page.context().close();
});

await test('hero: vídeo começa invisível, entra em fade e o pôster sai', async () => {
  const page = await newPage(desktop);
  const video = page.locator('#inicio video');
  await video.waitFor({ state: 'attached', timeout: 5000 });
  await page.waitForFunction(() => {
    const v = document.querySelector('#inicio video');
    return v && v.currentSrc.includes('hero-arquitetura-1280.mp4') && parseFloat(getComputedStyle(v).opacity) > 0.95;
  }, null, { timeout: 8000 });
  const attrs = await video.evaluate((v) => ({ muted: v.muted, inline: v.playsInline, auto: v.autoplay, preload: v.preload, hidden: v.getAttribute('aria-hidden') }));
  assert(attrs.muted && attrs.inline && attrs.auto && attrs.preload === 'auto' && attrs.hidden === 'true', JSON.stringify(attrs));
  await page.waitForTimeout(1300);
  const posterOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('#inicio picture').parentElement).opacity);
  assert(posterOpacity === '0', `pôster ainda visível (${posterOpacity})`);
  await page.context().close();
});

await test('hero: sequência avança para o próximo clipe com fade-out antes do fim', async () => {
  const page = await newPage(desktop);
  await page.waitForFunction(() => document.querySelector('#inicio video')?.readyState >= 2, null, { timeout: 8000 });
  // Pula para perto do fim: o fade-out (0,55s) começa e o próximo clipe entra.
  await page.evaluate(() => {
    const v = document.querySelector('#inicio video');
    v.currentTime = v.duration - 0.8;
  });
  await page.waitForFunction(() => parseFloat(document.querySelector('#inicio video').style.opacity) === 0, null, { timeout: 4000 });
  await page.waitForFunction(() => document.querySelector('#inicio video').currentSrc.includes('hero-interiores'), null, { timeout: 6000 });
  await page.waitForFunction(() => document.querySelector('#inicio video').style.opacity === '1', null, { timeout: 6000 });
  await page.context().close();
});

await test('hero: botão pausa e retoma o vídeo', async () => {
  const page = await newPage(desktop);
  await page.waitForFunction(() => !document.querySelector('#inicio video')?.paused, null, { timeout: 8000 });
  await page.getByRole('button', { name: 'Pausar o vídeo de fundo' }).click();
  assert(await page.locator('#inicio video').evaluate((v) => v.paused), 'não pausou');
  await page.getByRole('button', { name: 'Retomar o vídeo de fundo' }).click();
  await page.waitForFunction(() => !document.querySelector('#inicio video').paused, null, { timeout: 3000 });
  await page.context().close();
});

await test('celular em pé recebe o vídeo em retrato', async () => {
  const page = await newPage(phone);
  await page.waitForFunction(() => document.querySelector('#inicio video')?.currentSrc.includes('-540.mp4'), null, { timeout: 8000 });
  await page.context().close();
});

await test('reduzir movimento: sem vídeo, conteúdo visível sem animação', async () => {
  const page = await newPage({ ...desktop, reducedMotion: 'reduce' });
  await page.waitForTimeout(800);
  assert((await page.locator('video').count()) === 0, 'vídeo carregado com reduced-motion');
  const hidden = await hiddenReveals(page);
  const heroHidden = hidden.filter((t) => /Mais|Construir|Conectamos/.test(t));
  assert(heroHidden.length === 0, `hero escondido: ${heroHidden.join(' | ')}`);
  await page.context().close();
});

await test('sem JavaScript: todo o conteúdo aparece', async () => {
  const page = await newPage({ ...desktop, javaScriptEnabled: false });
  const hidden = await hiddenReveals(page);
  assert(hidden.length === 0, `escondidos sem JS: ${hidden.slice(0, 5).join(' | ')}`);
  assert(await page.getByRole('heading', { level: 2, name: /O próximo capítulo/ }).isVisible(), 'seção de imóveis');
  await page.context().close();
});

await test('menu: âncoras levam às seções e o link ativo acompanha', async () => {
  const page = await newPage(desktop);
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Investimentos', exact: true }).click();
  await page.waitForTimeout(1500);
  const top = await page.locator('#investimentos').evaluate((el) => el.getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `seção fora do lugar (${top})`);
  const current = await page.locator('[aria-current="location"]').first().textContent();
  assert(current?.includes('Investimentos'), `ativo: ${current}`);
  await page.context().close();
});

await test('CTAs "Fale com um especialista" abrem o Direct (sem WhatsApp confirmado)', async () => {
  const page = await newPage(desktop);
  const hrefs = await page.locator('a', { hasText: 'Fale com um especialista' }).evaluateAll((els) => els.map((a) => [a.href, a.target, a.rel]));
  assert(hrefs.length >= 2, `CTAs: ${hrefs.length}`);
  for (const [href, target, rel] of hrefs) assert(href === DIRECT && target === '_blank' && rel.includes('noopener'), `${href} ${target} ${rel}`);
  assert((await page.locator(`footer a[href="${PROFILE}"]`).count()) === 1, 'Instagram no rodapé');
  assert((await page.locator('a[href^="https://wa.me"]').count()) === 0, 'link de WhatsApp sem número confirmado');
  await page.context().close();
});

await test('filtros: finalidade, tipo, região, preço, vazio e limpar', async () => {
  const page = await newPage(desktop);
  await page.locator('#imoveis').scrollIntoViewIfNeeded();
  const cards = page.locator('#imoveis article');
  await page.waitForTimeout(800);
  assert((await cards.count()) === 5, `inicial: ${await cards.count()}`);
  await page.getByRole('radio', { name: 'Investir' }).click();
  await page.waitForTimeout(900);
  assert((await cards.count()) === 3, `investir: ${await cards.count()}`);
  assert((await page.getByRole('status').filter({ hasText: 'imóveis' }).textContent()).includes('3 imóveis'), 'contagem');
  await page.getByLabel('Localização').selectOption('Barueri');
  await page.waitForTimeout(900);
  assert((await cards.count()) === 1, `investir + Barueri: ${await cards.count()}`);
  await page.getByLabel('Tipo de imóvel').selectOption('Casa');
  await page.waitForTimeout(900);
  assert((await cards.count()) === 0, 'deveria ficar vazio');
  assert(await page.getByText('Nenhum imóvel com esses filtros.').isVisible(), 'estado vazio');
  await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
  await page.waitForTimeout(900);
  assert((await cards.count()) === 5, 'limpar');
  await page.getByLabel('Faixa de preço').selectOption('acima-5');
  await page.waitForTimeout(900);
  assert((await cards.count()) === 1, 'acima de 5 mi');
  assert(page.problems.length === 0, page.problems.join('\n'));
  await page.context().close();
});

await test('detalhe do imóvel: abre, troca foto (botão e teclado), fecha com Esc e devolve o foco', async () => {
  const page = await newPage(desktop);
  await page.locator('#imoveis').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const opener = page.getByRole('button', { name: /Residência contemporânea/ });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Residência contemporânea' });
  await dialog.waitFor();
  assert(await dialog.getByText('Imóvel demonstrativo').isVisible(), 'aviso de demonstração');
  assert(await dialog.getByText('Código EX-01', { exact: true }).isVisible(), 'código');
  await dialog.getByRole('button', { name: 'Próxima foto' }).click();
  await page.waitForTimeout(500);
  assert((await dialog.locator('[aria-live=polite]').textContent()).includes('2 / 2'), 'foto 2');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  assert((await dialog.locator('[aria-live=polite]').textContent()).includes('1 / 2'), 'volta à foto 1');
  const cta = await dialog.getByRole('link', { name: 'Quero conhecer este imóvel' }).getAttribute('href');
  assert(cta === DIRECT, cta);
  assert(await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'), 'rolagem travada');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached', timeout: 3000 });
  assert(await opener.evaluate((el) => el === document.activeElement), 'foco não voltou ao card');
  await page.context().close();
});

await test('formulário: valida, mostra erros e entrega pelo Direct com a mensagem copiada', async () => {
  const page = await newPage(desktop);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.locator('#contato').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const submit = page.getByRole('button', { name: 'Copiar mensagem e abrir o Direct' });
  await submit.click();
  assert(await page.getByText('Informe seu nome.').isVisible(), 'erro de nome');
  assert(await page.getByText('Autorize o contato para continuar.').isVisible(), 'erro de autorização');
  assert(await page.getByLabel('Nome').evaluate((el) => el === document.activeElement), 'foco no primeiro erro');
  await page.getByLabel('Nome').fill('Ana Souza');
  await page.getByLabel('Telefone ou WhatsApp').fill('11988887777');
  assert((await page.getByLabel('Telefone ou WhatsApp').inputValue()) === '(11) 98888-7777', 'máscara');
  await page.getByLabel('Assunto', { exact: true }).selectOption('Investir em imóveis');
  await page.getByLabel('Mensagem (opcional)').fill('Procuro apartamento em Barueri.');
  await page.getByLabel(/Autorizo a VOP/).check();
  const popup = page.waitForEvent('popup');
  await submit.click();
  const opened = await popup;
  assert(opened.url().startsWith('https://ig.me/m/vop_investimentos') || opened.url().includes('instagram.com'), `abriu ${opened.url()}`);
  await opened.close();
  await page.getByText('Mensagem copiada.').waitFor({ timeout: 3000 });
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  assert(clip.includes('Ana Souza') && clip.includes('Investir em imóveis') && clip.includes('(11) 98888-7777'), `clipboard: ${clip}`);
  await page.context().close();
});

await test('celular: menu abre, prende o foco, navega e fecha', async () => {
  const page = await newPage(phone);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await menu.waitFor();
  assert(await page.evaluate(() => document.activeElement?.textContent?.includes('Início')), 'foco no primeiro link');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('header, #menu-movel')));
  assert(inside, 'foco escapou do menu');
  await menu.getByRole('link', { name: 'Sobre' }).click();
  await menu.waitFor({ state: 'detached', timeout: 3000 });
  await page.waitForTimeout(1200);
  const top = await page.locator('#sobre').evaluate((el) => el.getBoundingClientRect().top);
  assert(Math.abs(top) < 120, `#sobre em ${top}`);
  await page.context().close();
});

await test('sem rolagem horizontal de 320px a 1920px', async () => {
  for (const width of [320, 390, 768, 1024, 1280, 1920]) {
    const page = await newPage({ viewport: { width, height: 900 }, isMobile: width < 800, hasTouch: width < 800 });
    await scrollThrough(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(over <= 0, `${width}px: ${over}px de sobra`);
    assert(page.problems.length === 0, `${width}px: ${page.problems.join(' | ')}`);
    await page.context().close();
  }
});

await test('estabilidade de layout (CLS < 0.05) na primeira dobra', async () => {
  for (const opts of [desktop, phone]) {
    const page = await newPage(opts, { go: false });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const cls = await page.evaluate(() => window.__cls);
    assert(cls < 0.05, `CLS ${cls.toFixed(3)} em ${opts.viewport.width}px`);
    await page.context().close();
  }
});

await test('acessibilidade básica: alt, rótulos e um link para pular ao conteúdo', async () => {
  const page = await newPage(desktop);
  const noAlt = await page.locator('img:not([alt])').count();
  assert(noAlt === 0, `${noAlt} imagens sem alt`);
  const unlabeled = await page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')].filter((el) => !el.labels?.length && !el.getAttribute('aria-label')).length,
  );
  assert(unlabeled === 0, `${unlabeled} campos sem rótulo`);
  const btnNoName = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby')).length);
  assert(btnNoName === 0, `${btnNoName} botões sem nome`);
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement?.textContent)) === 'Pular para o conteúdo', 'skip link');
  await page.context().close();
});

await browser.close();
server?.kill();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passaram\n`);
process.exit(failed ? 1 : 0);
