
export interface Ad {
  id: string;
  company: string;
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  ctaText: string;
  ctaUrl: string;
}

export const ads: Ad[] = [
  {
    id: 'ad-1',
    company: 'CodeGenius',
    title: 'Desenvolvimento Web de Alta Performance',
    description: 'Crie aplicações web rápidas, escaláveis e modernas com as melhores tecnologias do mercado. Comece seu projeto hoje!',
    imageUrl: 'https://picsum.photos/600/337',
    imageHint: 'web development',
    ctaText: 'Saiba Mais',
    ctaUrl: '#',
  },
  {
    id: 'ad-2',
    company: 'Aroma & Grão',
    title: 'Seu Café Perfeito, Entregue em Casa',
    description: 'Assine nosso clube de cafés especiais e receba grãos selecionados de todo o mundo na sua porta.',
    imageUrl: 'https://picsum.photos/600/338',
    imageHint: 'coffee beans',
    ctaText: 'Assine Agora',
    ctaUrl: '#',
  },
  {
    id: 'ad-3',
    company: 'Nomad Bags',
    title: 'Viaje com Conforto e Estilo',
    description: 'Descubra nossa nova linha de malas de viagem inteligentes. Duráveis, seguras e com design inovador.',
    imageUrl: 'https://picsum.photos/600/339',
    imageHint: 'travel luggage',
    ctaText: 'Ver Coleção',
    ctaUrl: '#',
  },
   {
    id: 'ad-4',
    company: 'FitLife',
    title: 'Transforme seu Corpo e Mente',
    description: 'Acesse treinos personalizados, planos de nutrição e meditações guiadas com nosso aplicativo de bem-estar.',
    imageUrl: 'https://picsum.photos/600/340',
    imageHint: 'fitness app',
    ctaText: 'Começar Agora',
    ctaUrl: '#',
  },
];
