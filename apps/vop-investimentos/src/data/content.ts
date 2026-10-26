// Textos e listas do site. Serviços, regiões e forma de atendimento vêm do
// BRIEFING (não foi possível confirmá-los no Instagram, que exige login):
// estão marcados com `confirmed: false` e aparecem nos avisos do build até
// alguém da VOP validar. História, experiência e equipe não têm fonte e
// ficam vazias — as partes correspondentes do site somem até serem preenchidas.
import type { PhotoSlot } from './media';

export interface NavItem {
  id: string;
  label: string;
}

/** Âncoras do menu, na ordem do site. */
export const nav: readonly NavItem[] = [
  { id: 'imoveis', label: 'Imóveis' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'regioes', label: 'Regiões' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'contato', label: 'Contato' },
];

export const hero = {
  badge: 'Inteligência imobiliária',
  /** Quebras planejadas: uma linha por item. */
  headline: ['Mais do que encontrar imóveis.', 'Construir patrimônio.'] as const,
  subheadline:
    'Conectamos pessoas a oportunidades imobiliárias através de estratégia, conhecimento de mercado e assessoria especializada.',
};

export interface Service {
  name: string;
  description: string;
}

export const services = {
  confirmed: false,
  items: [
    { name: 'Assessoria imobiliária', description: 'Busca, curadoria e negociação conduzidas por quem conhece o mercado.' },
    { name: 'Investimentos imobiliários', description: 'O imóvel avaliado também como ativo: perfil, liquidez e horizonte.' },
    { name: 'Análise de oportunidades', description: 'Localização, preço e documentação estudados antes da proposta.' },
    { name: 'Crédito imobiliário', description: 'Orientação para escolher e encaminhar o financiamento adequado.' },
    { name: 'Suporte técnico e jurídico', description: 'Contratos, vistorias e documentos acompanhados até a escritura.' },
  ] satisfies Service[],
};

export interface Chapter {
  /** Rótulo no trilho do hero. */
  label: string;
  /** Cena em public/videos/capitulos/ (ver data/media.ts). */
  scene: string;
  /** Título em duas linhas. */
  headline: readonly [string, string];
  blurb: string;
}

/**
 * Capítulos do hero: a frase do briefing abre, e cada serviço vira um
 * capítulo com o próprio texto (mesma pendência de confirmação dos serviços).
 */
export const chapters: readonly Chapter[] = [
  { label: 'Visão', scene: 'background', headline: hero.headline, blurb: hero.subheadline },
  { label: 'Assessoria', scene: 'expression', headline: ['Assessoria imobiliária', 'do início à escritura.'], blurb: services.items[0].description },
  { label: 'Investimentos', scene: 'refinement', headline: ['O imóvel visto', 'também como ativo.'], blurb: services.items[1].description },
  { label: 'Oportunidades', scene: 'craftsmanship', headline: ['Oportunidades estudadas', 'antes da proposta.'], blurb: services.items[2].description },
  { label: 'Crédito', scene: 'origin', headline: ['Crédito imobiliário', 'que cabe no seu plano.'], blurb: services.items[3].description },
  { label: 'Segurança', scene: 'balance', headline: ['Segurança', 'em cada etapa.'], blurb: services.items[4].description },
];

export const intro = {
  title: ['Inteligência por trás', 'de cada escolha.'],
  text: 'Antes de mostrar um imóvel, a VOP entende o seu momento. Cada recomendação parte de leitura de mercado, análise do ativo e acompanhamento até a assinatura.',
};

export const investments = {
  title: ['Decisões inteligentes começam', 'com uma visão além do presente.'],
  text: 'Um bom investimento imobiliário se decide antes da compra: no estudo da região, no perfil do ativo e no encaixe com os seus objetivos. É aí que uma assessoria especializada faz diferença.',
  pillars: [
    {
      icon: 'compass',
      title: 'Análise estratégica',
      text: 'Avaliação de oportunidades considerando localização, perfil do ativo e objetivos do cliente.',
    },
    {
      icon: 'lines',
      title: 'Inteligência de mercado',
      text: 'Informações e conhecimento para apoiar decisões imobiliárias mais conscientes.',
    },
    {
      icon: 'shield',
      title: 'Segurança na operação',
      text: 'Acompanhamento especializado e suporte técnico e jurídico em cada etapa da negociação.',
    },
  ],
  note: 'Investimentos imobiliários envolvem riscos. A VOP não promete rentabilidade nem valorização: ajuda você a decidir com mais informação.',
} as const;

