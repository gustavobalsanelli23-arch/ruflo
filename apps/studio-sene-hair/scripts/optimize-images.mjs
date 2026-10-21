#!/usr/bin/env node
// Gera as imagens e o vídeo otimizados do site a partir das fotografias reais
// publicadas no Instagram oficial (@studiosenehair_baruerisp).
//
// Uso: npm run images
//
// Os originais ficam em assets-src/ (ignorado pelo git), nomeados pelo código
// da publicação: <shortcode>_<índice no carrossel>.jpg — por exemplo,
// DcyQQxijtgJ_0.jpg é a 1ª foto de instagram.com/p/DcyQQxijtgJ/. Quadros de
// vídeo seguem <shortcode>_frame_<segundo>.jpg (extraídos com ffmpeg).
//
// Saídas: public/images/<nome>-<largura>.webp (+ .avif no herói),
// public/media/*.mp4 e src/data/images.json (dimensões, usado pelo <Picture>).
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets-src');
const OUT = join(root, 'public', 'images');
const MEDIA = join(root, 'public', 'media');
const MANIFEST = join(root, 'src', 'data', 'images.json');

const STD = [480, 800, 1200];
/** Quadros de vídeo (720×1280) recortados em 3:4, centralizados. */
const FRAME_34 = { left: 0, top: 150, width: 720, height: 960 };
/** Originais 3024×4032 sem a faixa lateral da marca d'água, mantendo 3:4. */
const NO_WATERMARK = { left: 260, top: 120, width: 2764, height: 3685 };

/** [nome de saída, original, opções] */
const PHOTOS = [
  ['hero-botox-dourado', 'DcyQQxijtgJ_0.jpg', { widths: [640, 960, 1280, 1680], avif: true }],
  ['detalhe-fios-brilho', 'Dci7E0Ljq6M_0.jpg', { widths: [480, 800] }],
  ['botox-castanho-claro', 'DcyQQxijtgJ_1.jpg'],
  ['botox-castanho-salao', 'DcyQQxijtgJ_2.jpg'],
  ['botox-escuro-longo', 'Dci7E0Ljq6M_1.jpg'],
  ['botox-antes', 'DdNWN9GDXdj_1.jpg'],
  ['botox-depois', 'DdNWN9GDXdj_0.jpg'],
  ['progressiva-corte-antes', 'DdfBRklncy7_1.jpg'],
  ['progressiva-corte-resultado', 'DdfBRklncy7_0.jpg'],
  ['progressiva-corte-perfil', 'DdfBRklncy7_2.jpg'],
  ['hidratacao-corte-infantil', 'DdNfCJsDaZh_1.jpg'],
  ['progressiva-sem-formol-antes', 'DeeXZH2hi-e_frame_0.jpg', { widths: [480, 720], crop: FRAME_34 }],
  ['progressiva-sem-formol-depois', 'DeeXZH2hi-e_frame_11.jpg', { widths: [480, 720], crop: FRAME_34 }],
  ['botox-escuro-alinhado', 'DdNVUlnN7ry_frame_20.jpg', { widths: [480, 720], crop: FRAME_34 }],
  [
    'lavatorio-massagem',
    'DcbWW1UuHNG_frame_0.4.jpg',
    { widths: [480, 720], crop: { left: 0, top: 120, width: 720, height: 960 } },
  ],
  [
    'lavatorio-cuidado',
    'Dbotnl7vyr7_frame_6.jpg',
    { widths: [480, 720], crop: { left: 0, top: 200, width: 720, height: 960 } },
  ],
  // Fotos com marca d'água lateral (@ do estúdio/profissional): recorte de 260 px à esquerda.
  ['progressiva-crespo-depois', 'DcTXfU0jiWO_0.jpg', { crop: NO_WATERMARK }],
  ['progressiva-crespo-antes', 'DcTXfU0jiWO_1.jpg', { crop: NO_WATERMARK }],
  ['botox-chanel', 'DcOM6xBDqnO_0.jpg', { crop: NO_WATERMARK }],
  ['botox-chanel-perfil', 'DcOM6xBDqnO_1.jpg', { crop: NO_WATERMARK }],
  ['escova-babyliss', 'DPkRZK4EYc__1.jpg', { widths: [480, 800] }],
  ['escova-babyliss-retrato', 'DPkRZK4EYc__0.jpg', { widths: [480, 800] }],
  ['botox-resultado-2025', 'DJ-apD2SowM_0.jpg', { widths: [480, 800, 1200] }],
  ['progressiva-sem-formol-escuro', 'DPkRBZIERYs_0.jpg', { widths: [480, 800, 1200] }],
  ['tranca-nago-boxeadora', 'DJX1AQjSPE-_0.jpg', { widths: [480, 800, 1200] }],
  ['tranca-nago-boxeadora-lateral', 'DJX1AQjSPE-_1.jpg', { widths: [480, 800, 1200] }],
  ['tranca-nago-freestyle', 'DJHY0YiuyIJ_frame_1.jpg', { widths: [480, 720], crop: FRAME_34 }],
  ['cauter-gloss', 'Db4TNi2NbyF_frame_12.jpg', { widths: [480, 720], crop: FRAME_34 }],
];

