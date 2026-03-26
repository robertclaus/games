import { Card, ALL_SPECIES } from './types';

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const species of ALL_SPECIES) {
    for (let value = 1; value <= 8; value++) {
      cards.push({
        id: `${species}-${value}`,
        species,
        value,
      });
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
