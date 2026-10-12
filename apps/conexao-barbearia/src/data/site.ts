// Fonte única das informações comerciais da Conexão Barbearia.
// Tudo aqui foi conferido no site oficial (barbeariaconexao.com.br) em out/2026.
// Campos `null` não estavam disponíveis: preencha-os quando houver o dado real.

export const SITE_URL = 'https://barbeariaconexao.com.br';

export const business = {
  name: 'Conexão Barbearia',
  legalId: '50.350.938/0001-00', // CNPJ informado no rodapé do site anterior
  foundedYear: 2015,
  city: 'Barueri',
  state: 'SP',
  email: 'contato@barbeariaconexao.com.br',
  tagline: 'Conectamos Barueri ao seu melhor estilo.',
} as const;

/** Sistema oficial de agendamento (AppBarber) e plano de assinatura. */
export const links = {
  booking: 'https://appbarber.com.br/download/prime?cod=4588460',
  subscription: 'https://l.appbarber.com.br/i4y908a5',
  instagram: 'https://www.instagram.com/barbeariaconexaoo/' as string | null,
  terms: '/termos-de-uso/',
  privacy: '/politica-de-privacidade/',
} as const;

/** Perfil exibido nos links (derivado da URL do Instagram). */
export const instagramHandle = links.instagram ? `@${links.instagram.split('/').filter(Boolean).pop()}` : null;

export const whatsapp = {
  number: '551143829358',
  display: '(11) 4382-9358',
};

export function whatsappLink(message?: string, number: string = whatsapp.number) {
  const text = message ?? 'Olá! Vim pelo site da Conexão Barbearia e gostaria de mais informações.';
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export type Unit = {
  id: string;
  index: string;
  name: string;
  shortName: string;
  street: string;
  complement: string;
  district: string | null;
  postalCode: string | null;
  city: string;
  state: string;
  lat: number;
  lng: number;
  placeId: string;
  /** Número de WhatsApp da unidade. */
  whatsapp: string;
  /** true quando a unidade ainda não tem número próprio confirmado e usa o canal central. */
  whatsappIsCentral: boolean;
};

export const units: Unit[] = [
  {
    id: 'mercado-lopes',
    index: '01',
    name: 'Unidade Mercado Lopes',
    shortName: 'Mercado Lopes',
    street: 'Av. Calil Mohamad Rahal, 56',
    complement: 'Loja 6',
    district: 'Vila São Silvestre',
    postalCode: '06417-010',
    city: 'Barueri',
    state: 'SP',
    lat: -23.503746,
    lng: -46.875618,
    placeId: 'ChIJF6ay_Qkaz5QRDD8c9BWCOJs',
    whatsapp: '551143829358',
    whatsappIsCentral: false,
  },
  {
    id: 'inspire-business',
    index: '02',
    name: 'Unidade Inspire Business',
    shortName: 'Inspire Business',
    street: 'Av. Henriqueta Mendes Guerra, 1330',
    complement: 'Loja 02',
    district: null,
    postalCode: null,
    city: 'Barueri',
    state: 'SP',
    lat: -23.511307,
    lng: -46.876487,
    placeId: 'ChIJm5KOY3gDz5QRLNFMytGTJHs',
    // O site anterior apontava para um número de exemplo (5511999999999).
    // Até a unidade informar um número próprio, o botão usa o WhatsApp oficial.
    whatsapp: '551143829358',
    whatsappIsCentral: true,
  },
];

export const mapsLinks = (u: Unit) => ({
  embed: `https://www.google.com/maps?q=${u.lat},${u.lng}&z=17&output=embed`,
  directions: `https://www.google.com/maps/dir/?api=1&destination=${u.lat},${u.lng}`,
  place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.name)}&query_place_id=${u.placeId}`,
  reviews: `https://search.google.com/local/reviews?placeid=${u.placeId}`,
});

export type ImageSet = { name: string; widths: number[]; alt: string; width: number; height: number };

export type Service = {
  id: string;
  index: string;
  name: string;
  price: number;
  description: string;
  details: string;
  image: ImageSet;
};