/** Vídeo curto, sem áudio, em loop (balanço dos fios após o botox). */
const VIDEOS = [['brilho-em-movimento', 'Dci7E0Ljq6M_2.mp4', { start: 0.5, duration: 9, width: 600 }]];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(MEDIA, { recursive: true });
  const manifest = {};

  for (const [name, file, opts = {}] of PHOTOS) {
    const path = join(SRC, file);
    if (!(await exists(path))) throw new Error(`Original ausente: assets-src/${file}`);
    let img = sharp(path).rotate(); // aplica a orientação EXIF
    if (opts.crop) img = img.extract(opts.crop);
    const { data, info } = await img.toBuffer({ resolveWithObject: true });
    const widths = (opts.widths ?? STD).filter((w) => w <= info.width);
    for (const w of widths) {
      const base = sharp(data).resize({ width: w });
      await base
        .clone()
        .webp({ quality: 78, effort: 6 })
        .toFile(join(OUT, `${name}-${w}.webp`));
      if (opts.avif)
        await base
          .clone()
          .avif({ quality: 55, effort: 6 })
          .toFile(join(OUT, `${name}-${w}.avif`));
    }
    const largest = widths[widths.length - 1];
    manifest[name] = {
      width: largest,
      height: Math.round((info.height / info.width) * largest),
      widths,
      ...(opts.avif ? { avif: true } : {}),
    };
    console.log(`imagem: ${name} (${widths.join(', ')})`);
  }

  for (const [name, file, { start, duration, width }] of VIDEOS) {
    const path = join(SRC, file);
    if (!(await exists(path))) throw new Error(`Original ausente: assets-src/${file}`);
    const input = [
      '-v',
      'error',
      '-y',
      '-ss',
      String(start),
      '-t',
      String(duration),
      '-i',
      path,
      '-an',
      '-vf',
      `scale=${width}:-2,fps=30`,
    ];
    // WebM (VP9) primeiro, menor; H.264 + faststart como alternativa universal (Safari antigo).
    execFileSync('ffmpeg', [
      ...input,
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '47',
      '-row-mt',
      '1',
      '-deadline',
      'good',
      join(MEDIA, `${name}.webm`),
    ]);
    execFileSync('ffmpeg', [
      ...input,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '28',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      join(MEDIA, `${name}.mp4`),
    ]);
    const poster = execFileSync('ffmpeg', [
      '-v',
      'error',
      '-ss',
      String(start),
      '-i',
      path,
      '-frames:v',
      '1',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-',
    ]);
    const meta = await sharp(poster)
      .resize({ width })
      .webp({ quality: 74 })
      .toFile(join(MEDIA, `${name}.webp`));
    manifest[`video:${name}`] = { width: meta.width, height: meta.height, widths: [meta.width] };
    console.log(`vídeo: ${name}`);
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Manifesto salvo em src/data/images.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
