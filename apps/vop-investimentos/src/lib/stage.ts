// Percurso pelo imóvel: onde a foto de um ambiente fica na tela, onde caem
// os pontos de interesse (em pixels da janela) e o estado da caminhada.
// Funções puras, testáveis.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  /** cover: a foto preenche a tela; contain: inteira, sobre um fundo desfocado. */
  mode: 'cover' | 'contain';
}

/** "50% 80%" → [0.5, 0.8]. */
export function parseFocus(focus?: string): [number, number] {
  const [x = '50%', y = '50%'] = (focus ?? '').trim().split(/\s+/);
  const n = (v: string) => Math.min(1, Math.max(0, (parseFloat(v) || 50) / 100));
  return [n(x), n(y)];
}

/**
 * Caixa da foto na tela. Fotos em pé numa tela deitada (ou o contrário bem
 * marcado) aparecem inteiras, para o ambiente não virar um recorte; as demais
 * cobrem a tela respeitando o ponto de interesse (focus).
 */
export function stageBox(imgW: number, imgH: number, vw: number, vh: number, focus?: string): Box {
  const r = imgW / imgH;
  const screen = vw / vh;
  const [fx, fy] = parseFocus(focus);
  if (r < 0.95 && screen > 1.15) {
    // Inteira, um pouco à direita: o nome do ambiente fica à esquerda, livre.
    const height = Math.min(vh * 0.78, (vw * 0.62) / r);
    const width = height * r;
    return { left: (vw - width) * 0.6, top: vh * 0.08, width, height, mode: 'contain' };
  }
  if (r > 1.1 && screen < 0.8) {
    // Foto deitada no celular em pé: ocupa o alto da tela, e o nome e os
    // controles ficam na faixa escura de baixo, sem cobrir o ambiente.
    const height = vh * 0.72;
    const width = Math.max(vw, height * r);
    return { left: (vw - width) * fx, top: vh * 0.04, width, height: width / r, mode: 'cover' };
  }
  const width = Math.max(vw, vh * r);
  const height = width / r;
  return { left: (vw - width) * fx, top: (vh - height) * fy, width, height, mode: 'cover' };
}

/**
 * Posição de um ponto de interesse (x, y em % da foto) na tela, e se ele cai
 * numa área livre — longe das bordas e das barras do percurso.
 */
export function hotspotOnScreen(box: Box, x: number, y: number, vw: number, vh: number): { left: number; top: number; visible: boolean } {
  const left = box.left + (box.width * x) / 100;
  const top = box.top + (box.height * y) / 100;
  const visible = left > vw * 0.06 && left < vw * 0.94 && top > vh * 0.14 && top < vh * 0.78;
  return { left, top, visible };
}

/** Estado do percurso. */
export interface Walk {
  index: number;
  /** +1 indo em frente, −1 voltando (decide a direção da câmera). */
  dir: number;
  /** Passou do último ambiente: cartão de encerramento. */
  ended: boolean;
}

export type Step = { type: 'next' | 'prev' | 'restart' } | { type: 'jump'; to: number };

export function walkReducer(total: number) {
  return (s: Walk, a: Step): Walk => {
    switch (a.type) {
      case 'next':
        if (s.ended) return s;
        return s.index < total - 1 ? { index: s.index + 1, dir: 1, ended: false } : { ...s, ended: true };
      case 'prev':
        if (s.ended) return { ...s, dir: -1, ended: false };
        return s.index > 0 ? { index: s.index - 1, dir: -1, ended: false } : s;
      case 'jump':
        return a.to === s.index && !s.ended ? s : { index: a.to, dir: a.to >= s.index ? 1 : -1, ended: false };
      case 'restart':
        return { index: 0, dir: -1, ended: false };
    }
  };
}
