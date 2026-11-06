#!/usr/bin/env node
/**
 * Visualizar: shows a web project while it is being built. Finds how the
 * project runs (Vite, Next.js, Astro, plain HTML…), installs its dependencies
 * if missing, starts its dev server (hot reload) and keeps an iPhone (WebKit,
 * Safari's engine) and a desktop browser open on it between short commands.
 *
 *   node .claude/skills/visualizar/scripts/visualizar.mjs help
 *
 * State lives in <project>/.visualizar/ (it ignores itself in git). The last
 * project started is the default for later commands.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SESSION_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sessao.mjs');
const CURRENT_FILE = path.join(os.homedir(), '.cache', 'visualizar', 'atual');
const DEFAULT_DEVICE = process.env.VISUALIZAR_DEVICE || 'iPhone 17 Pro';

const HELP = `visualizar — o projeto aberto num iPhone (WebKit/Safari) e no desktop, ao vivo

  start [pasta] [--device "iPhone 17 Pro"] [--port N] [--url URL] [--no-install]
                       sobe o projeto (instala dependências e o servidor de
                       desenvolvimento se preciso) e abre o iPhone; imprime a porta
  open <caminho|URL>   navega (ex.: open /contato)
  shot [nome] [--full] [--hd] [--desktop] [--both] [--chromium]
                       screenshot do iPhone; --desktop: só desktop (1440px);
                       --both: iPhone e desktop; --chromium: iPhone desenhado no
                       Chromium (desfoque de vidro real); --full: página inteira
  tap <alvo>           toca num elemento visível
  type <alvo> <texto> [--enter]
  press <tecla>        Enter, Tab, Escape…
  scroll <px|alvo>     rola a página ou até um elemento
  tree [alvo]          árvore de acessibilidade (o que há na tela e como tocar)
  logs [--all]         console, erros de página, requisições com falha (novos)
  check                rolagem horizontal, erros, campos com zoom (fonte < 16px),
                       alvos de toque < 24px
  eval <expressão>     JavaScript na página
  back | reload        voltar | recarregar
  device <nome> | rotate | restart | devices
  server               últimas linhas do log do servidor de desenvolvimento
  status | stop        estado | fecha o navegador e o servidor que a skill subiu

  <alvo>: role=button[name="Entrar"] · text=Agendar · label=E-mail ·
          placeholder=Buscar · ou seletor CSS. Sem [pasta], usa o último projeto.
`;

// ---------- arguments and state ----------

function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key.startsWith('no-')) opts[key.slice(3)] = false;
      else if (['device', 'port', 'url', 'dir'].includes(key)) opts[key] = argv[++i];
      else opts[key] = true;
    } else pos.push(a);
  }
  return { pos, opts };
}

const stateDir = (dir) => path.join(dir, '.visualizar');
const stateFile = (dir) => path.join(stateDir(dir), 'sessao.json');

function readState(dir) {
  try { return JSON.parse(readFileSync(stateFile(dir), 'utf8')); } catch { return null; }
}

function currentProject() {
  try { return readFileSync(CURRENT_FILE, 'utf8').trim() || null; } catch { return null; }
}

function setCurrent(dir) {
  mkdirSync(path.dirname(CURRENT_FILE), { recursive: true });
  writeFileSync(CURRENT_FILE, dir);
}

function prepareStateDir(dir) {
  mkdirSync(path.join(stateDir(dir), 'shots'), { recursive: true });
  writeFileSync(path.join(stateDir(dir), '.gitignore'), '*\n');
}

// ---------- project detection ----------

function detectProject(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const has = (f) => existsSync(path.join(dir, f));
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : 'npm';
    const framework = deps.next ? 'next' : deps.astro ? 'astro' : deps.vite ? 'vite' : deps['react-scripts'] ? 'cra' : null;
    const script = ['dev', 'start', 'serve'].find((s) => pkg.scripts?.[s]);
    if (script) return { kind: 'node', name: pkg.name || path.basename(dir), pm, framework, script };
  }
  if (existsSync(path.join(dir, 'index.html'))) return { kind: 'static', name: path.basename(dir), framework: 'html' };
  return null;
}

function installCommand(project, dir) {
  if (project.pm === 'npm') return ['npm', existsSync(path.join(dir, 'package-lock.json')) ? ['ci', '--no-audit', '--no-fund'] : ['install', '--no-audit', '--no-fund']];
  if (project.pm === 'bun') return ['bun', ['install']];
  return [project.pm, ['install', '--frozen-lockfile']];
}

/** Dev server command, listening on every interface so the app's preview pane can reach it. */
function devCommand(project, port) {
  if (project.kind === 'static') return ['npx', ['-y', 'vite', '--host', '0.0.0.0', ...(port ? ['--port', port, '--strictPort'] : [])]];
  const extra = {
    vite: ['--host', '0.0.0.0', ...(port ? ['--port', port, '--strictPort'] : [])],
    astro: ['--host', '0.0.0.0', ...(port ? ['--port', port] : [])],
    next: port ? ['-p', port] : [],
  }[project.framework] ?? [];
  const sep = project.pm === 'npm' && extra.length ? ['--'] : [];
  return [project.pm, ['run', project.script, ...sep, ...extra]];
}

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, ms, what) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await check();
    if (value) return value;
    await sleep(500);
  }
  throw new Error(`tempo esgotado esperando ${what}`);
}

