export type Suit = 'shelldon' | 'fintin' | 'stardon' | 'clawson' | 'todd';
export type OtterRule = 'higher' | 'lower' | 'near' | 'far' | 'odd' | 'even' | 'inside' | 'outside' | 'shallow' | 'deep';

export interface TummyCard {
  id: string;
  value: number; // 1–11
  suit: Suit;
}

export interface RuleCard {
  id: string;
  name: string;
  sideA: OtterRule;
  sideB: OtterRule;
  showing: 'A' | 'B';
}

export interface OtterState {
  index: number;
  head: RuleCard;
  tail: RuleCard;
  tummy: TummyCard[]; // array, last element = top
}

export interface PlayerState {
  playerId: string;
  name: string;
  hand: TummyCard[];
  luckyStones: number;
}

export type GamePhase = 'lobby' | 'playing' | 'over';
export type TurnPhase = 'high_tide' | 'low_tide';

export interface FullGameState {
  phase: GamePhase;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  highTideUsed: boolean;
  otters: OtterState[];
  deck: TummyCard[];
  discard: TummyCard[];
  canContinueTurn: boolean;
  activeOtterIndex: number | null;
  mustPlayCount: number; // cards played this turn so far (must play >= 1 before END_TURN)
  winnerId: string | null;
  winThreshold: number;
  log: string[];
}

export interface PublicGameState {
  phase: GamePhase;
  players: Array<{ playerId: string; name: string; handCount: number; luckyStones: number }>;
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  highTideUsed: boolean;
  otters: OtterState[];
  deckCount: number;
  discardCount: number;
  canContinueTurn: boolean;
  activeOtterIndex: number | null;
  mustPlayCount: number;
  winnerId: string | null;
  winThreshold: number;
  log: string[];
}

export interface PrivatePlayerState {
  hand: TummyCard[];
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'HIGH_TIDE_DRAW'; count: 1 | 2 }
  | { type: 'HIGH_TIDE_FLIP'; target: 'head' | 'tail'; otterIndex: number }
  | { type: 'HIGH_TIDE_SWAP'; swapWhat: 'heads' | 'tails'; otterA: number; otterB: number }
  | { type: 'PLAY_CARD'; cardId: string; otterIndex: number }
  | { type: 'END_TURN' };
