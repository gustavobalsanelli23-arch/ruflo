// Conteúdo editável do site: fotos, serviços, galeria e textos.
// As fotos otimizadas vêm de src/data/images.generated.json (gerado por
// `npm run images` a partir dos originais em assets/fotos/).

// ── Fotos ──────────────────────────────────────────────────────────────────
// Cada espaço de foto do site tem um `id`. Enquanto a fotografia real não
// existir, o site mostra uma placa com o `brief` (o que deve ir ali) — a lista
// abaixo é, ao mesmo tempo, a pauta de fotos a pedir para a barbearia.
// Para preencher: coloque o original em assets/fotos/<id>.jpg, rode
// `npm run images` e escreva o `alt` (o que a foto realmente mostra).

export interface PhotoSlot {
  id: string;
  /** O que deve ir neste espaço. */
  brief: string;
  /** Proporção (largura / altura) da placa enquanto a foto não chega. */
  ratio: number;
  /** Texto alternativo da foto real. Obrigatório quando ela entrar. */
  alt?: string;
}

export const photos = {
  hero: {
    id: 'hero',
    brief: 'Foto principal: o Fer em ação ou um corte finalizado. Vertical, luz lateral, fundo escuro.',
    ratio: 4 / 5,
  },
  ambiente: {
    id: 'ambiente',
    brief: 'O ambiente da barbearia: cadeira, espelho e bancada.',
    ratio: 4 / 5,
  },
  detalhe: {
    id: 'detalhe',
    brief: 'Um detalhe do trabalho: mãos, navalha, tesoura ou acabamento.',
    ratio: 3 / 4,
  },
} satisfies Record<string, PhotoSlot>;

// ── Serviços ───────────────────────────────────────────────────────────────
// PROVISÓRIO: lista mínima de uma barbearia, ainda NÃO confirmada pelo Fer.
// Preço e duração só aparecem quando preenchidos (ex.: price: 'R$ 50',
// duration: '40 min'). Para retirar um serviço, apague o item.

export interface Service {
  id: string;
  name: string;
  description: string;
  price?: string;
  duration?: string;
}

export const services: Service[] = [
  {
    id: 'corte',
    name: 'Corte',
    description: 'Pensado para o formato do rosto, o tipo de cabelo e a rotina de quem senta na cadeira.',
  },
  {
    id: 'barba',
    name: 'Barba',
    description: 'Desenho, alinhamento e acabamento, do contorno ao último fio.',
  },
  {
    id: 'corte-e-barba',
    name: 'Corte e barba',
    description: 'Cabelo e barba no mesmo atendimento, com o mesmo cuidado nos dois.',
  },
];

export const servicesConfirmed = false;

// ── Galeria ────────────────────────────────────────────────────────────────
// Só trabalhos reais, publicados pela barbearia. `post` é o link do post no
// Instagram; `date` no formato AAAA-MM-DD. A ordem e a proporção definem o
// grid editorial (ver Gallery.tsx).

export interface Work {
  photo: PhotoSlot;
  title?: string;
  /** Legenda original do post. */
  caption?: string;
  date?: string;
  post?: string;
}

const trabalho = (n: number, ratio: number): Work => ({
  photo: {
    id: `trabalho-${String(n).padStart(2, '0')}`,
    brief: n === 1 ? 'Um corte finalizado, de perfil ou de costas.' : 'Um trabalho publicado no Instagram da barbearia.',
    ratio,
  },
});

export const works: Work[] = [
  trabalho(1, 4 / 5),
  trabalho(2, 3 / 4),
  trabalho(3, 1),
  trabalho(4, 4 / 5),
  trabalho(5, 9 / 16),
  trabalho(6, 3 / 4),
  trabalho(7, 4 / 5),
  trabalho(8, 1),
];

export function workTitle(work: Work, index: number): string {
  return work.title ?? `Trabalho ${String(index + 1).padStart(2, '0')}`;
}

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-09-19" → "setembro de 2026" (em UTC: o mesmo resultado no build e no navegador). */
export function monthYear(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return monthFormat.format(Date.UTC(year, month - 1, day));
}

// ── Textos ─────────────────────────────────────────────────────────────────
// TEXTO PROVISÓRIO: escrito para a direção de arte, sem dados de história,
// tempo de carreira, formação ou endereço. Revise com o Fer antes de publicar.

export const copy = {
  eyebrow: 'Barbearia',
  phrase: 'Corte com assinatura.',
  intro: 'Uma barbearia com nome próprio. Cada corte é pensado no detalhe e finalizado com precisão.',
  /** Entre *asteriscos*: palavras em itálico. */
  manifesto:
    'Um nome na porta é um *compromisso*. Por isso o corte não termina na máquina: termina no *detalhe*, no acabamento e no *espelho*.',
  about: {
    title: ['O nome na porta.', 'A assinatura no corte.'],
    paragraphs: [
      'O atendimento começa por uma conversa: o que você quer, como é a sua rotina e o que funciona para o seu cabelo. A partir daí, cada etapa tem um porquê.',
      'Linhas limpas, transições bem resolvidas e um acabamento que dura além do primeiro dia. É assim que um corte passa a ter assinatura.',
    ],
  },
  booking: {
    title: ['Reserve', 'seu horário.'],
  },
} as const;
