// Medidas do símbolo da VOP — as mesmas do vetor em components/VopMark.tsx,
// em pixels da foto de perfil (752×791) — e a conversão para a cena 3D.

/** Telhado: ponta esquerda, cumeeira, ponta direita. */
export const MARK_ROOF = [
  [245, 311.5],
  [365, 208.5],
  [485, 313],
] as const;

/** Traços verticais: x, topo, base. O 4º atravessa o telhado. */
export const MARK_BARS = [
  [269, 331, 374],
  [317.5, 287, 414.5],
  [364, 257, 472.5],
  [413, 198, 429],
  [461, 331, 374.5],
] as const;

/** 24 px da foto = 1 unidade da cena; o traço mais baixo fica 0,9 acima da água. */
const SCALE = 1 / 24;
const BASE = 0.9;

export const markToWorld = (x: number, y: number) => ({ x: (x - 365) * SCALE, y: (472.5 - y) * SCALE + BASE });
