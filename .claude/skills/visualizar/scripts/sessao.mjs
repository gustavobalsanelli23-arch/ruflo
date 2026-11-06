/**
 * Browser session behind visualizar.mjs: an iPhone profile on WebKit (Safari's
 * engine) kept open between commands, plus Chromium for desktop screenshots
 * and for the iPhone with glass blur actually painted. Commands arrive as JSON
 * over a local HTTP port written to <state>/sessao.json.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';

const ERROR_KINDS = new Set(['error', 'pageerror', 'requestfailed', 'http', 'crash']);
const LOCALE = process.env.VISUALIZAR_LOCALE || 'pt-BR';
const TIMEZONE = process.env.VISUALIZAR_TIMEZONE || 'America/Sao_Paulo';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

/** Global Playwright first (its browsers are the ones installed), then the project's own. */
function loadPlaywright(projectDir) {
  const origins = [];
  try { origins.push(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'noop.js')); } catch { /* no npm */ }
  origins.push(path.join(projectDir, 'package.json'));
  for (const from of origins) {
    for (const name of ['playwright', '@playwright/test']) {
      try {
        const req = createRequire(from);
        return { pw: req(name), cli: path.join(path.dirname(req.resolve(`${name}/package.json`)), 'cli.js') };
      } catch { /* try the next */ }
    }
  }
  throw new Error('Playwright não encontrado: rode "npm i -g playwright && npx playwright install --with-deps webkit chromium"');
}

