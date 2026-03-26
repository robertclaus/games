import { Card, Suit, ALL_SUITS, PlayerDeal, BACK_COLORS } from './types';

export function createDeck(ownerId: string, playerIndex: number): Card[] {
  const backColor = BACK_COLORS[playerIndex % BACK_COLORS.length];
  const cards: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (let value = 1; value <= 13; value++) {
      cards.push({ id: `${suit}-${value}-${ownerId}`, suit, value, ownerId, backColor });
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealPlayer(ownerId: string, playerIndex: number): PlayerDeal {
  const deck = shuffle(createDeck(ownerId, playerIndex));
  return {
    nertsPile: deck.slice(0, 13),   // 13 cards, last = top face-up
    workPiles: [deck[13], deck[14], deck[15], deck[16]] as [Card, Card, Card, Card],
    hand: deck.slice(17),            // 35 cards
  };
}