export const services: Service[] = [
  {
    id: 'corte',
    index: '01',
    name: 'Corte',
    price: 50,
    description: 'Corte com degradê, máquina ou tesoura, finalizado com lavagem.',
    details:
      'Feito na máquina ou só na tesoura, se preferir. Ao final, lavamos para deixar o visual ainda mais limpo e alinhado.',
    image: {
      name: 'corte-cacheado-degrade',
      widths: [480, 800],
      width: 800,
      height: 800,
      alt: 'Corte cacheado com degradê baixo feito na Conexão Barbearia',
    },
  },
  {
    id: 'barboterapia',
    index: '02',
    name: 'Barboterapia',
    price: 55,
    description: 'Toalha quente, esfoliação, desenho com lâmina e massagem facial.',
    details:
      'Uma experiência completa de cuidado: toalha quente e esfoliação para abrir os poros, desenho com lâmina e massageador facial que ativa a circulação.',
    image: {
      name: 'barboterapia-toalha-quente',
      widths: [480, 800],
      width: 800,
      height: 800,
      alt: 'Barbeiro aplicando toalha quente no cliente durante a barboterapia',
    },
  },
  {
    id: 'barba-pitstop',
    index: '03',
    name: 'Barba Pitstop',
    price: 45,
    description: 'Barba com gel shaver e acabamento preciso na lâmina.',
    details:
      'Ideal para quem busca agilidade: gel shaver para desenhar com precisão usando a lâmina, com resultado limpo e rápido.',
    image: {
      name: 'corte-barba-desenhada',
      widths: [480, 800],
      width: 800,
      height: 800,
      alt: 'Cliente com barba desenhada e acabamento na lâmina',
    },
  },
];

export type GalleryItem = ImageSet & { ratio: 'portrait' | 'square' | 'tall'; caption: string };

const g = (name: string, caption: string, alt: string, ratio: GalleryItem['ratio']): GalleryItem => ({
  name,
  caption,
  alt,
  ratio,
  widths: [480, 800],
  width: 800,
  height: 800,
});

export const gallery: GalleryItem[] = [
  g('corte-degrade-risco-topete', 'Degradê com risco', 'Corte degradê com risco lateral e topete texturizado', 'tall'),
  g('corte-cacheado-risco', 'Cacheado com risco', 'Corte infantil cacheado com degradê e risco', 'square'),
  g('corte-texturizado', 'Texturizado', 'Corte texturizado com laterais baixas', 'portrait'),
  g('corte-risco-nuca', 'Desenho na nuca', 'Corte curto com desenho feito na navalha na nuca', 'square'),
  g('corte-infantil-black', 'Infantil', 'Corte infantil com volume no topo e degradê', 'portrait'),
  g('corte-social-curto', 'Social curto', 'Corte social curto com laterais baixas', 'tall'),
  g(
    'corte-degrade-barba-perfil',
    'Degradê e barba',
    'Corte degradê com risco e barba alinhada, vista de perfil',
    'square',
  ),
  g('corte-infantil-risco-perfil', 'Risco lateral', 'Corte infantil com degradê e desenho lateral', 'portrait'),
  g('corte-crespo-curto', 'Crespo curto', 'Corte crespo curto com degradê e acabamento', 'tall'),
  g('corte-infantil-desenho', 'Desenho', 'Corte infantil com desenho na lateral', 'square'),
  g('corte-cacheado-degrade', 'Cacheado com degradê', 'Corte cacheado com degradê baixo', 'portrait'),
  g('corte-infantil-degrade', 'Degradê infantil', 'Corte infantil com degradê e risco', 'square'),
];

export type Barber = {
  id: string;
  name: string;
  experience: string;
  bio: string;
  image: ImageSet;
};

const portrait = (name: string, person: string): ImageSet => ({
  name,
  widths: [512],
  width: 512,
  height: 640,
  alt: `Retrato de ${person}, barbeiro da Conexão Barbearia`,
});

