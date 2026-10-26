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
// A cena 3D do hero desenha sem parar e, sem GPU (Chromium de teste), custa
// muita CPU: só os testes do hero a carregam (scene3d); nos demais o pedaço
// dela é bloqueado e fica o quadro parado — o mesmo caminho de quem não tem WebGL.
const newPage = async (opts = {}, { go = true, scene3d = false } = {}) => {
  const ctx = await browser.newContext({ locale: 'pt-BR', ...opts });
  if (!scene3d) await ctx.route(/\/assets\/vopScene-[\w-]+\.js$/, (route) => route.abort());
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  const ours = (url) => !url || url.startsWith(BASE);
  // Avisos de desempenho do driver de GL (o Chromium de teste desenha sem GPU) não são erros do site.
  const driverNote = (text) => /GL Driver Message|GPU stall/.test(text);
  const blocked = (url) => !scene3d && /vopScene-/.test(url ?? '');
  page.on('console', (m) => {
    if (!['error', 'warning'].includes(m.type()) || !ours(m.location().url) || driverNote(m.text()) || blocked(m.location().url)) return;
    page.problems.push(`console: ${m.text()}`);
  });
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
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  assert(h1 === 'Mais do que encontrar imóveis. Construir patrimônio.', `h1 no HTML: ${h1}`);
  for (const id of ['inicio', 'inteligencia', 'imoveis', 'investimentos', 'regioes', 'sobre', 'contato']) assert(html.includes(`id="${id}"`), `seção #${id}`);
  assert(html.includes('"@type":"RealEstateAgent"'), 'JSON-LD');
  assert(!html.includes('areaServed'), 'regiões não confirmadas não entram no JSON-LD');
  assert(html.includes('og:image') && html.includes('href="/images/hero/casa-vop.avif" media="(min-aspect-ratio: 1/1)"'), 'OG e preload do quadro do hero');
  assert(/<html[^>]*class="no-js"/.test(html) && html.includes("d.classList.add('anim')"), 'coreografia de entrada (classe anim) no <head>');
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

await test('hero: o quadro parado pinta primeiro; depois do load a cena 3D da casa VOP entra por cima', async () => {
  const page = await newPage(desktop, { scene3d: true });
  const bg = await page.locator('#inicio .st-bg').evaluate((el) => ({ img: getComputedStyle(el).backgroundImage, hidden: el.getAttribute('aria-hidden') }));
  assert(bg.img.includes('/images/hero/casa-vop') && bg.hidden === 'true', JSON.stringify(bg));
  assert((await page.locator('#inicio video').count()) === 0, 'sem vídeo no hero');
  await page.waitForSelector('#inicio canvas[data-ready].on', { timeout: 30000 });
  assert((await page.locator('#inicio canvas').getAttribute('data-chapter')) === '0', 'cena no 1º capítulo');
  assert(page.problems.length === 0, page.problems.join('\n'));
  await page.context().close();
});

await test('hero: capítulos movem a câmera e trocam o texto; clique rápido vale o último', async () => {
  const page = await newPage(desktop, { scene3d: true });
  await page.waitForSelector('#inicio canvas[data-ready]', { timeout: 30000 });
  const rail = page.getByRole('list', { name: 'Capítulos' });
  await rail.getByRole('button', { name: 'INVESTIMENTOS' }).click();
  await rail.getByRole('button', { name: 'CRÉDITO' }).click();
  await page.waitForFunction(() => document.querySelector('#inicio h1')?.textContent.includes('Crédito imobiliário'), null, { timeout: 3000 });
  assert((await page.locator('#inicio canvas').getAttribute('data-chapter')) === '4', 'câmera no capítulo Crédito');
  assert((await rail.locator('[aria-current="step"]').textContent()).includes('CRÉDITO'), 'trilho marca o capítulo');
  await page.waitForFunction(() => !document.querySelector('#inicio').classList.contains('swapping'), null, { timeout: 2000 });
  assert(page.problems.length === 0, page.problems.join('\n'));
  await page.context().close();
});

await test('hero: 3D ON/OFF pausa e retoma a cena', async () => {
  const page = await newPage(desktop, { scene3d: true });
  await page.waitForSelector('#inicio canvas[data-ready]', { timeout: 30000 });
  await page.getByRole('button', { name: 'Pausar a animação 3D' }).click();
  await page.getByRole('button', { name: 'Retomar a animação 3D' }).waitFor({ timeout: 2000 });
  assert((await page.locator('#inicio .audio').getAttribute('class')).includes('muted'), 'estado pausado');
  await page.getByRole('button', { name: 'Retomar a animação 3D' }).click();
  await page.getByRole('button', { name: 'Pausar a animação 3D' }).waitFor({ timeout: 2000 });
  await page.context().close();
});

await test('celular: título, CTA e dock cabem na primeira tela', async () => {
  const page = await newPage(phone);
  await page.waitForTimeout(1500);
  const boxes = await page.evaluate(() =>
    ['#inicio h1', '#inicio .cta', '#inicio .dock'].map((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { sel, top: r.top, bottom: r.bottom };
    }),
  );
  for (const b of boxes) assert(b.top >= 0 && b.bottom <= 844, `${b.sel} fora da tela (${Math.round(b.top)}–${Math.round(b.bottom)})`);
  await page.context().close();
});

await test('reduzir movimento: sem vídeo, conteúdo visível sem animação', async () => {
  const page = await newPage({ ...desktop, reducedMotion: 'reduce' });
  await page.waitForTimeout(800);
  assert((await page.locator('video[src]').count()) === 0, 'vídeo carregado com reduced-motion');
  assert((await page.locator('#inicio canvas[data-ready]').count()) === 0, 'cena 3D carregada com reduced-motion');
  assert(!(await page.evaluate(() => document.documentElement.classList.contains('anim'))), 'coreografia de entrada com reduced-motion');
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
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'INVESTIMENTOS', exact: true }).click();
  await page.waitForFunction(() => Math.abs(document.querySelector('#investimentos').getBoundingClientRect().top) < 120, null, { timeout: 5000 });
  const current = await page.locator('[aria-current="location"]').first().textContent();
  assert(current?.includes('INVESTIMENTOS'), `ativo: ${current}`);
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

const liveText = () => document.querySelector('[aria-labelledby="percurso-titulo"] [aria-live=polite]')?.textContent ?? '';

await test('percurso 3D: abre do card, entra, caminha (botão, teclado, rolagem, trilho), ficha, fim, Esc devolve o foco', async () => {
  const page = await newPage(desktop);
  await page.locator('#imoveis').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const opener = page.getByRole('button', { name: /Residência contemporânea/ });
  await opener.click();
  const tour = page.getByRole('dialog', { name: /Percurso pelo imóvel Residência contemporânea/ });
  await tour.waitFor();
  assert(await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'), 'rolagem travada');
  assert((await tour.locator('.t3-panel').count()) === 4, 'um painel 3D por ambiente');
  const live = tour.locator('[aria-live=polite]');
  await tour.getByRole('button', { name: 'ENTRAR NO IMÓVEL', exact: true }).click();
  await page.waitForFunction((t) => (0, eval)(t)().includes('Ambiente 1 de 4: Fachada'), liveText.toString(), { timeout: 3000 });
  await page.waitForTimeout(1250);
  await tour.getByRole('button', { name: 'Próximo ambiente' }).click();
  await page.waitForFunction((t) => (0, eval)(t)().includes('Ambiente 2 de 4: Hall de entrada'), liveText.toString(), { timeout: 3000 });
  await page.waitForTimeout(1250);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((t) => (0, eval)(t)().includes('Living'), liveText.toString(), { timeout: 3000 });
  await page.waitForTimeout(1600);
  assert(await tour.getByRole('button', { name: 'Lareira embutida' }).isVisible(), 'ponto de interesse do living');
  // A câmera parou diante do living: o painel dele está na frente (z = 0 relativo).
  await page.waitForFunction(() => /translate3d\([^,]+, 0px, 3000px\)/.test(document.querySelector('.t3-world').style.transform), null, { timeout: 4000 });
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 120);
  await page.waitForFunction((t) => (0, eval)(t)().includes('Cozinha'), liveText.toString(), { timeout: 3000 });
  await tour.getByRole('button', { name: '01 FACHADA' }).click();
  await page.waitForFunction((t) => (0, eval)(t)().includes('Ambiente 1 de 4'), liveText.toString(), { timeout: 3000 });
  await tour.getByRole('button', { name: 'FICHA DO IMÓVEL' }).click();
  const ficha = tour.getByRole('complementary', { name: 'Ficha do imóvel' });
  await ficha.waitFor();
  assert(await ficha.getByText('Código EX-01', { exact: true }).isVisible(), 'código na ficha');
  assert(await ficha.getByText(/Imóvel demonstrativo/).isVisible(), 'aviso de demonstração');
  assert((await ficha.getByRole('link', { name: 'Quero conhecer este imóvel' }).getAttribute('href')) === DIRECT, 'CTA da ficha');
  await page.keyboard.press('Escape');
  await ficha.waitFor({ state: 'detached', timeout: 3000 });
  assert((await tour.count()) === 1, 'Esc com a ficha aberta deve fechar só a ficha');
  // Um passo por gesto: espera a viagem do salto terminar antes de seguir.
  await page.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1250);
  }
  await live.filter({ hasText: 'Fim do percurso' }).waitFor({ timeout: 3000 });
  assert(await tour.getByRole('button', { name: 'Refazer o percurso' }).isVisible(), 'fim do percurso');
  await page.keyboard.press('Escape');
  await tour.waitFor({ state: 'detached', timeout: 3000 });
  assert(await opener.evaluate((el) => el === document.activeElement), 'foco não voltou ao card');
  assert(await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden'), 'rolagem destravada');
  assert(page.problems.length === 0, page.problems.join('\n'));
  await page.context().close();
});

