// Conteúdo do site. Apenas informações verificadas em fontes oficiais:
// vipbodyhair.com.br, perfil do Google (descrição publicada pelo salão),
// Instagram @vipbodyhair / @rickymoica, revista Vero (23/03/2021) e
// proeducation.com.br/ricky-moica.

export const SITE_URL = 'https://vipbodyhair.com.br';

export type ImageSet = {
  name: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  avif?: boolean;
};

const img = (name: string, widths: number[], width: number, height: number, alt: string, avif = false): ImageSet => ({
  name,
  widths,
  width,
  height,
  alt,
  avif,
});

export const images = {
  honeyBlonde: img('honey-blonde', [480, 800, 1200], 1200, 1582, 'Cliente com cabelo longo em ondas, coloração honey blonde feita no VIP body & hair', true),
  honeyBlondeLuz: img('honey-blonde-luz', [480, 800], 800, 1052, 'Honey blonde com nuances quentes e iluminadas, vista de frente'),
  honeyBlondePerfil: img('honey-blonde-perfil', [480, 800, 1200], 1200, 1582, 'Detalhe do honey blonde em ondas, com a cliente apoiando o rosto na mão'),
  ricky: img('ricky-moica', [480, 800, 1100], 1100, 1375, 'Ricky Moica, diretor criativo do VIP body & hair, em evento da Wella Professionals'),
  salaoInterior: img('salao-interior', [480, 720], 720, 900, 'Salão do VIP body & hair com espelhos em arco iluminados e cliente de cabelo loiro longo', true),
  salaoInteriorAlto: img('salao-interior-alto', [480, 720], 720, 1280, 'Ambiente do salão com espelhos em arco e luz natural'),
  coloracao: img('coloracao-mechas', [480, 720], 720, 900, 'Profissional aplicando mechas com papel na bancada do salão'),
  spa: img('spa-capilar', [480, 720], 720, 900, 'Cliente durante tratamento capilar com vapor no salão'),
  cortePb: img('corte-preto-e-branco', [480, 720], 720, 1280, 'Detalhe em preto e branco de um corte sendo finalizado com tesoura'),
  franja: img('corte-franja-resultado', [480, 720], 720, 900, 'Resultado de corte em camadas com franja cortininha e fios castanhos'),
  corteCurto: img('corte-curto-resultado', [480, 720], 720, 900, 'Resultado de corte curto com franja, em tom castanho claro'),
  consultoria: img('corte-consultoria', [480, 720], 720, 900, 'Diretor criativo avaliando o caimento do cabelo da cliente antes do corte'),
  atendimento: img('diretor-criativo-atendimento', [480, 720], 720, 1280, 'Atendimento no salão, com o profissional ao lado da cliente na cadeira'),
  ferramentas: img('ferramentas', [480, 720], 720, 900, 'Escovas e ferramentas de trabalho organizadas na bancada'),
  corteCurtoAjuste: img('corte-curto-ajuste', [480, 720], 720, 900, 'Profissional ajustando o caimento de um corte curto com franja'),
  referencia: img('referencia-tablet', [480, 720], 720, 1280, 'Tablet na bancada mostrando a foto de referência de um loiro em ondas'),
  rickyWella: img('ricky-moica-wella', [480, 800], 800, 1000, 'Ricky Moica no lançamento da coloração Pure Perfection, da Wella Professionals'),
  corteCamadas: img(
    'corte-camadas-horizontal',
    [800, 1400, 2000],
    2000,
    1126,
    'Cliente com corte em camadas e franja cortininha, com o profissional ajustando os fios no salão',
    true,
  ),
  cafe: img('cafe-menu', [480, 720], 720, 720, 'Croissant recheado servido no menu do salão'),
  maquiagem: img('maquiagem-editorial', [480], 480, 849, 'Maquiagem editorial com olhos esfumados em tom pêssego e batom vermelho'),
  shakes: img('bar-shakes', [480, 800], 800, 1000, 'Evinha servindo um shake proteico no balcão do salão'),
  penteado: img('penteado-salao', [480, 720], 720, 900, 'Penteado meio preso com torcido, feito no salão'),
} satisfies Record<string, ImageSet>;

export const logo = {
  white: { src: '/images/logo-vip-branco.webp', width: 640, height: 452 },
  ink: { src: '/images/logo-vip-tinta.webp', width: 640, height: 452 },
  monoWhite: { src: '/images/monograma-vp-branco.png', width: 89, height: 112 },
  monoInk: { src: '/images/monograma-vp-tinta.png', width: 89, height: 112 },
};

