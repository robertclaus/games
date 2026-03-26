import { Card, NumberCard, ActionCard, ActionType, CodeCard } from './types';

export function createDeck(): Card[] {
  const cards: Card[] = [];

  // 40 number cards (0–9, ×4)
  for (let v = 0; v <= 9; v++) {
    for (let i = 0; i < 4; i++) {
      cards.push({ id: `num-${v}-${i}`, kind: 'number', value: v } as NumberCard);
    }
  }

  // Action cards: total 18
  const actions: [ActionType, number][] = [
    ['SneakPeak', 3],
    ['Ambush', 3],
    ['FastFrenzy', 2],
    ['EspieNAH', 4],
    ['Snatched', 3],
    ['MasterOfForgery', 3],
  ];

  for (const [action, count] of actions) {
    for (let i = 0; i < count; i++) {
      cards.push({ id: `act-${action}-${i}`, kind: 'action', action } as ActionCard);
    }
  }

  return cards;
}

const CODE_LIST: [number, number, number][] = [
  [2, 3, 5], [3, 0, 4], [1, 7, 2], [8, 5, 1], [0, 6, 9],
  [4, 2, 7], [6, 1, 3], [9, 4, 0], [3, 8, 2], [5, 0, 6],
  [7, 3, 9], [1, 4, 8], [2, 9, 5], [6, 7, 1], [0, 3, 4],
  [8, 2, 6], [4, 5, 0], [9, 1, 7], [5, 6, 3], [7, 0, 8],
];

export function dealCodes(playerCount: number): CodeCard[] {
  const shuffled = [...CODE_LIST].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, playerCount).map(digits => ({ digits }));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
