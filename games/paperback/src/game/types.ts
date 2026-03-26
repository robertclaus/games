export type CardType = 'letter' | 'two_letter' | 'wild' | 'common';

export interface CardAbility {
  type: 'draw' | 'score' | 'trash' | 'gain_wild';
  value: number; // for draw/score: amount; for trash/gain_wild: 1
}

export interface CardInstance {
  id: string;
  letters: string[];     // 1 or 2 uppercase letters, empty for wilds
  score: number;
  cost: number;
  ability: CardAbility | null;
  abilityText: string | null;
  cardType: CardType;
  famePoints: number;    // 0 for letter cards, 1-4 for fame cards
}

export type GamePhase = 'playing' | 'game_over';
export type TurnPhase = 'spelling' | 'validating' | 'trashing' | 'buying';

export interface TurnState {
  phase: TurnPhase;
  currentPlayerId: string;
  currentPlayerIndex: number;
  playedWord: string | null;
  wordScore: number;
  budgetRemaining: number;
  trashRemaining: number;
  extraDrawsNext: number;
  gainedCommon: boolean;
  message: string | null;
}

export interface PrivatePlayerState {
  playerId: string;
  name: string;
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  pendingExtraDraws: number;
}

export interface PublicPlayerState {
  playerId: string;
  name: string;
  handCount: number;
  deckCount: number;     // draw + discard
  famePoints: number;    // running total of fame pts in all cards
  commonCardsGained: number;
}

export interface OfferPileHidden {
  id: string;
  cards: CardInstance[];  // index 0 = top
}

export interface PublicOfferPile {
  id: string;
  visible: CardInstance[];   // top 2
  remaining: number;
}

export interface FamePile {
  rank: number;
  cost: number;
  famePoints: number;
  count: number;
}

export interface FullGameState {
  phase: GamePhase;
  players: PrivatePlayerState[];
  offerPiles: OfferPileHidden[];
  famePiles: FamePile[];
  commonPile: CardInstance[];
  commonLengthRequired: number;
  turnState: TurnState | null;
  turnPlayedCardIds: string[];  // cards played this turn (cleared on END_TURN)
  log: string[];
  gameEndPending: boolean;
}

export interface PublicGameState {
  phase: GamePhase;
  players: PublicPlayerState[];
  offerPiles: PublicOfferPile[];
  famePiles: FamePile[];
  commonPile: { topCard: CardInstance | null; remaining: number; lengthRequired: number };
  turnState: TurnState | null;
  log: string[];
}

export interface PrivateHandMessage {
  hand: CardInstance[];
  pendingExtraDraws: number;
}

export type GameAction =
  | { type: 'SUBMIT_WORD'; word: string; cardIds: string[]; useCommonCard: boolean; commonCardLetter?: string }
  | { type: 'TRASH_CARD'; cardId: string }
  | { type: 'BUY_CARD'; pileId: string; cardId: string }
  | { type: 'BUY_FAME'; rank: number }
  | { type: 'END_TURN' };