await test('ENTRAR no cabeçalho abre o percurso do primeiro imóvel', async () => {
  const page = await newPage(desktop);
  await page.getByRole('button', { name: 'Entrar: percorrer um imóvel em 3D' }).click();
  await page.getByRole('dialog', { name: /Percurso pelo imóvel Residência contemporânea/ }).waitFor({ timeout: 3000 });
  await page.context().close();
});

await test('percurso no celular: deslizar entra e avança para o próximo ambiente', async () => {
  const page = await newPage(phone);
  await page.locator('#imoveis').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Casa em condomínio fechado/ }).click();
  const tour = page.getByRole('dialog', { name: /Percurso pelo imóvel Casa em condomínio/ });
  await tour.waitFor();
  await page.waitForTimeout(1200);
  const swipe = async () => {
    await tour.dispatchEvent('touchstart', { touches: [{ identifier: 0, clientX: 200, clientY: 600 }], changedTouches: [{ identifier: 0, clientX: 200, clientY: 600 }] });
    await tour.dispatchEvent('touchend', { touches: [], changedTouches: [{ identifier: 0, clientX: 200, clientY: 380 }] });
  };
  await swipe();
  await page.waitForFunction((t) => (0, eval)(t)().includes('Ambiente 1 de 3: Fachada'), liveText.toString(), { timeout: 3000 });
  await page.waitForTimeout(1250);
  await swipe();
  await page.waitForFunction((t) => (0, eval)(t)().includes('Ambiente 2 de 3: Sala'), liveText.toString(), { timeout: 3000 });
  assert(page.problems.length === 0, page.problems.join('\n'));
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