/** First local URL a dev server prints ("Local: http://localhost:5173/"). */
function urlFromLog(file) {
  // eslint-disable-next-line no-control-regex
  const text = existsSync(file) ? readFileSync(file, 'utf8').replace(/\x1b\[[0-9;]*m/g, '') : '';
  const m = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(?::(\d+))/.exec(text);
  return m ? `http://localhost:${m[1]}` : null;
}

function post(port, body, timeout = 180_000) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/', method: 'POST', headers: { 'content-type': 'application/json' }, timeout },
      (res) => {
        let out = '';
        res.on('data', (c) => (out += c));
        res.on('end', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(e); } });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('a sessão do navegador não respondeu')));
    req.end(JSON.stringify(body));
  });
}

async function alive(state) {
  if (!state) return false;
  try { return (await post(state.port, { cmd: 'ping' }, 3000)).ok === true; } catch { return false; }
}

// ---------- start ----------

// Some CLIs pause on their first run in an agent session to show a notice
// (Next.js does it for versions with a known advisory) and continue on the next run.
const STOPPED_FOR_NOTICE = /command stopped to show|Retry the same command to continue/i;

function installDeps(project, dir, opts) {
  if (project.kind !== 'node' || existsSync(path.join(dir, 'node_modules')) || opts.install === false) return;
  const [cmd, args] = installCommand(project, dir);
  console.log(`instalando dependências (${cmd} ${args.join(' ')})…`);
  const res = spawnSync(cmd, args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`a instalação falhou:\n${(res.stderr || res.stdout).split('\n').slice(-15).join('\n')}`);
}

/** Resolves 'ok' when the page answers, or 'exit' / 'stopped' as soon as the log shows either. */
async function waitReady(url, devLog, hasExited) {
  const deadline = Date.now() + 300_000;
  // The notice wins over the exit it causes.
  const ended = () => (STOPPED_FOR_NOTICE.test(readFileSync(devLog, 'utf8')) ? 'stopped' : hasExited() ? 'exit' : null);
  while (Date.now() < deadline) {
    // Checked before every attempt: a refused connection returns at once, before any interval tick.
    const early = ended();
    if (early) return early;
    const ctrl = new AbortController();
    let watch;
    const watching = new Promise((resolve) => {
      watch = setInterval(() => { const why = ended(); if (why) resolve(why); }, 500);
    });
    // One long request: the first one compiles the page (and may download fonts).
    const fetching = fetch(url, { redirect: 'manual', signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(240_000)]) })
      .then(() => 'ok', () => 'retry');
    const result = await Promise.race([fetching, watching]);
    clearInterval(watch);
    ctrl.abort();
    if (result !== 'retry') return result;
    await sleep(500);
  }
  return 'timeout';
}

