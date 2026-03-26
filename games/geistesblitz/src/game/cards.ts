import { ItemType, ItemColor, GameCard } from './types';

export const ALL_ITEMS: ItemType[] = ['ghost', 'chair', 'bottle', 'book', 'mouse'];

export const ORIGINAL_COLORS: Record<ItemType, ItemColor> = {
  ghost: 'white',
  chair: 'red',
  bottle: 'green',
  book: 'blue',
  mouse: 'gray',
};

export const ITEM_EMOJI: Record<ItemType, string> = {
  ghost: '👻',
  chair: '🪑',
  bottle: '🍾',
  book: '📘',
  mouse: '🐭',
};

export const ITEM_DISPLAY_COLOR: Record<ItemColor, string> = {
  white: '#f5f5f5',
  red: '#e53935',
  green: '#43a047',
  blue: '#1e88e5',
  gray: '#78909c',
};

/**
 * Given a card, returns the single correct item to grab.
 *
 * Match case: If either depicted item is shown in its own original color,
 * that item is the answer.
 *
 * No-match case: The answer is the item that is (a) not depicted on the card
 * AND (b) whose original color does not appear anywhere on the card.
 */
export function getCorrectAnswer(card: GameCard): ItemType {
  // Check match case
  if (ORIGINAL_COLORS[card.item1] === card.color1) return card.item1;
  if (ORIGINAL_COLORS[card.item2] === card.color2) return card.item2;

  // No-match case: find item neither depicted nor whose color is shown
  const depictedItems = new Set<ItemType>([card.item1, card.item2]);
  const shownColors = new Set<ItemColor>([card.color1, card.color2]);
  for (const item of ALL_ITEMS) {
    if (!depictedItems.has(item) && !shownColors.has(ORIGINAL_COLORS[item])) {
      return item;
    }
  }
  throw new Error(`Invalid card: no answer found for ${JSON.stringify(card)}`);
}

/**
 * Fisher-Yates shuffle — returns a new shuffled copy of the array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Type-A (match) cards: one per answer item. The item is shown in its own original
// color; the second depicted item is shown in a wrong color. Answer = the matching item.
const TYPE_A_CARDS: Omit<GameCard, 'id'>[] = [
  { item1: 'ghost',  color1: 'white', item2: 'chair',  color2: 'blue'  }, // ghost matches
  { item1: 'chair',  color1: 'red',   item2: 'bottle', color2: 'gray'  }, // chair matches
  { item1: 'bottle', color1: 'green', item2: 'book',   color2: 'white' }, // bottle matches
  { item1: 'book',   color1: 'blue',  item2: 'mouse',  color2: 'red'   }, // book matches
  { item1: 'mouse',  color1: 'gray',  item2: 'ghost',  color2: 'green' }, // mouse matches
];

/**
 * Builds the full 65-card deck:
 *   60 Type-B (no-match) cards — 5 answers × C(4,2)=6 pairs × 2 assignments
 *    5 Type-A (match) cards   — one per item, item shown in its original color
 *
 * Each card is verified via getCorrectAnswer() before being added.
 */
export function buildDeck(): GameCard[] {
  const cards: GameCard[] = [];
  let cardIndex = 0;

  // ── Type-B cards ────────────────────────────────────────────────────────────
  for (const answer of ALL_ITEMS) {
    const others = ALL_ITEMS.filter(item => item !== answer);

    // Generate all pairs from others (C(4,2) = 6)
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        const showA = others[i];
        const showB = others[j];
        const colorProviders = others.filter(item => item !== showA && item !== showB);

        const card1: GameCard = {
          id: `card-${cardIndex++}`,
          item1: showA,
          color1: ORIGINAL_COLORS[colorProviders[0]],
          item2: showB,
          color2: ORIGINAL_COLORS[colorProviders[1]],
        };
        const card2: GameCard = {
          id: `card-${cardIndex++}`,
          item1: showA,
          color1: ORIGINAL_COLORS[colorProviders[1]],
          item2: showB,
          color2: ORIGINAL_COLORS[colorProviders[0]],
        };

        const answer1 = getCorrectAnswer(card1);
        if (answer1 !== answer) throw new Error(`Card verification failed: expected "${answer}", got "${answer1}"`);
        const answer2 = getCorrectAnswer(card2);
        if (answer2 !== answer) throw new Error(`Card verification failed: expected "${answer}", got "${answer2}"`);

        cards.push(card1, card2);
      }
    }
  }

  // ── Type-A cards ────────────────────────────────────────────────────────────
  for (const template of TYPE_A_CARDS) {
    const card: GameCard = { id: `card-${cardIndex++}`, ...template };
    const answer = getCorrectAnswer(card);
    if (answer !== card.item1) throw new Error(`Type-A card verification failed for ${card.item1}`);
    cards.push(card);
  }

  if (cards.length !== 65) {
    throw new Error(`Expected 65 cards, got ${cards.length}`);
  }

  return shuffle(cards);
}
