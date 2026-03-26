import { CardInstance, CardAbility, FamePile, OfferPileHidden } from './types';

let _idCounter = 0;

export function resetIdCounter(): void { _idCounter = 0; }

function nextId(): string { return `c${++_idCounter}`; }

function makeCard(
  letters: string[],
  score: number,
  cost: number,
  ability: CardAbility | null,
  abilityText: string | null,
  cardType: 'letter' | 'two_letter' | 'wild' | 'common',
  famePoints = 0
): CardInstance {
  return { id: nextId(), letters, score, cost, ability, abilityText, cardType, famePoints };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Create a 2¢ wild card (used for gain_wild ability or starting deck)
export function createWild2c(): CardInstance {
  return makeCard([], 0, 2, null, null, 'wild', 0);
}

// Create a fame card instance (called when a player buys a fame card)
export function makeFameCard(rank: number, cost: number, famePoints: number): CardInstance {
  return {
    id: nextId(),
    letters: [],
    score: 0,
    cost,
    ability: null,
    abilityText: null,
    cardType: 'wild',
    famePoints,
  };
}

// Starting deck for one player (T, R, S, I, N + 5 wilds), shuffle and deal 5
export function buildStartingDeck(): { hand: CardInstance[]; drawPile: CardInstance[] } {
  const cards = shuffle([
    makeCard(['T'], 1, 1, null, null, 'letter'),
    makeCard(['R'], 1, 1, null, null, 'letter'),
    makeCard(['S'], 1, 1, null, null, 'letter'),
    makeCard(['I'], 1, 1, null, null, 'letter'),
    makeCard(['N'], 1, 1, null, null, 'letter'),
    createWild2c(), createWild2c(), createWild2c(), createWild2c(), createWild2c(),
  ]);
  return { hand: cards.slice(0, 5), drawPile: cards.slice(5) };
}

// The Offer - 7 piles
export function buildOfferPiles(): OfferPileHidden[] {
  const d1: CardAbility = { type: 'draw', value: 1 };
  const d2: CardAbility = { type: 'draw', value: 2 };
  const d3: CardAbility = { type: 'draw', value: 3 };
  const s1: CardAbility = { type: 'score', value: 1 };
  const s2: CardAbility = { type: 'score', value: 2 };
  const trash: CardAbility = { type: 'trash', value: 1 };
  const gw: CardAbility = { type: 'gain_wild', value: 1 };

  function L(letter: string, sc: number, cost: number, ab?: CardAbility, abt?: string): CardInstance {
    return makeCard([letter], sc, cost, ab ?? null, abt ?? null, 'letter');
  }
  function TL(l1: string, l2: string, sc: number, cost: number, ab?: CardAbility, abt?: string): CardInstance {
    return makeCard([l1, l2], sc, cost, ab ?? null, abt ?? null, 'two_letter');
  }

  return [
    {
      id: 'p0',
      cards: shuffle([
        L('B', 3, 5), L('B', 3, 5), L('B', 3, 5),
        L('D', 2, 5), L('D', 2, 5), L('D', 2, 5),
        L('F', 3, 5), L('F', 3, 5),
        L('G', 2, 5), L('G', 2, 5),
        L('P', 3, 5), L('P', 3, 5),
      ]),
    },
    {
      id: 'p1',
      cards: shuffle([
        L('C', 3, 5, d1, '+1 card next hand'), L('C', 3, 5, d1, '+1 card next hand'), L('C', 3, 5, d1, '+1 card next hand'),
        L('H', 2, 5, d1, '+1 card next hand'), L('H', 2, 5, d1, '+1 card next hand'), L('H', 2, 5, d1, '+1 card next hand'),
        L('L', 2, 5, d1, '+1 card next hand'), L('L', 2, 5, d1, '+1 card next hand'), L('L', 2, 5, d1, '+1 card next hand'),
        L('M', 2, 5, d1, '+1 card next hand'), L('M', 2, 5, d1, '+1 card next hand'), L('M', 2, 5, d1, '+1 card next hand'),
      ]),
    },
    {
      id: 'p2',
      cards: shuffle([
        L('K', 3, 6, d1, '+1 card next hand'), L('K', 3, 6, d1, '+1 card next hand'), L('K', 3, 6, d1, '+1 card next hand'),
        L('W', 2, 6, d2, '+2 cards next hand'), L('W', 2, 6, d2, '+2 cards next hand'), L('W', 2, 6, d2, '+2 cards next hand'),
        L('Y', 3, 6, d2, '+2 cards next hand'), L('Y', 3, 6, d2, '+2 cards next hand'), L('Y', 3, 6, d2, '+2 cards next hand'),
      ]),
    },
    {
      id: 'p3',
      cards: shuffle([
        L('J', 4, 7), L('J', 4, 7),
        L('Q', 4, 7, trash, 'Trash a card from hand'), L('Q', 4, 7, trash, 'Trash a card from hand'),
        L('V', 4, 7, d3, '+3 cards next hand'), L('V', 4, 7, d3, '+3 cards next hand'),
        L('X', 4, 8, d2, '+2 cards next hand'), L('X', 4, 8, d2, '+2 cards next hand'),
        L('Z', 5, 8, s2, '+2 to word score'), L('Z', 5, 8, s2, '+2 to word score'),
      ]),
    },
    {
      id: 'p4',
      cards: shuffle([
        TL('E', 'R', 3, 5, d1, '+1 card next hand'), TL('E', 'R', 3, 5, d1, '+1 card next hand'), TL('E', 'R', 3, 5, d1, '+1 card next hand'),
        TL('T', 'H', 3, 5), TL('T', 'H', 3, 5), TL('T', 'H', 3, 5),
        TL('I', 'N', 2, 5, d2, '+2 cards next hand'), TL('I', 'N', 2, 5, d2, '+2 cards next hand'), TL('I', 'N', 2, 5, d2, '+2 cards next hand'),
      ]),
    },
    {
      id: 'p5',
      cards: shuffle([
        TL('R', 'E', 2, 6, d2, '+2 cards next hand'), TL('R', 'E', 2, 6, d2, '+2 cards next hand'), TL('R', 'E', 2, 6, d2, '+2 cards next hand'),
        TL('H', 'E', 3, 6, d1, '+1 card next hand'), TL('H', 'E', 3, 6, d1, '+1 card next hand'), TL('H', 'E', 3, 6, d1, '+1 card next hand'),
        TL('S', 'T', 3, 6), TL('S', 'T', 3, 6), TL('S', 'T', 3, 6),
      ]),
    },
    {
      id: 'p6',
      cards: shuffle([
        TL('C', 'H', 4, 8, d2, '+2 cards next hand'), TL('C', 'H', 4, 8, d2, '+2 cards next hand'),
        TL('N', 'G', 3, 8, d3, '+3 cards next hand'), TL('N', 'G', 3, 8, d3, '+3 cards next hand'),
        TL('S', 'H', 4, 8, gw, 'Gain a free Wild'), TL('S', 'H', 4, 8, gw, 'Gain a free Wild'),
        TL('L', 'Y', 3, 9, s1, '+1 to word score'), TL('L', 'Y', 3, 9, s1, '+1 to word score'),
      ]),
    },
  ];
}

// Fame piles
export function buildFamePiles(playerCount: number): FamePile[] {
  const counts = playerCount <= 2 ? [4, 4, 2, 1]
    : playerCount === 3 ? [5, 5, 3, 1]
    : [8, 8, 4, 2];
  return [
    { rank: 1, cost: 5,  famePoints: 1, count: counts[0] },
    { rank: 2, cost: 8,  famePoints: 2, count: counts[1] },
    { rank: 3, cost: 11, famePoints: 3, count: counts[2] },
    { rank: 4, cost: 17, famePoints: 4, count: counts[3] },
  ];
}

// Common pile (6 cards, shuffled)
export function buildCommonPile(): CardInstance[] {
  return shuffle([
    makeCard(['*'], 1, 0, { type: 'draw', value: 2 },  '+2 cards next hand', 'common'),
    makeCard(['*'], 1, 0, { type: 'score', value: 2 }, '+2 to word score',   'common'),
    makeCard(['*'], 1, 0, { type: 'gain_wild', value: 1 }, 'Gain a free Wild', 'common'),
    makeCard(['*'], 1, 0, { type: 'draw', value: 3 },  '+3 cards next hand', 'common'),
    makeCard(['*'], 1, 0, { type: 'score', value: 3 }, '+3 to word score',   'common'),
    makeCard(['*'], 2, 0, { type: 'draw', value: 4 },  '+4 cards next hand', 'common'),
  ]);
}
