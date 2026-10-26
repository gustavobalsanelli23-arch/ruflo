// Projeção simples (equirretangular local) para o mapa esquemático das
// regiões: 1 unidade do SVG = 100 m. Precisão de bairro, não de rua — o mapa
// avisa que as posições são aproximadas.
export interface Bounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

export const MAP_BOUNDS: Bounds = { north: -23.41, south: -23.66, west: -47.0, east: -46.6 };

const KM_PER_DEG_LAT = 110.6;
const kmPerDegLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);
const MID_LAT = (MAP_BOUNDS.north + MAP_BOUNDS.south) / 2;
/** Unidades do SVG por km. */
export const UNITS_PER_KM = 10;

export function project(lat: number, lon: number, b: Bounds = MAP_BOUNDS): { x: number; y: number } {
  return {
    x: (lon - b.west) * kmPerDegLon(MID_LAT) * UNITS_PER_KM,
    y: (b.north - lat) * KM_PER_DEG_LAT * UNITS_PER_KM,
  };
}

export function mapSize(b: Bounds = MAP_BOUNDS): { width: number; height: number } {
  const { x, y } = project(b.south, b.east, b);
  return { width: Math.round(x), height: Math.round(y) };
}

/** Distância em linha reta entre dois pontos, em km (haversine). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pathFrom(points: readonly [number, number][]): string {
  return points
    .map(([lat, lon], i) => {
      const { x, y } = project(lat, lon);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Referências do mapa (contexto, sem destaque). Coordenadas aproximadas dos centros. */
export const landmarks = [
  { name: 'São Paulo', lat: -23.5505, lon: -46.634 },
  { name: 'Osasco', lat: -23.5325, lon: -46.7917 },
  { name: 'Santana de Parnaíba', lat: -23.444, lon: -46.9178 },
  { name: 'Cotia', lat: -23.6039, lon: -46.9192 },
] as const;

/** Traçados aproximados das rodovias que ligam a região à capital. */
export const roads = [
  {
    name: 'Rod. Castello Branco',
    /** Trecho (índice do ponto inicial) onde fica o rótulo. */
    labelAt: 0,
    points: [
      [-23.5236, -46.7378],
      [-23.5155, -46.79],
      [-23.4985, -46.855],
      [-23.489, -46.905],
      [-23.481, -46.975],
    ] as [number, number][],
  },
  {
    name: 'Rod. Raposo Tavares',
    labelAt: 0,
    points: [
      [-23.585, -46.72],
      [-23.596, -46.79],
      [-23.603, -46.86],
      [-23.612, -46.93],
      [-23.625, -46.99],
    ] as [number, number][],
  },
  {
    name: 'Rodoanel',
    labelAt: 3,
    points: [
      [-23.43, -46.812],
      [-23.468, -46.818],
      [-23.505, -46.82],
      [-23.548, -46.812],
      [-23.595, -46.79],
      [-23.64, -46.768],
    ] as [number, number][],
  },
] as const;
