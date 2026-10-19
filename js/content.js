// Textos educativos — linguagem simples, positiva e sem causar medo, culpa ou vergonha.

export const REGIONS = {
  front: {
    label: 'Dentes da frente',
    short: 'Frente',
    icon: '😁',
    info: 'Aqui ficam os incisivos e os caninos. Eles ajudam a morder e a sorrir! O biofilme gosta de ficar pertinho da gengiva.',
  },
  left: {
    label: 'Lado esquerdo',
    short: 'Esquerdo',
    icon: '⬅️',
    info: 'Estes são os molares de leite. Eles trabalham muito para mastigar! Têm cantinhos onde o biofilme adora se esconder.',
  },
  right: {
    label: 'Lado direito',
    short: 'Direito',
    icon: '➡️',
    info: 'Do outro lado também tem molares de leite! Escove com calma, por fora e por cima, para deixar tudo limpinho.',
  },
};

export const EXPLORE_TIPS = [
  'Olha só! Essa camadinha amarelada é o biofilme dentário: um grupo de bactérias que gruda nos dentes.',
  'O biofilme gosta de se esconder em todos os cantinhos: na frente, nos lados e em cima dos dentes.',
  'Arraste a boca com o dedo para girar e descobrir onde o biofilme está escondido!',
  'Por isso escovamos todas as superfícies dos dentes: assim não sobra nenhum cantinho para o biofilme.',
  'Escovar todos os dias ajuda a manter os dentes e a gengiva saudáveis.',
  'Escovar acompanhado de um adulto é ainda melhor. Peça ajuda sempre que precisar!',
];

export const MISSION_TIPS = [
  'O biofilme é uma camadinha amarelada que gruda nos dentes. A escova ajuda a tirá-lo!',
  'Passe a escova com carinho, em movimentos pequenininhos, por todos os lados do dente.',
  'Escove todas as superfícies: por fora, por dentro e em cima dos dentes.',
  'Use as setinhas para girar a boca e alcançar os cantinhos escondidos.',
  'Escovar todos os dias ajuda a manter os dentes e a gengiva saudáveis.',
  'Um adulto pode ajudar e acompanhar a escovação. Trabalho em equipe é mais divertido!',
];

export const FEEDBACK = {
  start: 'Vamos lá, Guardião! Esfregue a escova nos cantinhos amarelinhos.',
  keepGoing: 'Continue assim!',
  nice: 'Muito bem!',
  almost: 'Você está quase lá!',
  idle: 'Continue assim! Arraste a escova sobre o biofilme.',
  regionDone: (r) => `Muito bem! ${r} limpinho!`,
};

export const SURFACE_NOTE =
  'Cada dente tem vários lados. Gire a boca com as setinhas para limpar todos eles!';
