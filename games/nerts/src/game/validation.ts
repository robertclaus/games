import { Card, WorkPile, Foundations } from './types';

export function isRed(card: Card): boolean {
  return card.suit === 'H' || card.suit === 'D';
}

// Can `card` be placed on top of a work pile?
export function canPlayOnWorkPile(card: Card, pile: WorkPile): boolean {
  if (pile.length === 0) return true; // empty pile accepts anything
  const top = pile[pile.length - 1];
  return card.value === top.value - 1 && isRed(card) !== isRed(top);
}

// Can `card` be played to any foundation pile?
// Aces always start a new pile; others extend an existing pile of the same suit.
export function canPlayToFoundation(card: Card, foundations: Foundations): boolean {
  if (card.value === 1) return true; // Ace always starts a new pile
  return foundations.some(
    pile => pile.length > 0 && pile[0].suit === card.suit && pile[pile.length - 1].value === card.value - 1
  );
}

// Get valid work pile indices where `card` can be placed
export function validWorkPileTargets(card: Card, workPiles: WorkPile[]): number[] {
  return workPiles
    .map((pile, i) => ({ i, valid: canPlayOnWorkPile(card, pile) }))
    .filter(x => x.valid)
    .map(x => x.i);
}

// For moving a sequence of cards from a work pile: can the bottom card of the sequence go onto target?
export function canMoveSequence(sequence: Card[], targetPile: WorkPile): boolean {
  if (sequence.length === 0) return false;
  return canPlayOnWorkPile(sequence[0], targetPile);
}