await test('celular: MENU abre o painel, Esc fecha e devolve o foco, link navega e fecha', async () => {
  const page = await newPage(phone);
  const toggle = page.getByRole('button', { name: 'MENU', exact: true });
  const sobre = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'SOBRE', exact: true });
  assert(!(await sobre.isVisible()), 'painel aberto antes do toque');
  await toggle.click();
  assert((await page.locator('.menu-toggle').getAttribute('aria-expanded')) === 'true', 'aria-expanded');
  await sobre.waitFor({ state: 'visible', timeout: 2000 });
  assert(await page.getByRole('button', { name: 'FECHAR', exact: true }).isVisible(), 'rótulo FECHAR');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  assert(!(await sobre.isVisible()), 'Esc não fechou');
  assert(await page.evaluate(() => document.activeElement?.classList.contains('menu-toggle')), 'foco não voltou ao MENU');
  await page.locator('.menu-toggle').click();
  await sobre.waitFor({ state: 'visible', timeout: 2000 });
  await sobre.click();
  await page.waitForTimeout(500);
  assert(!(await sobre.isVisible()), 'painel ficou aberto');
  await page.waitForFunction(() => Math.abs(document.querySelector('#sobre').getBoundingClientRect().top) < 120, null, { timeout: 5000 });
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
