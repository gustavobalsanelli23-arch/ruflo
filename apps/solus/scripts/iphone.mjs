#!/usr/bin/env node
/**
 * iPhone preview for SOLUS: Safari's engine (WebKit) with an iPhone profile
 * (viewport, pixel density, touch, iOS user agent), kept open between short
 * commands so Claude Code can look at the running app and use it.
 *
 * It is not the Xcode iOS Simulator (that only exists on macOS); it is the
 * same rendering engine Safari uses on the iPhone, which is what a web app
 * runs on there. Workflow and limits: CLAUDE.md in this app.
 *
 *   node scripts/iphone.mjs help
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = path.join(APP_DIR, '.iphone');
const SHOTS_DIR = path.join(STATE_DIR, 'shots');
const STATE_FILE = path.join(STATE_DIR, 'daemon.json');
const DEV_LOG = path.join(STATE_DIR, 'dev-server.log');
const DEFAULT_DEVICE = process.env.IPHONE_DEVICE || 'iPhone 17 Pro';
const DEFAULT_BASE = process.env.IPHONE_BASE_URL || 'http://localhost:3000';
const ERROR_KINDS = new Set(['error', 'pageerror', 'requestfailed', 'http', 'crash']);

const HELP = `iPhone (WebKit/Safari) para o SOLUS — comandos:

  start [--device "iPhone 17 Pro"] [--base URL] [--no-serve]
                       abre o iPhone; sobe o "npm run dev" se nada responder na URL base
  open <caminho|URL>   navega (ex.: open /demo/visao-geral)
  shot [nome] [--full] [--hd]
                       screenshot; imprime o caminho do PNG (--full: página inteira,
                       --hd: na densidade real do aparelho)
  tap <alvo>           toca num elemento visível
  type <alvo> <texto> [--enter]
                       preenche um campo
  press <tecla>        tecla (Enter, Tab, Escape…)
  scroll <px|alvo>     rola a página (ex.: scroll 600) ou até um elemento
  tree [alvo]          árvore de acessibilidade (o que há na tela e como tocar)
  logs [--all]         console, erros de página, requisições com falha (novos desde a última leitura)
  check                verificação de iPhone: rolagem horizontal, erros, campos que dão
                       zoom no foco (fonte < 16px), alvos de toque < 24px
  eval <expressão>     avalia JavaScript na página
  back | reload        voltar | recarregar
  device <nome>        troca o aparelho (ex.: device "iPhone SE")
  rotate               alterna retrato/paisagem
  restart              reabre o app do zero (sem cookies nem estado)
  devices              lista os aparelhos disponíveis
  server               últimas linhas do log do servidor de desenvolvimento
  status | stop        estado da sessão | fecha tudo

  <alvo>: role=button[name="Entrar"] · text=Lucro · label=E-mail ·
          placeholder=Buscar · ou um seletor CSS (nav a[href="/demo/estoque"])
`;

// ---------- client ----------

function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key.startsWith('no-')) opts[key.slice(3)] = false;
      else if (['device', 'base', 'port'].includes(key)) opts[key] = argv[++i];
      else opts[key] = true;
    } else pos.push(a);
  }
  return { pos, opts };
}

function readState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return null; }
}

function post(port, body, timeout = 120_000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { host: '127.0.0.1', port, path: '/', method: 'POST', headers: { 'content-type': 'application/json' }, timeout },
      (res) => {
        let out = '';
        res.on('data', (c) => (out += c));
        res.on('end', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(e); } });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('sem resposta da sessão do iPhone')));
    req.end(data);
  });
}

async function alive(state) {
  if (!state) return false;
  try { return (await post(state.port, { cmd: 'ping' }, 3000)).ok === true; } catch { return false; }
}

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'manual' });
    return res.status > 0;
  } catch { return false; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, ms, what) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(500);
  }
  throw new Error(`tempo esgotado esperando ${what}`);
}

async function start(opts) {
  mkdirSync(STATE_DIR, { recursive: true });
  const base = opts.base || DEFAULT_BASE;
  let devPid = null;
  if (!(await reachable(base))) {
    const { hostname, port } = new URL(base);
    if (opts.serve === false || !['localhost', '127.0.0.1'].includes(hostname)) {
      throw new Error(`nada responde em ${base}; suba o app (npm run dev) ou passe --base`);
    }
    const log = openSync(DEV_LOG, 'a');
    const dev = spawn('npm', ['run', 'dev', '--', '-p', port || '3000'], { cwd: APP_DIR, detached: true, stdio: ['ignore', log, log] });
    dev.unref();
    devPid = dev.pid;
    console.log(`servidor de desenvolvimento iniciado (log: ${DEV_LOG})`);
    await waitFor(() => reachable(base), 120_000, `o servidor em ${base}`);
  }
  const log = openSync(path.join(STATE_DIR, 'daemon.log'), 'a');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '__daemon', '--device', opts.device || DEFAULT_DEVICE, '--base', base], {
    cwd: APP_DIR, detached: true, stdio: ['ignore', log, log], env: { ...process.env, IPHONE_DEV_PID: devPid ? String(devPid) : '' },
  });
  child.unref();
  await waitFor(async () => alive(readState()), 60_000, 'o navegador WebKit abrir');
  return (await post(readState().port, { cmd: 'status' })).out;
}

async function client(argv) {
  const { pos, opts } = parseArgs(argv);
  const [cmd = 'help', ...args] = pos;
  if (cmd === 'help' || cmd === '--help') return console.log(HELP);
  let state = readState();
  const running = await alive(state);
  if (cmd === 'stop' && !running) { rmSync(STATE_FILE, { force: true }); return console.log('nenhuma sessão aberta'); }
  if (cmd === 'start' && running) return console.log((await post(state.port, { cmd: 'status' })).out);
  if (!running) {
    const out = await start(opts);
    if (cmd === 'start') return console.log(out);
    state = readState();
  }
  if (cmd === 'start') return;
  const res = await post(state.port, { cmd, args, opts });
  if (res.out) console.log(res.out);
  if (!res.ok) { console.error(`erro: ${res.error}`); process.exitCode = 1; }
}

// ---------- daemon ----------

async function daemon(opts) {
  const { webkit, devices } = await import('@playwright/test');
  const browser = await webkit.launch();
  const base = opts.base;
  let deviceName = opts.device;
  let landscape = false;
  let context;
  let page;
  const logs = [];
  let seq = 0;
  let readSeq = 0;
  let markSeq = 0;

  const push = (kind, text) => {
    logs.push({ seq: ++seq, t: new Date().toISOString().slice(11, 23), kind, text });
    if (logs.length > 1000) logs.shift();
  };
  const fmt = (l) => `${l.t} [${l.kind}] ${l.text}`;

  async function openContext(url) {
    await context?.close();
    const name = landscape ? `${deviceName} landscape` : deviceName;
    const profile = devices[name];
    if (!profile) throw new Error(`aparelho desconhecido: "${name}" (veja: devices)`);
    context = await browser.newContext({ ...profile, baseURL: base, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
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

  async function settle() {
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
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
    const loc = m
      ? (m[1] === 'label' ? page.getByLabel(m[2]) : page.getByPlaceholder(m[2]))
      : page.locator(target);
    return loc.filter({ visible: true });
  }

  async function first(target) {
    const loc = locate(target);
    const n = await loc.count();
    if (n === 0) throw new Error(`nenhum elemento visível para ${target}`);
    return { el: loc.first(), note: n > 1 ? ` (${n} visíveis; usei o primeiro)` : '' };
  }

  async function status() {
    const vp = page.viewportSize();
    return [
      `aparelho: ${deviceName}${landscape ? ' (paisagem)' : ''} — ${vp?.width}x${vp?.height}, WebKit ${browser.version()}`,
      `página: ${page.url()} — ${await page.title().catch(() => '')}`,
      `screenshots: ${SHOTS_DIR}`,
    ].join('\n');
  }

  const handlers = {
    ping: async () => 'ok',
    status,
    open: async ([url]) => goto(url || '/'),
    back: async () => { await page.goBack(); await settle(); return page.url(); },
    reload: async () => { markSeq = seq; await page.reload(); await settle(); return page.url(); },
    async shot([name], o) {
      mkdirSync(SHOTS_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const slug = (name || 'tela').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const file = path.join(SHOTS_DIR, `${stamp}-${slug}.png`);
      await page.screenshot({ path: file, fullPage: !!o.full, scale: o.hd ? 'device' : 'css', animations: 'disabled' });
      // Linux WebKit reports backdrop-filter support but never paints it, so
      // glass layers look see-through here while Safari on the iPhone blurs them.
      const glass = await page.evaluate(() => [...document.querySelectorAll('body *')].some((el) => {
        const s = getComputedStyle(el);
        const f = s.backdropFilter || s.webkitBackdropFilter;
        return f && f !== 'none' && el.getBoundingClientRect().width > 0;
      }));
      return glass
        ? `${file}\naviso: há camadas de vidro (backdrop-filter) na tela; este WebKit não desenha o desfoque, então o que está atrás aparece nítido. No iPhone real fica borrado.`
        : file;
    },
    async tap([target]) {
      const { el, note } = await first(target);
      const before = page.url();
      const href = await el.evaluate((node) => node.closest('a[href]')?.href ?? null);
      await el.tap();
      // In `next dev` a route compiles on its first visit, so a link can take
      // several seconds to land; wait for it instead of reporting the old page.
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
    async scroll([arg = '600']) {
      if (/^-?\d+$/.test(arg)) await page.evaluate((dy) => window.scrollBy(0, dy), Number(arg));
      else await (await first(arg)).el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      return `rolagem: y=${await page.evaluate(() => Math.round(window.scrollY))}`;
    },
    tree: async ([target]) => page.locator(target || 'body').first().ariaSnapshot(),
    async logs(_, o) {
      const list = o.all ? logs : logs.filter((l) => l.seq > readSeq);
      readSeq = seq;
      return list.length ? list.map(fmt).join('\n') : '(nenhum registro novo)';
    },
    async check() {
      // Next.js swaps <head> metadata during client navigation; let it land.
      await page.waitForSelector('meta[name=viewport]', { state: 'attached', timeout: 3000 }).catch(() => {});
      const info = await page.evaluate(() => {
        // 1px "sr-only" elements are visually hidden on purpose: skip them.
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
      if (!info.viewportMeta) problems.push('sem <meta name="viewport">');
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
    devices: async () => Object.keys(devices).filter((n) => /iPhone|iPad/.test(n) && !/landscape/.test(n)).join('\n'),
    async server() {
      if (!existsSync(DEV_LOG)) return 'o servidor não foi iniciado por esta ferramenta; veja o terminal onde ele roda';
      return readFileSync(DEV_LOG, 'utf8').split('\n').slice(-40).join('\n');
    },
  };

  await openContext(null);
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
        const devPid = Number(process.env.IPHONE_DEV_PID);
        reply({ ok: true, out: `sessão do iPhone fechada${devPid ? ' (e o servidor de desenvolvimento que ela abriu)' : ''}` });
        await browser.close().catch(() => {});
        if (devPid) { try { process.kill(-devPid); } catch { /* already gone */ } }
        return process.exit(0);
      }
      const fn = handlers[cmd];
      if (!fn) return reply({ ok: false, error: `comando desconhecido: ${cmd} (veja: help)` });
      try { reply({ ok: true, out: await fn(args, o) }); } catch (e) { reply({ ok: false, error: e.message.split('\n')[0] }); }
    });
  });
  srv.listen(0, '127.0.0.1', () => {
    writeFileSync(STATE_FILE, JSON.stringify({ port: srv.address().port, pid: process.pid, device: deviceName, base }));
  });
}

const argv = process.argv.slice(2);
if (argv[0] === '__daemon') {
  daemon(parseArgs(argv.slice(1)).opts).catch((e) => { console.error(e); process.exit(1); });
} else {
  client(argv).catch((e) => { console.error(`erro: ${e.message}`); process.exit(1); });
}
