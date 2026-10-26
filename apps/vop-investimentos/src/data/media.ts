// Espaços de foto e vídeo do site. Todas as imagens atuais são ilustrativas
// (banco de imagens com licença comercial; origem em assets/fotos/manifest.json
// e assets/videos/manifest.json). Para usar material próprio da VOP, troque o
// arquivo em assets/fotos/ mantendo o nome e rode `npm run images`.

export interface PhotoSlot {
  /** Nome do arquivo em assets/fotos/ (sem extensão). */
  id: string;
  /** Texto alternativo: descreve o que se vê, sem atribuir à VOP. */
  alt: string;
  /** Proporção usada enquanto a foto não existe (largura / altura). */
  ratio: number;
  /** Ponto de interesse para recortes (object-position), ex.: "50% 75%". */
  focus?: string;
}

const slot = (id: string, alt: string, ratio = 3 / 2, focus?: string): PhotoSlot => ({ id, alt, ratio, focus });

export const photos = {
  casaContemporanea: slot('casa-contemporanea', 'Casa contemporânea de dois pavimentos com grandes panos de vidro, ao entardecer', 3 / 2, '50% 80%'),
  cozinhaJanelas: slot('cozinha-janelas', 'Cozinha integrada com ilha central e janelas amplas para o jardim'),
  quartoMadeira: slot('quarto-madeira', 'Quarto com cômoda de madeira e luz natural', 2 / 3),
  piscinaBorda: slot('piscina-borda', 'Piscina de borda infinita cercada por árvores', 3 / 2, '40% 70%'),
  cozinhaIlha: slot('cozinha-ilha', 'Cozinha clara com ilha, piso de madeira e iluminação embutida'),
  casaCondominio: slot('casa-condominio', 'Fachada de casa moderna com volumes recortados e jardim frontal', 3 / 2, '50% 45%'),
  livingIntegrado: slot('living-integrado', 'Ambiente integrado com mesa de jantar de madeira e quarto ao fundo', 3 / 2, '40% 62%'),
  hallEntrada: slot('hall-entrada', 'Porta de vidro aberta para uma sala de estar com poltrona e tapete', 2 / 3, '50% 55%'),
  livingLareira: slot('living-lareira', 'Sala de estar com lareira embutida, sofás claros e janelas com treliça', 2 / 3, '50% 60%'),
  livingConcreto: slot('living-concreto', 'Living com pilar de concreto aparente, sofá cinza e janelas do piso ao teto', 2 / 3, '50% 55%'),
  salaFamilia: slot('sala-familia', 'Sala ampla com parede de tijolos brancos e portas de vidro para a varanda', 3 / 2, '50% 55%'),
  escadaLuz: slot('escada-luz', 'Escada escura marcada por luzes embutidas nos degraus'),
  edificioPedestre: slot('edificio-pedestre', 'Pessoa caminhando diante de uma fachada de vidro com geometria angular'),
  cidadeNoite: slot('cidade-noite', 'Vista aérea de torres iluminadas ao anoitecer', 3 / 2),
  torreNoite: slot('torre-noite', 'Torre de vidro com recortes iluminados à noite', 16 / 9),
  piscinaInterna: slot('piscina-interna', 'Piscina coberta com pilares e uma parede de vidro ao fundo', 16 / 9),
  quartoLuz: slot('quarto-luz', 'Suíte em penumbra com cortinas de linho filtrando a luz', 16 / 9),
  suiteBranca: slot('suite-branca', 'Suíte clara com cama de casal e porta de vidro para o terraço', 16 / 9),
  heroArquitetura: slot('hero-arquitetura', 'Piscina coberta com pilares e vista para fora', 16 / 9),
  heroInteriores: slot('hero-interiores', 'Suíte em penumbra com luz natural', 16 / 9),
  heroCidade: slot('hero-cidade', 'Torres iluminadas de uma cidade ao anoitecer', 16 / 9),
  ctaHorizonte: slot('cta-horizonte', 'Horizonte de uma cidade ao entardecer, visto do alto', 16 / 9),
} satisfies Record<string, PhotoSlot>;

export interface VideoClip {
  /** Nome do clipe em public/videos/ (sem sufixo de tamanho). */
  id: string;
  /** Rótulo curto do capítulo, exibido no indicador do hero. */
  label: string;
  poster: PhotoSlot;
}

/** Arquivos de cada clipe: paisagem (1280×720) e retrato (540×960). */
export function videoSources(clip: VideoClip, orientation: 'landscape' | 'portrait'): string {
  return `/videos/${clip.id}-${orientation === 'portrait' ? 540 : 1280}.mp4`;
}

/** Cena de um capítulo do hero, em loop (gerada por `npm run chapters`). */
export const chapterScene = (scene: string) => `/videos/capitulos/${scene}.mp4`;
/** Quadro parado das cenas: a primeira pintura do hero, antes de qualquer vídeo. */
export const chapterStill = '/images/capitulos/background.webp';

export const ctaClip: VideoClip = { id: 'cta-horizonte', label: 'Horizonte', poster: photos.ctaHorizonte };
