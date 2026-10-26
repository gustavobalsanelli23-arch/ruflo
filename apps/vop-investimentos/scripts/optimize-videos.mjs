#!/usr/bin/env node
// Prepara os vídeos do site a partir de assets/videos/manifest.json:
//  - corta cada clipe, aplica o mesmo tratamento de cor das fotos e gera duas
//    versões H.264 sem áudio: paisagem (1280×720) e retrato (540×960, recorte
//    central) para celulares em pé;
//  - extrai o primeiro quadro de cada clipe como pôster (assets/fotos/<clipe>.jpg)
//    e os quadros listados em "quadros" como fotografias (assets/fotos/<nome>.jpg).
// Depois rode `npm run images` para gerar AVIF/WebP dessas imagens.
// Requer ffmpeg no PATH. Originais ausentes são baixados do endereço "origem".
import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'videos', 'src');
const OUT = join(root, 'public', 'videos');
const FOTOS = join(root, 'assets', 'fotos');
const manifest = JSON.parse(await readFile(join(root, 'assets', 'videos', 'manifest.json'), 'utf8'));

/** Mesmo espírito do grade() de optimize-images.mjs: cor contida, contraste de cinema. */
const GRADE = 'eq=saturation=0.82:contrast=1.05:brightness=-0.015';

const exists = (p) => stat(p).then(() => true, () => false);

async function source(file, url) {
  const path = join(SRC, file);
  if (await exists(path)) return path;
  if (!url) throw new Error(`original ausente e sem "origem": ${file}`);
  console.log(`baixando ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  await mkdir(SRC, { recursive: true });
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

const ffmpeg = (args) => run('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });

await mkdir(OUT, { recursive: true });
await mkdir(FOTOS, { recursive: true });
const sizes = {};

for (const [key, clip] of Object.entries(manifest.clipes)) {
  const input = await source(clip.arquivo, clip.origem);
  const trim = ['-ss', String(clip.inicio), '-t', String(clip.duracao), '-i', input];
  const common = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', '24'];
  const land = join(OUT, `${key}-1280.mp4`);
  const port = join(OUT, `${key}-540.mp4`);
  await ffmpeg([...trim, '-vf', `scale=1280:-2:flags=lanczos,${GRADE}`, ...common, '-crf', '27', '-maxrate', '2400k', '-bufsize', '4800k', land]);
  await ffmpeg([...trim, '-vf', `crop=ih*9/16:ih,scale=540:960:flags=lanczos,${GRADE}`, ...common, '-crf', '28', '-maxrate', '1400k', '-bufsize', '2800k', port]);
  // Pôster = primeiro quadro do trecho: o fade do vídeo começa exatamente sobre ele.
  await ffmpeg(['-ss', String(clip.inicio), '-i', input, '-frames:v', '1', '-vf', GRADE, '-q:v', '2', join(FOTOS, `${key}.jpg`)]);
  sizes[key] = [(await stat(land)).size, (await stat(port)).size];
  console.log(`${key}: ${(sizes[key][0] / 1e6).toFixed(2)} MB (1280) · ${(sizes[key][1] / 1e6).toFixed(2)} MB (540)`);
}

for (const [key, still] of Object.entries(manifest.quadros)) {
  const input = await source(still.arquivo, still.origem);
  // "recorte" (opcional) no formato do crop do ffmpeg: largura:altura:x:y.
  const crop = still.recorte ? ['-vf', `crop=${still.recorte}`] : [];
  await ffmpeg(['-ss', String(still.tempo), '-i', input, '-frames:v', '1', ...crop, '-q:v', '2', join(FOTOS, `${key}.jpg`)]);
  console.log(`quadro ${key} ← ${still.arquivo} @ ${still.tempo}s`);
}
