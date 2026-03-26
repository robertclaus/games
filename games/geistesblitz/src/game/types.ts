export type ItemType = 'ghost' | 'chair' | 'bottle' | 'book' | 'mouse';
export type ItemColor = 'white' | 'red' | 'green' | 'blue' | 'gray';

export interface GameCard {
  id: string;
  item1: ItemType;
  color1: ItemColor;
  item2: ItemType;
  color2: ItemColor;
}

export interface PlayerState {
  playerId: string;
  name: string;
  score: number;
  guessedThisRound: boolean;
}

export type GamePhase = 'lobby' | 'revealing' | 'result' | 'game_over';

export interface RoundResult {
  winnerId: string | null;     // null if nobody got it right
  correctItem: ItemType;
  wrongGuessers: string[];     // playerIds
}

export interface FullGameState {
  phase: GamePhase;
  players: PlayerState[];
  deck: GameCard[];            // remaining unplayed cards (top = last element)
  cardsPlayed: number;         // total cards played so far
  totalCards: number;          // 60
  currentCard: GameCard | null;
  roundResult: RoundResult | null;
  log: string[];
}

// Public state = full state (no private info in this game)
export type PublicGameState = Omit<FullGameState, 'deck'> & { deckCount: number };

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'GUESS'; item: ItemType }
  | { type: 'ADVANCE' };  // host-only: move from result → next card (or game_over)