async function startServer(dir, opts, attempt = 1) {
  const project = detectProject(dir);
  if (!project) throw new Error(`${dir} não tem package.json com script dev/start nem index.html`);
  installDeps(project, dir, opts);
  const devLog = path.join(stateDir(dir), 'dev-server.log');
  writeFileSync(devLog, '');
  const [cmd, args] = devCommand(project, opts.port);
  const log = openSync(devLog, 'a');
  const dev = spawn(cmd, args, {
    cwd: dir, detached: true, stdio: ['ignore', log, log],
    env: { ...process.env, BROWSER: 'none', NO_COLOR: '1', FORCE_COLOR: '0', ...(opts.port ? { PORT: opts.port } : {}) },
  });
  dev.unref();
  let exited = null;
  dev.on('exit', (code) => (exited = code));
  console.log(`servidor de desenvolvimento: ${cmd} ${args.join(' ')} (log: ${devLog})`);
  const tail = () => readFileSync(devLog, 'utf8').split('\n').slice(-20).join('\n');
  const kill = () => { try { process.kill(-dev.pid); } catch { /* already gone */ } };
  try {
    const url = await waitFor(() => {
      if (exited !== null) throw new Error(`o servidor parou (código ${exited})`);
      return urlFromLog(devLog) ?? (opts.port ? `http://localhost:${opts.port}` : null);
    }, 180_000, 'o servidor de desenvolvimento informar o endereço');
    const result = await waitReady(url, devLog, () => exited !== null);
    if (result === 'ok') return { project, url, devPid: dev.pid };
    if (result === 'stopped' && attempt === 1) {
      console.log('o servidor parou para mostrar um aviso na primeira execução; reiniciando…');
      kill();
      await sleep(1000);
      return startServer(dir, opts, 2);
    }
    throw new Error(result === 'exit' ? `o servidor parou (código ${exited})` : `tempo esgotado esperando o servidor em ${url}`);
  } catch (e) {
    kill();
    throw new Error(`${e.message}\núltimas linhas do servidor:\n${tail()}`);
  }
}

async function start(dir, opts) {
  prepareStateDir(dir);
  let project = detectProject(dir);
  let url = opts.url;
  let devPid = null;
  if (!url) ({ project, url, devPid } = await startServer(dir, opts));
  const log = openSync(path.join(stateDir(dir), 'sessao.log'), 'a');
  const child = spawn(process.execPath, [SESSION_SCRIPT, '--state', stateDir(dir), '--project', dir, '--device', opts.device || DEFAULT_DEVICE, '--base', url], {
    cwd: dir, detached: true, stdio: ['ignore', log, log], env: { ...process.env, VISUALIZAR_DEV_PID: devPid ? String(devPid) : '' },
  });
  child.unref();
  await waitFor(async () => alive(readState(dir)), 300_000, 'o navegador abrir; na primeira vez ele é instalado (veja .visualizar/sessao.log)');
  const status = (await post(readState(dir).port, { cmd: 'status' })).out;
  const port = new URL(url).port || (url.startsWith('https') ? '443' : '80');
  return [
    `projeto: ${project?.name ?? path.basename(dir)} (${project?.framework ?? 'URL externa'}) em ${dir}`,
    `endereço: ${url}`,
    status,
    ...(devPid ? [`PORTA_PREVIA=${port}`] : []),
  ].join('\n');
}

// ---------- client ----------

async function main(argv) {
  const { pos, opts } = parseArgs(argv);
  const [cmd = 'help', ...args] = pos;
  if (cmd === 'help' || cmd === '--help') return console.log(HELP);

  const target = opts.dir ?? (cmd === 'start' ? args[0] : null);
  const dir = path.resolve(target ?? currentProject() ?? process.cwd());
  if (cmd === 'start' || opts.dir) setCurrent(dir);

  const state = readState(dir);
  const running = await alive(state);
  if (cmd === 'stop' && !running) { rmSync(stateFile(dir), { force: true }); return console.log('nenhuma sessão aberta para', dir); }
  if (cmd === 'start' && running) return console.log(`já aberto\n${(await post(state.port, { cmd: 'status' })).out}`);
  if (!running) {
    const out = await start(dir, opts);
    console.log(out);
    if (cmd === 'start') return;
  }
  const res = await post(readState(dir).port, { cmd, args: cmd === 'start' ? [] : args, opts });
  if (res.out) console.log(res.out);
  if (!res.ok) { console.error(`erro: ${res.error}`); process.exitCode = 1; }
}

main(process.argv.slice(2)).catch((e) => { console.error(`erro: ${e.message}`); process.exit(1); });