export const business = {
  name: 'VIP body & hair',
  tagline: 'Salão de beleza premium em Barueri',
  description:
    'Salão de beleza premium no Bethaville, em Barueri (SP), com direção criativa de Ricky Moica, embaixador Wella Professionals. Coloração, luzes, corte com visagismo, tratamentos capilares, make e penteado, mãos, olhar e pele.',
  email: 'contato@vipbodyhair.com.br',
  phone: { display: '(11) 4706-4747', href: 'tel:+551147064747', e164: '+551147064747' },
};

export const address = {
  street: 'Av. Anápolis, 510',
  district: 'Bethaville',
  city: 'Barueri',
  state: 'SP',
  postalCode: '06404-250',
  lat: -23.5056047,
  lng: -46.8653712,
  full: 'Av. Anápolis, 510 — Bethaville, Barueri/SP, 06404-250',
};

/** Horário publicado pelo salão no perfil do Google: "Ter a Sáb: 10h às 20h". */
export const hours = {
  summary: 'Terça a sábado, das 10h às 20h',
  short: 'Ter a sáb · 10h–20h',
  closed: 'Domingo e segunda: fechado',
  schemaDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  opens: '10:00',
  closes: '20:00',
};

export const whatsapp = {
  number: '5511997094747',
  display: '(11) 99709-4747',
};