export interface Region {
  name: string;
  /** Rótulo no mapa (pode ser mais curto). */
  short: string;
  description: string;
  /** Coordenadas aproximadas do centro da área, para o mapa esquemático. */
  lat: number;
  lon: number;
  /** Raio aproximado da área no mapa, em km (0 = ponto). */
  radiusKm: number;
}

export const regions = {
  confirmed: false,
  title: ['Alphaville, Barueri', 'e a região oeste', 'de São Paulo.'],
  text: 'As regiões que a VOP acompanha de perto. Conhecer o entorno, os acessos e o perfil de cada bairro faz parte de toda recomendação.',
  items: [
    {
      name: 'Alphaville',
      short: 'Alphaville',
      description:
        'Bairros planejados e condomínios residenciais entre Barueri e Santana de Parnaíba, com centros empresariais e acesso pela Castello Branco.',
      lat: -23.4955,
      lon: -46.8495,
      radiusKm: 0,
    },
    {
      name: 'Barueri',
      short: 'Barueri',
      description: 'Município da Grande São Paulo com polos comerciais e residenciais ao longo da Rodovia Castello Branco.',
      lat: -23.5112,
      lon: -46.8764,
      radiusKm: 0,
    },
    {
      name: 'Região oeste',
      short: 'Região oeste',
      description: 'Bairros e cidades a oeste da capital, ligados pela Castello Branco, pela Raposo Tavares e pelo Rodoanel.',
      lat: -23.548,
      lon: -46.835,
      radiusKm: 8.5,
    },
  ] satisfies Region[],
};

export const about = {
  title: ['Relacionamentos construídos sobre confiança.', 'Patrimônio construído com estratégia.'],
  philosophy:
    'Para a VOP, comprar ou investir em um imóvel é uma decisão de patrimônio, não uma transação. Por isso o atendimento começa pelos seus objetivos, e não pelo catálogo.',
  /** PLACEHOLDER: história da empresa (parágrafos). Vazio = bloco oculto. */
  history: [] as string[],
  /** PLACEHOLDER: ano de fundação, ex.: 2019. Nada de "X anos de experiência" sem fonte. */
  foundedYear: null as number | null,
  /** PLACEHOLDER: equipe — nome, função e foto (espaço criado em data/media.ts). */
  team: [] as { name: string; role: string; creci?: string; photo?: PhotoSlot }[],
  confirmed: false,
  differentials: [
    { title: 'Atendimento próximo', text: 'Um especialista acompanha você do primeiro contato à entrega das chaves.' },
    { title: 'Olhar de investidor', text: 'Cada imóvel é avaliado também como ativo: localização, liquidez e potencial de uso.' },
    { title: 'Segurança documental', text: 'Suporte técnico e jurídico para que cada etapa aconteça com clareza.' },
    { title: 'Crédito orientado', text: 'Ajuda para encontrar o financiamento que cabe no seu planejamento.' },
  ],
  process: [
    { title: 'Conversa', text: 'Entendemos o momento, o perfil e os objetivos de quem compra ou investe.' },
    { title: 'Curadoria', text: 'Selecionamos e analisamos as opções que fazem sentido, com dados de mercado.' },
    { title: 'Visitas e negociação', text: 'Acompanhamos visitas, propostas e condições de pagamento.' },
    { title: 'Fechamento seguro', text: 'Documentação, crédito e contrato revisados até a escritura.' },
  ],
};

export const finalCta = {
  title: 'Seu próximo movimento começa com uma boa decisão.',
  text: 'Converse com a VOP e descubra oportunidades alinhadas aos seus objetivos.',
  button: 'Fale com um especialista',
};

/** O que o cliente pode escolher no formulário (assunto da mensagem). */
export const interests = ['Comprar um imóvel', 'Investir em imóveis', 'Crédito imobiliário', 'Outro assunto'] as const;

/** Itens do briefing que ainda dependem de confirmação da VOP. */
export function pendingContent(): string[] {
  const pending: string[] = [];
  if (!services.confirmed) pending.push('serviços (vindos do briefing)');
  if (!regions.confirmed) pending.push('regiões de atuação (vindas do briefing)');
  if (!about.confirmed) pending.push('diferenciais e forma de atendimento (texto proposto)');
  if (!about.history.length) pending.push('história da empresa');
  if (!about.foundedYear) pending.push('ano de fundação/experiência');
  if (!about.team.length) pending.push('equipe e fotos reais');
  return pending;
}
