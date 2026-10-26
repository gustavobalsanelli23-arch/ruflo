// Catálogo de imóveis. ATENÇÃO: estes cinco imóveis são DEMONSTRATIVOS —
// exemplos de como o catálogo será apresentado, com fotos de banco de imagens,
// metragens e valores ilustrativos. O site os identifica como "Exemplo" em
// cada card e no detalhe. Para publicar imóveis reais, substitua a lista e
// mude `catalog.demo` para false (ou ligue um CMS em src/lib/catalog.ts).
import { photos, type PhotoSlot } from './media';

export type Purpose = 'comprar' | 'investir';
export type PropertyType = 'Casa' | 'Apartamento' | 'Cobertura' | 'Terreno' | 'Comercial';

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
  photos: readonly PhotoSlot[];
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
    photos: [photos.casaContemporanea, photos.cozinhaJanelas],
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
    photos: [photos.piscinaBorda, photos.quartoMadeira],
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
    photos: [photos.casaCondominio, photos.cozinhaIlha],
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
    photos: [photos.cidadeNoite, photos.quartoLuz],
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
    photos: [photos.livingIntegrado, photos.suiteBranca],
    demo: true,
  },
];

export const catalog = {
  /** true enquanto o catálogo for só de exemplos. */
  demo: true,
  properties: demoProperties,
};