export const links = {
  instagram: 'https://www.instagram.com/vipbodyhair/',
  instagramHandle: '@vipbodyhair',
  rickyInstagram: 'https://www.instagram.com/rickymoica/',
  facebook: 'https://www.facebook.com/vipbodyhair/',
  googleMaps: 'https://maps.google.com/?cid=76764318468023184',
  directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('VIP body & hair, Av. Anápolis, 510 - Bethaville, Barueri - SP, 06404-250')}`,
  waze: 'https://waze.com/ul?ll=-23.5056047,-46.8653712&navigate=yes',
  mapEmbed:
    'https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sVIP+body+%26+hair,+Av.+An%C3%A1polis,+510+-+Bethaville,+Barueri+-+SP!6i16!3m1!1spt-BR!5m1!1spt-BR',
};

/** Avaliação no Google (perfil do salão) na data da pesquisa. */
export const googleRating = { value: 4.5, count: 129 };

export const nav = [
  { id: 'sobre', label: 'O salão' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'direcao-criativa', label: 'Ricky Moica' },
  { id: 'galeria', label: 'Galeria' },
  { id: 'contato', label: 'Contato' },
] as const;

export type FeaturedService = {
  id: string;
  index: string;
  name: string;
  kicker: string;
  description: string;
  items: string[];
  image: ImageSet;
};

/** Serviços em destaque — todos citados pelo salão no perfil do Google ou no Instagram. */
export const featuredServices: FeaturedService[] = [
  {
    id: 'coloracao',
    index: '01',
    name: 'Coloração & luzes',
    kicker: 'A especialidade da casa',
    description:
      'Loiros, luzes e coloração profissional pensados para o seu tom de pele e para a rotina que você tem — do honey blonde iluminado aos castanhos com profundidade.',
    items: ['Coloração profissional', 'Luzes e mechas', 'Loiros'],
    image: images.coloracao,
  },
  {
    id: 'corte',
    index: '02',
    name: 'Corte & visagismo',
    kicker: 'Feminino e masculino',
    description:
      'Cortes construídos a partir do visagismo: formato do rosto, textura dos fios e estilo pessoal orientam cada camada, franja e caimento.',
    items: ['Corte feminino', 'Corte masculino', 'Visagismo', 'Barba'],
    image: images.franja,
  },
  {
    id: 'tratamentos',
    index: '03',
    name: 'Tratamentos capilares',
    kicker: 'Saúde dos fios',
    description:
      'Hidratação e tratamentos que devolvem força, brilho e maciez — o cuidado que sustenta qualquer cor e qualquer corte.',
    items: ['Tratamentos capilares', 'Hidratação', 'Mega hair'],
    image: images.spa,
  },
  {
    id: 'make',
    index: '04',
    name: 'Make & penteado',
    kicker: 'Para o dia a dia e para os grandes dias',
    description:
      'Maquiagem e penteados feitos por especialistas da casa, do acabamento natural às produções completas para eventos.',
    items: ['Maquiagem', 'Penteado'],
    image: images.maquiagem,
  },
];

/** Demais serviços citados pelo salão no perfil do Google. */
export const moreServices: { group: string; items: string[] }[] = [
  { group: 'Mãos & pés', items: ['Manicure', 'Pedicure'] },
  { group: 'Olhar', items: ['Sobrancelha', 'Lash lifting', 'Micropigmentação'] },
  { group: 'Pele', items: ['Limpeza de pele'] },
];

/** Diferenciais publicados pelo próprio salão (perfil do Google, Instagram e imprensa). */
export const differentials = [
  {
    title: 'Consultoria gratuita',
    text: 'Antes de qualquer mudança, uma conversa: entendemos sua referência, seu histórico e o resultado possível para o seu cabelo.',
  },
  {
    title: 'Embaixador Wella Professionals',
    text: 'Direção criativa de Ricky Moica, um dos 8 embaixadores Wella Professionals no Brasil, em contato direto com as tendências e técnicas mais atuais.',
  },
  {
    title: 'Especialistas em cor',
    text: 'Coloração, luzes e tratamentos capilares são o centro do trabalho — com atenção especial aos loiros.',
  },
  {
    title: 'Visagismo em cada corte',
    text: 'Opções de corte desenhadas para o formato do rosto e para o estilo de quem senta na cadeira.',
  },
  {
    title: 'Pausa com sabor',
    text: 'Shakes proteicos, sucos, lanches e sobremesas no menu da casa, para aproveitar o tempo no salão.',
  },
  {
    title: 'Espaço de luxo, preço justo',
    text: 'Um prédio próprio no Bethaville, com estrutura acessível, pensado para uma experiência completa de bem-estar.',
  },
];

export type GalleryItem = { image: ImageSet; caption: string; shape: 'tall' | 'portrait' | 'square' };

export const gallery: GalleryItem[] = [
  { image: images.honeyBlondeLuz, caption: 'Honey blonde', shape: 'portrait' },
  { image: images.salaoInteriorAlto, caption: 'O salão', shape: 'tall' },
  { image: images.cortePb, caption: 'Corte em construção', shape: 'tall' },
  { image: images.corteCurtoAjuste, caption: 'Ajuste do corte curto', shape: 'portrait' },
  { image: images.referencia, caption: 'A referência da cliente', shape: 'tall' },
  { image: images.corteCurto, caption: 'Corte curto com franja', shape: 'portrait' },
  { image: images.rickyWella, caption: 'Ricky Moica · Wella Pure Perfection', shape: 'portrait' },
  { image: images.penteado, caption: 'Penteado meio preso', shape: 'portrait' },
  { image: images.atendimento, caption: 'Atendimento', shape: 'tall' },
  { image: images.consultoria, caption: 'Antes do corte', shape: 'portrait' },
];

/**
 * Trechos de avaliações públicas exibidos pelo Google no perfil do salão.
 * O Google não exibe o nome dos autores nesses destaques; por isso não há nomes aqui.
 */
export const reviewHighlights = [
  'Excelente espaço, ótimo atendimento e profissionais de altíssimo nível.',
  'Não deixe de pedir o menu de sucos, lanches e sobremesas sensacional.',
];

export const faqs = [
  {
    question: 'Como faço para agendar?',
    answer: `Pelo WhatsApp ${'(11) 99709-4747'}: conte qual serviço deseja e a sua preferência de dia e horário, e a equipe confirma a disponibilidade. Também atendemos pelo telefone (11) 4706-4747.`,
  },
  {
    question: 'A consultoria é gratuita?',
    answer:
      'Sim. O salão oferece consultoria gratuita para entender o seu cabelo, a sua referência e o melhor caminho até o resultado — ideal antes de mudanças de cor ou de corte.',
  },
  {
    question: 'Qual é o horário de funcionamento?',
    answer: 'De terça a sábado, das 10h às 20h. Aos domingos e segundas o salão não abre.',
  },
  {
    question: 'Onde fica o VIP body & hair?',
    answer:
      'Na Av. Anápolis, 510, no Bethaville, em Barueri (SP). O local tem entrada, banheiro e estacionamento acessíveis.',
  },
  {
    question: 'Quais serviços o salão oferece?',
    answer:
      'Coloração profissional, luzes, corte feminino e masculino, barba, tratamentos capilares, hidratação, mega hair, maquiagem e penteado, manicure, pedicure, sobrancelha, lash lifting, micropigmentação e limpeza de pele, entre outros.',
  },
];

export const serviceOptions = [
  'Consultoria gratuita',
  'Coloração / luzes',
  'Corte feminino',
  'Corte masculino / barba',
  'Tratamento capilar / hidratação',
  'Mega hair',
  'Maquiagem / penteado',
  'Manicure / pedicure',
  'Sobrancelha / lash lifting',
  'Micropigmentação',
  'Limpeza de pele',
  'Outro',
];
