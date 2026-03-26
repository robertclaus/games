import { Suit, TummyCard, RuleCard, OtterRule } from './types';

export const SUITS: Suit[] = ['shelldon', 'fintin', 'stardon', 'clawson', 'todd'];

export const SUIT_ICONS: Record<Suit, string> = {
  shelldon: '🦦',
  fintin: '🐠',
  stardon: '⭐',
  clawson: '🦀',
  todd: '🐸',
};

export const RULE_ICONS: Record<OtterRule, string> = {
  higher: '↑',
  lower: '↓',
  near: '↔',
  far: '↔↔',
  odd: '⚡',
  even: '◎',
  inside: '⊂',
  outside: '⊃',
  shallow: '〰',
  deep: '🌊',
};

// Head cards: 5 otter characters, each with sideA and sideB rules
export const HEAD_CARDS: Omit<RuleCard, 'showing'>[] = [
  { id: 'head-shelldon', name: 'Shelldon', sideA: 'higher', sideB: 'lower' },
  { id: 'head-fintin',   name: 'Fintin',   sideA: 'near',   sideB: 'far' },
  { id: 'head-stardon',  name: 'Stardon',  sideA: 'odd',    sideB: 'even' },
  { id: 'head-clawson',  name: 'Clawson',  sideA: 'inside', sideB: 'outside' },
  { id: 'head-todd',     name: 'Todd',     sideA: 'shallow', sideB: 'deep' },
];

// Tail cards: 3 tails, each double-sided
export const TAIL_CARDS: Omit<RuleCard, 'showing'>[] = [
  { id: 'tail-a', name: 'Tail A', sideA: 'higher', sideB: 'lower' },
  { id: 'tail-b', name: 'Tail B', sideA: 'near',   sideB: 'far' },
  { id: 'tail-c', name: 'Tail C', sideA: 'odd',    sideB: 'even' },
];

/**
 * Builds the full deck of 55 tummy cards (values 1–11, 5 suits).
 */
export function buildDeck(): TummyCard[] {
  const cards: TummyCard[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 11; value++) {
      cards.push({
        id: `${suit}-${value}`,
        value,
        suit,
      });
    }
  }
  return cards;
}

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