/** Launches a browser, downloading it (and its system libraries) the first time it is missing. */
async function launch(type) {
  try {
    return await pw[type].launch();
  } catch (e) {
    if (!/Executable doesn't exist|playwright install/i.test(e.message)) throw e;
    console.log(`${type} ausente; instalando…`);
    const res = spawnSync(process.execPath, [PW_CLI, 'install', '--with-deps', type], { stdio: 'inherit' });
    if (res.status !== 0) throw new Error(`não consegui instalar o ${type}: rode "npx playwright install --with-deps ${type}"`);
    return pw[type].launch();
  }
}

const STATE = arg('state');
const PROJECT = arg('project');
const BASE = arg('base');
const SHOTS = path.join(STATE, 'shots');
const STATE_FILE = path.join(STATE, 'sessao.json');
const DEV_LOG = path.join(STATE, 'dev-server.log');
const { pw, cli: PW_CLI } = loadPlaywright(PROJECT);

let deviceName = arg('device');
let landscape = false;
let context;
let page;
let chromium;
const logs = [];
let seq = 0;
let readSeq = 0;
let markSeq = 0;

const webkit = await launch('webkit');

const push = (kind, text) => {
  logs.push({ seq: ++seq, t: new Date().toISOString().slice(11, 23), kind, text });
  if (logs.length > 1000) logs.shift();
};
const fmt = (l) => `${l.t} [${l.kind}] ${l.text}`;
const profileName = () => (landscape ? `${deviceName} landscape` : deviceName);

async function openContext(url) {
  const profile = pw.devices[profileName()];
  if (!profile) throw new Error(`aparelho desconhecido: "${profileName()}" (veja: devices)`);
  await context?.close();
  context = await webkit.newContext({ ...profile, baseURL: BASE, locale: LOCALE, timezoneId: TIMEZONE });
  context.setDefaultTimeout(10_000);
  page = await context.newPage();
  page.on('console', (m) => {
    const where = m.location()?.url ? ` (${m.location().url}:${m.location().lineNumber})` : '';
    push(m.type(), m.text() + (m.type() === 'error' ? where : ''));
  });
  page.on('pageerror', (e) => push('pageerror', e.stack || e.message));
  page.on('requestfailed', (r) => push('requestfailed', `${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) push('http', `${r.status()} ${r.request().method()} ${r.url()}`); });
  page.on('crash', () => push('crash', 'a página travou'));
  if (url && url !== 'about:blank') await goto(url);
}

async function settle(p = page) {
  await p.waitForLoadState('load').catch(() => {});
  await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(200);
}

async function goto(url) {
  markSeq = seq;
  const res = await page.goto(url);
  await settle();
  return `${res?.status() ?? '-'} ${page.url()} — ${await page.title()}`;
}

function locate(target) {
  if (!target) throw new Error('informe o alvo (veja: help)');
  const m = /^(label|placeholder)=(.+)$/s.exec(target);
  const loc = m ? (m[1] === 'label' ? page.getByLabel(m[2]) : page.getByPlaceholder(m[2])) : page.locator(target);
  return loc.filter({ visible: true });
}

async function first(target) {
  const loc = locate(target);
  const n = await loc.count();
  if (n === 0) throw new Error(`nenhum elemento visível para ${target}`);
  return { el: loc.first(), note: n > 1 ? ` (${n} visíveis; usei o primeiro)` : '' };
}

function shotFile(name, suffix) {
  mkdirSync(SHOTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const slug = (name || 'tela').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return path.join(SHOTS, `${stamp}-${slug}${suffix}.png`);
}

/** Same page in Chromium (desktop, or the iPhone with blur painted), carrying the cookies over. */
async function chromiumShot(kind, file, o) {
  chromium ??= await launch('chromium');
  const profile = kind === 'desktop'
    ? { ...pw.devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    : (({ defaultBrowserType, ...rest }) => rest)(pw.devices[profileName()]);
  const ctx = await chromium.newContext({ ...profile, locale: LOCALE, timezoneId: TIMEZONE });
  try {
    await ctx.addCookies(await context.cookies());
    const p = await ctx.newPage();
    await p.goto(page.url());
    await settle(p);
    await p.screenshot({ path: file, fullPage: !!o.full, scale: o.hd ? 'device' : 'css', animations: 'disabled' });
  } finally {
    await ctx.close();
  }
  return file;
}

async function status() {
  const vp = page.viewportSize();
  return [
    `aparelho: ${deviceName}${landscape ? ' (paisagem)' : ''} — ${vp?.width}x${vp?.height}, WebKit ${webkit.version()}`,
    `página: ${page.url()} — ${await page.title().catch(() => '')}`,
    `screenshots: ${SHOTS}`,
  ].join('\n');
}

const handlers = {
  ping: async () => 'ok',
  status,
  open: async ([url]) => goto(url || '/'),
  back: async () => { await page.goBack(); await settle(); return page.url(); },
  reload: async () => { markSeq = seq; await page.reload(); await settle(); return page.url(); },

  async shot([name], o) {
    const out = [];
    if (o.desktop || o.both) out.push(`desktop: ${await chromiumShot('desktop', shotFile(name, '-desktop'), o)}`);
    if (o.chromium) out.push(`iPhone (Chromium, com desfoque): ${await chromiumShot('iphone', shotFile(name, '-iphone-chromium'), o)}`);
    if (!o.desktop && !o.chromium) {
      const file = shotFile(name, '-iphone');
      await page.screenshot({ path: file, fullPage: !!o.full, scale: o.hd ? 'device' : 'css', animations: 'disabled' });
      out.unshift(`iPhone: ${file}`);
      // Linux WebKit reports backdrop-filter support but never paints it.
      const glass = await page.evaluate(() => [...document.querySelectorAll('body *')].some((el) => {
        const s = getComputedStyle(el);
        const f = s.backdropFilter || s.webkitBackdropFilter;
        return f && f !== 'none' && el.getBoundingClientRect().width > 0;
      }));
      if (glass) out.push('aviso: há camadas de vidro (backdrop-filter); este WebKit não desenha o desfoque e o fundo aparece nítido. No iPhone real fica borrado. Para ver o efeito: shot --chromium');
    }
    return out.join('\n');
  },

  async tap([target]) {
    const { el, note } = await first(target);
    const before = page.url();
    const href = await el.evaluate((node) => node.closest('a[href]')?.href ?? null);
    await el.tap();
    // Dev servers compile a route on its first visit: give a link time to land.
    if (href && href.split('#')[0] !== before.split('#')[0]) {
      markSeq = seq;
      await page.waitForURL((u) => u.href !== before, { timeout: 30_000 }).catch(() => {});
    } else {
      await page.waitForURL((u) => u.href !== before, { timeout: 1000 }).catch(() => {});
    }
    await settle();
    return `tocado: ${target}${note} → ${page.url()}`;
  },

  async type([target, text = ''], o) {
    const { el, note } = await first(target);
    await el.fill(text);
    if (o.enter) { await el.press('Enter'); await settle(); }
    return `preenchido: ${target}${note}`;
  },

  press: async ([key]) => { await page.keyboard.press(key); await settle(); return `tecla: ${key}`; },

  async scroll([where = '600']) {
    if (/^-?\d+$/.test(where)) await page.evaluate((dy) => window.scrollBy(0, dy), Number(where));
    else await (await first(where)).el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    return `rolagem: y=${await page.evaluate(() => Math.round(window.scrollY))}`;
  },

  async tree([target]) {
    const loc = page.locator(target || 'body');
    if ((await loc.count()) === 0) throw new Error(`nada encontrado para ${target} (use um seletor CSS, ex.: header, nav, main, ou role=…)`);
    return loc.first().ariaSnapshot();
  },

  async logs(_, o) {
    const list = o.all ? logs : logs.filter((l) => l.seq > readSeq);
    readSeq = seq;
    return list.length ? list.map(fmt).join('\n') : '(nenhum registro novo)';
  },

  async check() {
    // Client-side routers swap <head> while navigating; let it land.
    await page.waitForSelector('meta[name=viewport]', { state: 'attached', timeout: 3000 }).catch(() => {});
    const info = await page.evaluate(() => {
      // 1px "sr-only" elements are hidden on purpose: skip them.
      const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
      const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || el.tagName).trim().slice(0, 40);
      const zoomInputs = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), textarea, select')]
        .filter((el) => visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16).map(label);
      // A field inside an input group is tapped through the whole group box.
      const hitBox = (el) => (el.closest('[data-slot=input-group]') ?? el).getBoundingClientRect();
      const smallTargets = [...document.querySelectorAll('a[href], button, [role=button], input, select, textarea')]
        .filter((el) => { if (!visible(el)) return false; const r = hitBox(el); return r.width < 24 || r.height < 24; })
        .map((el) => { const r = hitBox(el); return `${label(el)} (${Math.round(r.width)}x${Math.round(r.height)})`; });
      return {
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: [...document.querySelectorAll('h1')].filter(visible).map((h) => h.textContent.trim()),
        viewportMeta: document.querySelector('meta[name=viewport]')?.content ?? null,
        zoomInputs,
        smallTargets,
      };
    });
    const errors = logs.filter((l) => l.seq > markSeq && ERROR_KINDS.has(l.kind));
    const problems = [];
    if (info.overflowX > 0) problems.push(`rolagem horizontal de ${info.overflowX}px`);
    if (!info.viewportMeta) problems.push('sem <meta name="viewport"> (no celular a página abre como no desktop, miniaturizada)');
    if (info.zoomInputs.length) problems.push(`campos com fonte < 16px (o Safari dá zoom ao focar): ${info.zoomInputs.join(', ')}`);
    if (errors.length) problems.push(`${errors.length} erro(s) desde a última navegação:\n  ${errors.map(fmt).join('\n  ')}`);
    return [
      `${page.url()} — h1: ${info.h1.join(' | ') || '(nenhum)'}`,
      problems.length ? `PROBLEMAS:\n- ${problems.join('\n- ')}` : 'OK: sem rolagem horizontal, sem erros, sem zoom de campo',
      info.smallTargets.length ? `atenção, alvos de toque < 24px: ${info.smallTargets.slice(0, 12).join('; ')}` : '',
    ].filter(Boolean).join('\n');
  },

  async eval([expr]) {
    const v = await page.evaluate(expr);
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  },
  async device([name]) { deviceName = name; landscape = false; await openContext(page.url()); return status(); },
  async rotate() { landscape = !landscape; await openContext(page.url()); return status(); },
  async restart() { await openContext(page.url()); return `reaberto do zero\n${await status()}`; },
  devices: async () => Object.keys(pw.devices).filter((n) => /iPhone|iPad/.test(n) && !/landscape/.test(n)).join('\n'),
  async server() {
    if (!existsSync(DEV_LOG) || !readFileSync(DEV_LOG, 'utf8').trim()) return 'o servidor não foi iniciado pela skill; veja o terminal onde ele roda';
    return readFileSync(DEV_LOG, 'utf8').split('\n').slice(-40).join('\n');
  },
};

await openContext(BASE);
const srv = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    const { cmd, args = [], opts: o = {} } = JSON.parse(body || '{}');
    const reply = (obj) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };
    if (cmd === 'stop') {
      // Drop the state file first so no client can reach a closing session.
      rmSync(STATE_FILE, { force: true });
      srv.close();
      const devPid = Number(process.env.VISUALIZAR_DEV_PID);
      reply({ ok: true, out: `sessão fechada${devPid ? ' (e o servidor de desenvolvimento que ela subiu)' : ''}` });
      await Promise.allSettled([webkit.close(), chromium?.close()]);
      if (devPid) { try { process.kill(-devPid); } catch { /* already gone */ } }
      return process.exit(0);
    }
    const fn = handlers[cmd];
    if (!fn) return reply({ ok: false, error: `comando desconhecido: ${cmd} (veja: help)` });
    try { reply({ ok: true, out: await fn(args, o) }); } catch (e) { reply({ ok: false, error: e.message.split('\n')[0] }); }
  });
});
srv.listen(0, '127.0.0.1', () => {
  writeFileSync(STATE_FILE, JSON.stringify({ port: srv.address().port, pid: process.pid, device: deviceName, base: BASE, project: PROJECT }));
});
