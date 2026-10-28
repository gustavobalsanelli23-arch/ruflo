/**
 * DEMONSTRATION DATA — fictitious organization, products and suppliers.
 * Rendered only under /demo, always labelled as fictitious. Screens read it
 * through demoRepository; real organizations never see it.
 */

export const DEMO_TODAY = '2026-10-26';

export interface DemoCategory {
  id: string;
  name: string;
}

export interface DemoSupplier {
  id: string;
  name: string;
}

export interface DemoProduct {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  supplierId: string;
  price: number;
  /** Unit cost before any cost event. */
  cost: number;
  /** Mean units per day at DEMO_TODAY, before seasonality and weekday effects. */
  daily: number;
  /** Annual demand growth (0.12 = +12% a year). */
  growth: number;
  onHand: number;
  leadTimeDays: number;
  costEvents?: { from: string; cost: number }[];
  /** Demand stops after this date (stalled stock). */
  lastSale?: string;
}

export const categories: DemoCategory[] = [
  { id: 'bebidas', name: 'Bebidas' },
  { id: 'vinhos', name: 'Vinhos e destilados' },
  { id: 'cafes', name: 'Cafés e chás' },
  { id: 'mercearia', name: 'Mercearia fina' },
  { id: 'frios', name: 'Frios e laticínios' },
  { id: 'padaria', name: 'Padaria' },
  { id: 'hortifruti', name: 'Hortifruti' },
  { id: 'limpeza', name: 'Casa e limpeza' },
];

export const suppliers: DemoSupplier[] = [
  { id: 'serra-azul', name: 'Distribuidora Serra Azul' },
  { id: 'campos-altos', name: 'Vinícola Campos Altos' },
  { id: 'atlantica', name: 'Importadora Atlântica' },
  { id: 'mirante', name: 'Torrefação Mirante' },
  { id: 'boa-vista', name: 'Laticínios Boa Vista' },
  { id: 'santa-clara', name: 'Moinho Santa Clara' },
  { id: 'rio-claro', name: 'Hortifruti Rio Claro' },
  { id: 'central-sul', name: 'Atacado Central Sul' },
];

const BOA_VISTA_INCREASE = '2026-08-15';
const boaVista = (cost: number) => [{ from: BOA_VISTA_INCREASE, cost: Math.round(cost * 1.09 * 100) / 100 }];

