// Textos e imagens do site. Nada aqui é inventado: frases entre aspas são da
// própria Geri Barbearia (legendas do Instagram) e os fatos vêm dos posts.
import type { ImageKey } from '../components/Picture';

export interface Service {
  id: string;
  name: string;
  description: string;
  image?: ImageKey;
  /** Mensagem pronta para perguntar o valor no WhatsApp. */
  ask: string;
}

export const services: Service[] = [
  {
    id: 'corte',
    name: 'Corte masculino',
    description:
      'Na máquina ou na tesoura, do clássico ao atual. O cabelo é a moldura do rosto: o corte acompanha o seu.',
    image: 'degrade-em-v-desenho-1',
    ask: 'Olá, Geri! Vim pelo site e queria saber o valor do corte masculino.',
  },
  {
    id: 'degrade',
    name: 'Degradê',
    description: 'Transição limpa do curto ao comprido, com acabamento na navalha. Também no formato em V.',
    image: 'degrade-em-v',
    ask: 'Olá, Geri! Vim pelo site e queria saber o valor do degradê.',
  },
  {
    id: 'freestyle',
    name: 'Desenho freestyle',
    description: 'Riscos e desenhos à mão livre sobre o degradê, para quem quer sair da cadeira diferente.',
    image: 'desenho-raio',
    ask: 'Olá, Geri! Vim pelo site e queria saber o valor do desenho freestyle.',
  },
  {
    id: 'barba',
    name: 'Barba',
    description: 'Barba aparada e alinhada para fechar o visual junto com o corte.',
    ask: 'Olá, Geri! Vim pelo site e queria saber o valor da barba.',
  },
  {
    id: 'infantil',
    name: 'Corte infantil',
    description: 'Corte que não é choro, é diversão garantida. Seu filho no melhor estilo.',
    image: 'corte-infantil',
    ask: 'Olá, Geri! Vim pelo site e queria saber o valor do corte infantil.',
  },
];

export interface Milestone {
  date: string;
  dateTime: string;
  title: string;
  text: string;
}

/** Linha do tempo real, tirada dos posts. */
export const milestones: Milestone[] = [
  {
    date: '13 set 2024',
    dateTime: '2024-09-13',
    title: 'Portas abertas',
    text: 'A Geri começa a atender no centro de Benedito Novo.',
  },
  {
    date: 'Abr 2025',
    dateTime: '2025-04',
    title: 'Corte na tesoura',
    text: 'Mais um certificado na parede, agora em corte na tesoura.',
  },
  {
    date: '13 set 2025',
    dateTime: '2025-09-13',
    title: 'Um ano de casa',
    text: 'Comemorado com sorteio de brindes, chopp gelado e pastel para os clientes.',
  },
  {
    date: 'Set 2026',
    dateTime: '2026-09',
    title: 'Novo endereço',
    text: 'Novas histórias, uma nova jornada que começa.',
  },
];

export interface Work {
  image: ImageKey;
  title: string;
  alt: string;
}

/** Galeria: só trabalhos publicados pela casa. */
export const works: Work[] = [
  {
    image: 'freestyle-ring-light',
    title: 'Desenho freestyle sobre degradê',
    alt: 'Perfil de um cliente com degradê e desenho freestyle na lateral, iluminado por um ring light',
  },
  {
    image: 'degrade-em-v-desenho-1',
    title: 'Degradê em V',
    alt: 'Nuca de um cliente com degradê baixo em V, vista de costas na cadeira',
  },
  {
    image: 'freestyle-navalha',
    title: 'Degradê freestyle na navalha',
    alt: 'Mão do barbeiro segurando a cabeça do cliente para mostrar o desenho feito na navalha',
  },
  {
    image: 'desenho-raio',
    title: 'Desenho em raio',
    alt: 'Lateral de um corte curto com desenho em forma de raio sobre o degradê',
  },
  {
    image: 'degrade-em-v',
    title: 'Degradê, a moldura do rosto',
    alt: 'Cliente de costas com degradê alto e acabamento marcado na nuca',
  },
  {
    image: 'corte-infantil',
    title: 'Corte infantil',
    alt: 'Menino com capa de super-herói na cadeira, mostrando o corte com risco na lateral',
  },
  {
    image: 'degrade-em-v-desenho-2',
    title: 'Degradê em V com desenho',
    alt: 'Cliente de costas com degradê em V e um risco fino acima da orelha',
  },
];

export interface Pillar {
  title: string;
  text: string;
}

/** O que a casa entrega, nas palavras dela. */
export const pillars: Pillar[] = [
  {
    title: 'Ordem de chegada',
    text: 'Sem agenda e sem aplicativo. Chegou, aguarda a vez e senta na cadeira.',
  },
  {
    title: 'Da tesoura ao freestyle',
    text: 'A base clássica da tesoura e da navalha com os degradês e desenhos de agora.',
  },
  {
    title: 'Do pai ao filho',
    text: 'Corte infantil sem choro e com diversão garantida, na mesma cadeira do pai.',
  },
];
