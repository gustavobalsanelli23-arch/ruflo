// Catálogo de imóveis. ATENÇÃO: estes cinco imóveis são DEMONSTRATIVOS —
// exemplos de como o catálogo será apresentado, com fotos de banco de imagens,
// metragens e valores ilustrativos. O site os identifica como "Exemplo" em
// cada card e no percurso. Para publicar imóveis reais, substitua a lista e
// mude `catalog.demo` para false (ou ligue um CMS em src/lib/catalog.ts).
//
// Cada imóvel é percorrido por AMBIENTES, na ordem em que se entra nele
// (fachada → entrada → living → …). O primeiro ambiente é a capa do card.
// Pontos de interesse (hotspots) ficam em % da foto: x da esquerda, y do topo.
import { photos, type PhotoSlot } from './media';

/** Foto de capa do imóvel (primeiro ambiente do percurso). */
export const coverOf = (p: Property): PhotoSlot => p.rooms[0].photo;

export type Purpose = 'comprar' | 'investir';
export type PropertyType = 'Casa' | 'Apartamento' | 'Cobertura' | 'Terreno' | 'Comercial';

export interface Hotspot {
  /** Posição na foto, em % (0–100) a partir da esquerda e do topo. */
  x: number;
  y: number;
  label: string;
}

export interface Room {
  /** Nome do ambiente, ex.: "Fachada", "Living", "Suíte". */
  name: string;
  photo: PhotoSlot;
  hotspots?: readonly Hotspot[];
}

export interface Property {
  /** Identificador estável (CMS, URL futura de detalhe). */
  id: string;
  /** Código exibido ao cliente e enviado na mensagem de interesse. */
  code: string;
  title: string;
  type: PropertyType;
  purposes: readonly Purpose[];
  location: {
    /** Região usada no filtro (deve existir em data/content.ts → regions). */
    region: string;
    /** Como aparece no card, ex.: "Alphaville, Barueri". */
    label: string;
  };
  /** Área privativa em m². */
  area: number;
  bedrooms?: number;
  suites?: number;
  parking?: number;
  /** Valor em reais; null = "sob consulta". */
  price: number | null;
  summary: string;
  features: readonly string[];
  /** Ambientes do percurso, na ordem da visita (o primeiro é a capa). */
  rooms: readonly Room[];
  /** Conteúdo demonstrativo (não é um imóvel real da VOP). */
  demo: boolean;
}