export const products: DemoProduct[] = [
  // Bebidas — volume, thin margins
  { id: 'p01', sku: 'BEB-0101', name: 'Água mineral 1,5 L', categoryId: 'bebidas', supplierId: 'serra-azul', price: 4.49, cost: 2.7, daily: 40, growth: 0.04, onHand: 620, leadTimeDays: 3 },
  { id: 'p02', sku: 'BEB-0102', name: 'Água com gás 500 ml', categoryId: 'bebidas', supplierId: 'serra-azul', price: 5.49, cost: 3.1, daily: 26, growth: 0.1, onHand: 38, leadTimeDays: 3 },
  { id: 'p03', sku: 'BEB-0110', name: 'Refrigerante cola 2 L', categoryId: 'bebidas', supplierId: 'serra-azul', price: 11.99, cost: 10.35, daily: 22, growth: -0.02, onHand: 260, leadTimeDays: 3 },
  { id: 'p04', sku: 'BEB-0111', name: 'Refrigerante guaraná 2 L', categoryId: 'bebidas', supplierId: 'serra-azul', price: 9.99, cost: 9.05, daily: 15, growth: -0.04, onHand: 190, leadTimeDays: 3 },
  { id: 'p05', sku: 'BEB-0120', name: 'Suco integral de uva 1 L', categoryId: 'bebidas', supplierId: 'serra-azul', price: 17.9, cost: 11.2, daily: 9, growth: 0.06, onHand: 150, leadTimeDays: 5 },
  { id: 'p06', sku: 'BEB-0130', name: 'Cerveja artesanal IPA 500 ml', categoryId: 'bebidas', supplierId: 'serra-azul', price: 24.9, cost: 15.8, daily: 11, growth: 0.12, onHand: 210, leadTimeDays: 7 },
  { id: 'p07', sku: 'BEB-0140', name: 'Kombucha gengibre 275 ml', categoryId: 'bebidas', supplierId: 'serra-azul', price: 14.9, cost: 8.9, daily: 7, growth: 0.22, onHand: 96, leadTimeDays: 7 },
  { id: 'p08', sku: 'BEB-0150', name: 'Energético 250 ml', categoryId: 'bebidas', supplierId: 'serra-azul', price: 9.99, cost: 9.15, daily: 12, growth: 0.03, onHand: 230, leadTimeDays: 3 },

  // Vinhos e destilados — high ticket, slow movers
  { id: 'p09', sku: 'VIN-0201', name: 'Vinho tinto Malbec 750 ml', categoryId: 'vinhos', supplierId: 'campos-altos', price: 89.9, cost: 52, daily: 3.2, growth: 0.08, onHand: 96, leadTimeDays: 10 },
  { id: 'p10', sku: 'VIN-0202', name: 'Vinho branco Sauvignon Blanc 750 ml', categoryId: 'vinhos', supplierId: 'campos-altos', price: 79.9, cost: 44, daily: 2.1, growth: 0.05, onHand: 64, leadTimeDays: 10 },
  { id: 'p11', sku: 'VIN-0203', name: 'Espumante brut 750 ml', categoryId: 'vinhos', supplierId: 'campos-altos', price: 99.9, cost: 58, daily: 1.8, growth: 0.1, onHand: 88, leadTimeDays: 10 },
  { id: 'p12', sku: 'VIN-0210', name: 'Vinho tinto Douro 750 ml', categoryId: 'vinhos', supplierId: 'atlantica', price: 139.9, cost: 76, daily: 0.9, growth: 0, onHand: 54, leadTimeDays: 30, lastSale: '2026-07-20' },
  { id: 'p13', sku: 'VIN-0211', name: 'Vinho rosé Provence 750 ml', categoryId: 'vinhos', supplierId: 'atlantica', price: 159.9, cost: 98, daily: 0.7, growth: 0, onHand: 36, leadTimeDays: 30, lastSale: '2026-07-14' },
  { id: 'p14', sku: 'VIN-0220', name: 'Gin nacional 750 ml', categoryId: 'vinhos', supplierId: 'campos-altos', price: 129.9, cost: 82, daily: 0.24, growth: -0.05, onHand: 34, leadTimeDays: 15 },
  { id: 'p15', sku: 'VIN-0230', name: 'Whisky 12 anos 750 ml', categoryId: 'vinhos', supplierId: 'atlantica', price: 299.9, cost: 205, daily: 0.12, growth: -0.03, onHand: 19, leadTimeDays: 30 },

  // Cafés e chás
  { id: 'p16', sku: 'CAF-0301', name: 'Café especial Mirante 250 g', categoryId: 'cafes', supplierId: 'mirante', price: 42.9, cost: 23.5, daily: 9, growth: 0.18, onHand: 22, leadTimeDays: 7 },
  { id: 'p17', sku: 'CAF-0302', name: 'Café em grãos 1 kg', categoryId: 'cafes', supplierId: 'mirante', price: 119.9, cost: 71, daily: 2.4, growth: 0.09, onHand: 58, leadTimeDays: 7 },
  { id: 'p18', sku: 'CAF-0310', name: 'Chá verde orgânico 20 sachês', categoryId: 'cafes', supplierId: 'central-sul', price: 24.9, cost: 12.4, daily: 3.1, growth: 0.04, onHand: 84, leadTimeDays: 5 },
  { id: 'p19', sku: 'CAF-0320', name: 'Cápsulas espresso 10 un.', categoryId: 'cafes', supplierId: 'mirante', price: 29.9, cost: 17.8, daily: 6.5, growth: 0.02, onHand: 170, leadTimeDays: 7 },

  // Mercearia fina
  { id: 'p20', sku: 'MER-0401', name: 'Azeite extravirgem português 500 ml', categoryId: 'mercearia', supplierId: 'atlantica', price: 49.9, cost: 38, daily: 4.6, growth: 0.05, onHand: 120, leadTimeDays: 21, costEvents: [{ from: '2026-08-04', cost: 52.4 }] },
  { id: 'p21', sku: 'MER-0410', name: 'Massa grano duro 500 g', categoryId: 'mercearia', supplierId: 'atlantica', price: 16.9, cost: 8.7, daily: 8.5, growth: 0.06, onHand: 260, leadTimeDays: 14 },
  { id: 'p22', sku: 'MER-0411', name: 'Molho de tomate artesanal 500 g', categoryId: 'mercearia', supplierId: 'central-sul', price: 21.9, cost: 11.2, daily: 6.2, growth: 0.08, onHand: 140, leadTimeDays: 7 },
  { id: 'p23', sku: 'MER-0420', name: 'Mel silvestre 300 g', categoryId: 'mercearia', supplierId: 'central-sul', price: 36.9, cost: 19.8, daily: 2.2, growth: 0.03, onHand: 70, leadTimeDays: 10 },
  { id: 'p24', sku: 'MER-0421', name: 'Granola artesanal 400 g', categoryId: 'mercearia', supplierId: 'central-sul', price: 28.9, cost: 14.6, daily: 4.1, growth: 0.11, onHand: 90, leadTimeDays: 7 },
  { id: 'p25', sku: 'MER-0430', name: 'Chocolate 70% cacau 100 g', categoryId: 'mercearia', supplierId: 'central-sul', price: 19.9, cost: 10.9, daily: 7.4, growth: 0.07, onHand: 210, leadTimeDays: 7 },
  { id: 'p26', sku: 'MER-0431', name: 'Castanha-do-pará 200 g', categoryId: 'mercearia', supplierId: 'central-sul', price: 39.9, cost: 27.8, daily: 0.9, growth: -0.06, onHand: 124, leadTimeDays: 10 },

  // Frios e laticínios — Boa Vista raised costs 9% on 15 Aug
  { id: 'p27', sku: 'FRI-0501', name: 'Queijo canastra 500 g', categoryId: 'frios', supplierId: 'boa-vista', price: 74.9, cost: 44, daily: 3.6, growth: 0.2, onHand: 46, leadTimeDays: 5, costEvents: boaVista(44) },
  { id: 'p28', sku: 'FRI-0502', name: 'Queijo parmesão curado 300 g', categoryId: 'frios', supplierId: 'boa-vista', price: 59.9, cost: 31.9, daily: 4.2, growth: 0.17, onHand: 60, leadTimeDays: 5, costEvents: boaVista(31.9) },
  { id: 'p29', sku: 'FRI-0503', name: 'Queijo brie 150 g', categoryId: 'frios', supplierId: 'boa-vista', price: 32.9, cost: 17.9, daily: 6, growth: 0.14, onHand: 13, leadTimeDays: 5, costEvents: boaVista(17.9) },
  { id: 'p30', sku: 'FRI-0510', name: 'Manteiga com sal 200 g', categoryId: 'frios', supplierId: 'boa-vista', price: 18.9, cost: 11.4, daily: 9.5, growth: 0.04, onHand: 150, leadTimeDays: 5, costEvents: boaVista(11.4) },
  { id: 'p31', sku: 'FRI-0511', name: 'Iogurte natural 500 g', categoryId: 'frios', supplierId: 'boa-vista', price: 12.9, cost: 8.2, daily: 11, growth: 0.05, onHand: 120, leadTimeDays: 3, costEvents: boaVista(8.2) },
  { id: 'p32', sku: 'FRI-0520', name: 'Presunto parma fatiado 100 g', categoryId: 'frios', supplierId: 'atlantica', price: 34.9, cost: 21.5, daily: 3.3, growth: 0.06, onHand: 54, leadTimeDays: 14 },

  // Padaria — perishable, daily replenishment
  { id: 'p33', sku: 'PAD-0601', name: 'Pão de fermentação natural', categoryId: 'padaria', supplierId: 'santa-clara', price: 22.9, cost: 8.9, daily: 24, growth: 0.09, onHand: 40, leadTimeDays: 1 },
  { id: 'p34', sku: 'PAD-0602', name: 'Croissant de manteiga', categoryId: 'padaria', supplierId: 'santa-clara', price: 9.9, cost: 3.8, daily: 30, growth: 0.06, onHand: 52, leadTimeDays: 1 },
  { id: 'p35', sku: 'PAD-0610', name: 'Pão de queijo congelado 1 kg', categoryId: 'padaria', supplierId: 'santa-clara', price: 39.9, cost: 22, daily: 3.8, growth: 0.03, onHand: 70, leadTimeDays: 5 },
  { id: 'p36', sku: 'PAD-0620', name: 'Bolo de laranja', categoryId: 'padaria', supplierId: 'santa-clara', price: 34.9, cost: 14.5, daily: 4.4, growth: 0.05, onHand: 9, leadTimeDays: 1 },

  // Hortifruti
  { id: 'p37', sku: 'HOR-0701', name: 'Tomate italiano (kg)', categoryId: 'hortifruti', supplierId: 'rio-claro', price: 12.9, cost: 8.1, daily: 21, growth: 0.02, onHand: 60, leadTimeDays: 1 },
  { id: 'p38', sku: 'HOR-0702', name: 'Banana prata (kg)', categoryId: 'hortifruti', supplierId: 'rio-claro', price: 8.9, cost: 5.4, daily: 26, growth: 0.01, onHand: 70, leadTimeDays: 1 },
  { id: 'p39', sku: 'HOR-0710', name: 'Mix de folhas orgânicas', categoryId: 'hortifruti', supplierId: 'rio-claro', price: 14.9, cost: 7.4, daily: 12, growth: 0.15, onHand: 26, leadTimeDays: 1 },
  { id: 'p40', sku: 'HOR-0720', name: 'Abacate (kg)', categoryId: 'hortifruti', supplierId: 'rio-claro', price: 13.9, cost: 9.8, daily: 8, growth: 0.04, onHand: 30, leadTimeDays: 2 },

  // Casa e limpeza — commodity margins
  { id: 'p41', sku: 'LIM-0801', name: 'Detergente biodegradável 500 ml', categoryId: 'limpeza', supplierId: 'central-sul', price: 8.9, cost: 7.95, daily: 7.5, growth: 0.02, onHand: 160, leadTimeDays: 7 },
  { id: 'p42', sku: 'LIM-0802', name: 'Papel toalha 2 rolos', categoryId: 'limpeza', supplierId: 'central-sul', price: 12.9, cost: 11.45, daily: 6.8, growth: 0, onHand: 140, leadTimeDays: 7 },
  { id: 'p43', sku: 'LIM-0810', name: 'Sabão líquido 3 L', categoryId: 'limpeza', supplierId: 'central-sul', price: 54.9, cost: 41, daily: 0.5, growth: -0.04, onHand: 72, leadTimeDays: 7 },
  { id: 'p44', sku: 'LIM-0820', name: 'Esponja dupla face 3 un.', categoryId: 'limpeza', supplierId: 'central-sul', price: 7.9, cost: 4.1, daily: 5.2, growth: 0.01, onHand: 120, leadTimeDays: 7 },
];

export function categoryName(id: string): string {
  return categories.find((category) => category.id === id)?.name ?? id;
}

export function supplierName(id: string): string {
  return suppliers.find((supplier) => supplier.id === id)?.name ?? id;
}

export function costOn(product: DemoProduct, date: string): number {
  let cost = product.cost;
  for (const event of product.costEvents ?? []) {
    if (date >= event.from) cost = event.cost;
  }
  return cost;
}
