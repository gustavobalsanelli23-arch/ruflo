#!/usr/bin/env node
// Vídeos dos capítulos do hero (estética de referência "Stratum", enviada
// pelo cliente): seis cenas geradas com Seedance a partir da mesma imagem —
// um monólito de pedra com arco iluminado, num lago entre montanhas. Baixa os
// originais (HEVC) e gera H.264 com os comandos exatos da referência:
// re-encode simples para as cenas que já voltam ao primeiro quadro e
// "ping-pong" (vai e volta, sem repetir o quadro da virada) para as demais.
// Saída: public/videos/capitulos/*.mp4 e public/images/capitulos/background.webp
// Uso: npm run chapters   (requer ffmpeg)
import { execFile } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'videos', 'src', 'stratum');
const OUT = join(root, 'public', 'videos', 'capitulos');
const IMG = join(root, 'public', 'images', 'capitulos');
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';

/** Cena → arquivo de origem e tratamento (a saída "vision" se chama background.mp4). */
const SCENES = {
  vision: { file: 'hf_20260928_024808_abbfad57-4496-4906-9abc-49f0d153d287.mp4', out: 'background.mp4', mode: 'plain20' },
  expression: { file: 'hf_20260928_025948_2befd859-101e-49a4-8cb0-cdbb28cb11a7.mp4', out: 'expression.mp4', mode: 'pingpong' },
  craftsmanship: { file: 'hf_20260928_071544_17524fe8-2f07-4fbc-8a55-47518532df6f.mp4', out: 'craftsmanship.mp4', mode: 'plain23' },
  refinement: { file: 'hf_20260928_025948_9fe460cc-21c2-476c-8e61-6bf57c2d6775.mp4', out: 'refinement.mp4', mode: 'pingpong' },
  balance: { file: 'hf_20260928_072855_ba37e93c-1119-4b93-a3cd-6b29ced17dc2.mp4', out: 'balance.mp4', mode: 'pingpong' },
  origin: { file: 'hf_20260928_031433_64aea4c7-c53b-4e13-a1fc-bd73673b4fa5.mp4', out: 'origin.mp4', mode: 'plain23' },
};
const STILL = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/b5f79c5a-2ebd-41ef-865e-24c660ac98bd.png';

const PP = '[0:v]split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1,fps=24';
const H264 = (crf) => ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const exists = (p) => stat(p).then(() => true, () => false);

async function fetchTo(url, path) {
  if (await exists(path)) return;
  console.log(`baixando ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

await mkdir(SRC, { recursive: true });
await mkdir(OUT, { recursive: true });
await mkdir(IMG, { recursive: true });

for (const [name, s] of Object.entries(SCENES)) {
  const input = join(SRC, `${name}.mp4`);
  await fetchTo(BASE + s.file, input);
  const out = join(OUT, s.out);
  const args =
    s.mode === 'plain20'
      ? ['-i', input, ...H264(20), out]
      : s.mode === 'plain23'
        ? ['-i', input, '-vf', 'fps=24', ...H264(23), out]
        : ['-i', input, '-filter_complex', PP, ...H264(23), out];
  await run('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });
  console.log(`${name}: ${((await stat(out)).size / 1e6).toFixed(2)} MB`);
}

const still = join(SRC, 'still.png');
await fetchTo(STILL, still);
await sharp(still).webp({ quality: 90 }).toFile(join(IMG, 'background.webp'));
console.log('still: public/images/capitulos/background.webp');
