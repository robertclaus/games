export type Suit = 'H' | 'D' | 'C' | 'S';
export const ALL_SUITS: Suit[] = ['H', 'D', 'C', 'S'];
export const SUIT_SYMBOL: Record<Suit, string> = { H: '♥', D: '♦', C: '♣', S: '♠' };
export const SUIT_COLOR: Record<Suit, string> = { H: 'red', D: 'red', C: 'black', S: 'black' };
export const SUIT_NAME: Record<Suit, string> = { H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' };

export const BACK_COLORS = ['#1a6b3a', '#1a3a6b', '#6b1a1a', '#5a1a6b']; // one per player slot

export interface Card {
  id: string;       // e.g. "H-7-p0" (suit-value-playerIndex)
  suit: Suit;
  value: number;    // 1=Ace, 2-10, 11=J, 12=Q, 13=K
  ownerId: string;  // playerId who owns this card (for scoring)
  backColor: string;
}

// A work pile is an array of cards, index 0 = bottom (oldest), last = top (playable)
export type WorkPile = Card[];

export interface PlayerPrivateState {
  nertsPile: Card[];   // index 0 = bottom, last = top (face-up, playable)
  workPiles: WorkPile[]; // 4 work piles
  hand: Card[];        // face-down stock, index 0 = next to flip
  waste: Card[];       // flipped cards, last = top (playable)
}

// What the host tracks for each player
export interface PlayerRoundInfo {
  playerId: string;
  name: string;
  nertsPileCount: number;   // updated by NERTS_PILE_COUNT messages
  foundationScore: number;  // cards contributed to foundations this round
  backColor: string;
}

// Shared foundation state — one sub-array per Ace played; pile[0] is the Ace, last = top
export type Foundations = Card[][];

export type GamePhase = 'lobby' | 'playing' | 'roundEnd' | 'gameOver';

export interface SharedGameState {
  phase: GamePhase;
  foundations: Foundations;
  players: PlayerRoundInfo[];
  cumulativeScores: Record<string, number>; // playerId -> total score across rounds
  roundNumber: number;
  nertsCallerId: string | null; // who called Nerts this round
  targetScore: number; // default 100
}

// Serializable deal sent to each player
export interface PlayerDeal {
  nertsPile: Card[];
  workPiles: [Card, Card, Card, Card];
  hand: Card[];
}