/** Informações da seção "Barbeiros que conectam" do site anterior. */
export const team: Barber[] = [
  {
    id: 'ivan-araujo',
    name: 'Ivan Araujo',
    experience: '10 anos de profissão',
    bio: 'Sempre em busca de conhecimento. Pai do Miguel, do Paulo e do Pedro.',
    image: portrait('barbeiro-ivan-araujo', 'Ivan Araujo'),
  },
  {
    id: 'bruno-lima',
    name: 'Bruno Lima',
    experience: '7 anos de profissão',
    bio: 'Excelente atendimento e profissionalismo. Pai do Noah.',
    image: portrait('barbeiro-bruno-lima', 'Bruno Lima'),
  },
  {
    id: 'isaac-cardoso',
    name: 'Isaac Cardoso',
    experience: '4 anos de profissão',
    bio: 'Carismático e focado. Pai do Davi e da Luna.',
    image: portrait('barbeiro-isaac-cardoso', 'Isaac Cardoso'),
  },
  {
    id: 'carlos-eduardo',
    name: 'Carlos Eduardo',
    experience: '2 anos de profissão',
    bio: 'Veio de outro estado para se destacar na profissão.',
    image: portrait('barbeiro-carlos-eduardo', 'Carlos Eduardo'),
  },
];

/** Depoimentos publicados no site anterior, transcritos das artes originais. */
export const testimonials = [
  {
    name: 'Elisa Matsumoto',
    quote:
      'Primeiro atendimento do meu filho e do meu marido com o Ivan. Ele faz praticamente uma anamnese a respeito do estilo a ser cortado. Dá sugestões, orienta sobre como cuidar e o espaço é muito organizado. Amamos.',
  },
  {
    name: 'Luanda Santos Gomes',
    quote:
      'Super recomendo o trabalho deste estabelecimento, tiveram paciência com a agitação do meu filho de 3 anos (com TEA) e deram o acolhimento necessário. Amamos o resultado!',
  },
  {
    name: 'Celso Alves',
    quote:
      'O Bruno, excelente profissional. Lugar muito limpo, aconchegante. Saí do Centro de Barueri para levar meu filho cortar o cabelo pelas avaliações no Google e recomendo. Está de parabéns. Ganhou mais um cliente.',
  },
  {
    name: 'Jessé Rogério',
    quote:
      'Quero parabenizar pelo belo trabalho, fui muito bem atendido, desde quando iniciei a conversa no WhatsApp até no local e pós-atendimento. Super indico o trabalho, ótimos profissionais!',
  },
  {
    name: 'Juan Riquelme',
    quote:
      'Muito boa, o cuidado com o cliente é muito bom, a limpeza e o ambiente excelentes, e os barbeiros são muito simpáticos.',
  },
  {
    name: 'Felipe Messias',
    quote: 'Ótimo atendimento. Gostei muito do ambiente, sem falar do corte de qualidade!',
  },
];

export type Faq = { question: string; answer: string; link?: { label: string; href: string } };

/** Perguntas e respostas do site anterior (revisão apenas de ortografia). */
export const faqs: Faq[] = [
  {
    question: 'Vocês trabalham apenas com agendamento?',
    answer:
      'Não. Trabalhamos também com encaixe! Claro que o agendamento te dá a certeza de que você vai realizar o serviço no horário escolhido.',
  },
  {
    question: 'Cortam cabelo de crianças?',
    answer:
      'Sim, cortamos de qualquer idade. A única observação: só passamos a navalha se a criança não fizer movimentos que a coloquem em risco.',
  },
  {
    question: 'Cortam cabelo feminino?',
    answer:
      'Sim. Nosso trabalho é voltado para o corte curto, estilo masculino, e não somos especializados em cabelo feminino. Mas temos muitas clientes que confiam em nosso trabalho.',
  },
  {
    question: 'Quais são as formas de pagamento?',
    answer: 'Dinheiro, cartões e Pix.',
  },
  {
    question: 'Vocês possuem aplicativo de agendamento?',
    answer:
      'Sim, trabalhamos com o AppBarber, disponível para iOS e Android. Depois de baixar, basta pesquisar por “Conexão Barbearia”.',
    link: { label: 'Abrir o AppBarber', href: links.booking },
  },
];

export const nav = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'equipe', label: 'Nossa equipe' },
  { id: 'unidades', label: 'Unidades' },
  { id: 'contato', label: 'Contato' },
] as const;

/** Itens extras exibidos apenas no menu mobile e no rodapé. */
export const navExtra = [
  { id: 'galeria', label: 'Galeria' },
  { id: 'depoimentos', label: 'Depoimentos' },
  { id: 'faq', label: 'Perguntas frequentes' },
] as const;

export const formatPrice = (value: number) => `R$ ${value}`;