export const demoProperties: readonly Property[] = [
  {
    id: 'exemplo-residencia-contemporanea',
    code: 'EX-01',
    title: 'Residência contemporânea',
    type: 'Casa',
    purposes: ['comprar'],
    location: { region: 'Alphaville', label: 'Alphaville, Barueri' },
    area: 620,
    suites: 5,
    parking: 6,
    price: 7_900_000,
    summary: 'Volumes limpos, grandes panos de vidro e a sala aberta para o jardim.',
    features: ['Pé-direito duplo na sala', 'Cozinha integrada com ilha', 'Suíte principal com closet'],
    rooms: [
      { name: 'Fachada', photo: photos.casaContemporanea, hotspots: [{ x: 36, y: 70, label: 'Panos de vidro do piso ao teto' }, { x: 66, y: 66, label: 'Volumes em concreto' }] },
      { name: 'Hall de entrada', photo: photos.hallEntrada, hotspots: [{ x: 86, y: 34, label: 'Porta pivotante em vidro' }] },
      { name: 'Living', photo: photos.livingLareira, hotspots: [{ x: 50, y: 53, label: 'Lareira embutida' }, { x: 86, y: 38, label: 'Luz natural filtrada' }] },
      { name: 'Cozinha', photo: photos.cozinhaJanelas, hotspots: [{ x: 44, y: 62, label: 'Ilha central' }, { x: 80, y: 38, label: 'Janelas para o jardim' }] },
    ],
    demo: true,
  },
  {
    id: 'exemplo-casa-piscina-borda-infinita',
    code: 'EX-02',
    title: 'Casa com piscina de borda infinita',
    type: 'Casa',
    purposes: ['comprar', 'investir'],
    location: { region: 'Região oeste', label: 'Região oeste de São Paulo' },
    area: 540,
    suites: 4,
    parking: 4,
    price: null,
    summary: 'Área de lazer voltada para a mata, com piscina de borda infinita e varanda gourmet.',
    features: ['Piscina de borda infinita', 'Varanda gourmet', 'Suítes com vista para o verde'],
    rooms: [
      { name: 'Área de lazer', photo: photos.piscinaBorda, hotspots: [{ x: 70, y: 76, label: 'Borda infinita' }, { x: 62, y: 46, label: 'Vista para a mata' }] },
      { name: 'Suíte', photo: photos.quartoMadeira, hotspots: [{ x: 30, y: 80, label: 'Marcenaria em madeira' }] },
    ],
    demo: true,
  },
  {
    id: 'exemplo-casa-condominio',
    code: 'EX-03',
    title: 'Casa em condomínio fechado',
    type: 'Casa',
    purposes: ['comprar'],
    location: { region: 'Barueri', label: 'Barueri' },
    area: 380,
    bedrooms: 4,
    suites: 3,
    parking: 4,
    price: 3_450_000,
    summary: 'Fachada de linhas retas, jardim frontal e planta pensada para a rotina da família.',
    features: ['Escritório no térreo', 'Cozinha com ilha', 'Quintal com espaço gourmet'],
    rooms: [
      { name: 'Fachada', photo: photos.casaCondominio, hotspots: [{ x: 55, y: 34, label: 'Volumes recortados' }] },
      { name: 'Sala', photo: photos.salaFamilia, hotspots: [{ x: 56, y: 48, label: 'Portas de vidro para a varanda' }] },
      { name: 'Cozinha', photo: photos.cozinhaIlha, hotspots: [{ x: 55, y: 64, label: 'Ilha com cooktop' }, { x: 44, y: 44, label: 'Integração com o living' }] },
    ],
    demo: true,
  },
  {
    id: 'exemplo-cobertura-vista',
    code: 'EX-04',
    title: 'Cobertura com vista panorâmica',
    type: 'Cobertura',
    purposes: ['comprar', 'investir'],
    location: { region: 'Alphaville', label: 'Alphaville, Barueri' },
    area: 290,
    suites: 3,
    parking: 3,
    price: 4_200_000,
    summary: 'Terraço com vista aberta para a cidade e suítes banhadas de luz natural.',
    features: ['Terraço com vista', 'Living com pé-direito generoso', 'Três vagas'],
    rooms: [
      { name: 'Vista', photo: photos.cidadeNoite, hotspots: [{ x: 50, y: 52, label: 'Vista aberta para a cidade' }] },
      { name: 'Living', photo: photos.livingConcreto, hotspots: [{ x: 20, y: 30, label: 'Pilar em concreto aparente' }, { x: 74, y: 30, label: 'Janelas do piso ao teto' }] },
      { name: 'Suíte', photo: photos.quartoLuz, hotspots: [{ x: 70, y: 30, label: 'Cortinas de linho' }] },
    ],
    demo: true,
  },
  {
    id: 'exemplo-apartamento-investimento',
    code: 'EX-05',
    title: 'Apartamento integrado',
    type: 'Apartamento',
    purposes: ['investir'],
    location: { region: 'Barueri', label: 'Barueri' },
    area: 98,
    bedrooms: 2,
    suites: 1,
    parking: 2,
    price: 1_150_000,
    summary: 'Planta compacta e integrada, perto de centros empresariais.',
    features: ['Living e jantar integrados', 'Suíte com terraço', 'Duas vagas'],
    rooms: [
      { name: 'Living e jantar', photo: photos.livingIntegrado, hotspots: [{ x: 28, y: 74, label: 'Jantar integrado' }] },
      { name: 'Suíte', photo: photos.suiteBranca, hotspots: [{ x: 36, y: 54, label: 'Porta para o terraço' }] },
    ],
    demo: true,
  },
];

export const catalog = {
  /** true enquanto o catálogo for só de exemplos. */
  demo: true,
  properties: demoProperties,
};
