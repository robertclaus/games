export type Species =
  | 'BlueSpruce' | 'Cassia' | 'CherryBlossom' | 'Dogwood'
  | 'Jacaranda' | 'Maple' | 'Oak' | 'RoyalPoinciana' | 'Willow' | 'Sycamore';

export const ALL_SPECIES: Species[] = [
  'BlueSpruce', 'Cassia', 'CherryBlossom', 'Dogwood',
  'Jacaranda', 'Maple', 'Oak', 'RoyalPoinciana', 'Willow', 'Sycamore'
];

export const SPECIES_COLORS: Record<Species, string> = {
  BlueSpruce: '#4A90D9',
  Cassia: '#F5C842',
  CherryBlossom: '#F4A7B9',
  Dogwood: '#FFFFFF',
  Jacaranda: '#9B59B6',
  Maple: '#E74C3C',
  Oak: '#8B6914',
  RoyalPoinciana: '#FF6B35',
  Willow: '#27AE60',
  Sycamore: '#95A5A6',
};

export const SPECIES_DISPLAY: Record<Species, string> = {
  BlueSpruce: 'Blue Spruce',
  Cassia: 'Cassia',
  CherryBlossom: 'Cherry Blossom',
  Dogwood: 'Dogwood',
  Jacaranda: 'Jacaranda',
  Maple: 'Maple',
  Oak: 'Oak',
  RoyalPoinciana: 'Royal Poinciana',
  Willow: 'Willow',
  Sycamore: 'Sycamore',
};

export interface Card {
  id: string;
  species: Species;
  value: number; // 1-8
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface PlacedCard {
  card: Card;
  position: GridPosition;
}

export interface ArboretumGrid {
  cells: Map<string, PlacedCard>; // key: "row,col"
}

export type GamePhase = 'lobby' | 'drawing' | 'playing' | 'discarding' | 'scoring' | 'ended';

export interface PlayerState {
  playerId: string;
  name: string;
  arboretum: PlacedCard[]; // serializable form
  discardPile: Card[]; // all cards, top is last element
}

export interface PublicGameState {
  phase: GamePhase;
  players: PlayerState[];
  currentPlayerIndex: number;
  deckCount: number;
  drawCount: number; // cards drawn this turn (0, 1, or 2)
  discardedThisTurn: boolean;
  playedThisTurn: boolean;
  scores?: Record<string, number>; // playerId -> score, only in 'ended' phase
}

export interface PrivatePlayerState {
  hand: Card[];
}

// Full game state (only host holds this)
export interface FullGameState extends PublicGameState {
  deck: Card[];
  hands: Record<string, Card[]>; // playerId -> hand
  hostPlayerId: string;
}

// WebSocket message action types
export type ActionType =
  | 'DRAW_FROM_DECK'
  | 'DRAW_FROM_DISCARD'
  | 'PLAY_CARD'
  | 'DISCARD_CARD'
  | 'START_GAME'
  | 'REQUEST_STATE';

export interface DrawFromDiscardAction {
  type: 'DRAW_FROM_DISCARD';
  targetPlayerId: string;
}

export interface DrawFromDeckAction {
  type: 'DRAW_FROM_DECK';
}

export interface PlayCardAction {
  type: 'PLAY_CARD';
  cardId: string;
  position: GridPosition;
}

export interface DiscardCardAction {
  type: 'DISCARD_CARD';
  cardId: string;
}

export interface StartGameAction {
  type: 'START_GAME';
}

export interface RequestStateAction {
  type: 'REQUEST_STATE';
}

export type GameAction =
  | DrawFromDiscardAction
  | DrawFromDeckAction
  | PlayCardAction
  | DiscardCardAction
  | StartGameAction
  | RequestStateAction;

export interface ScoreBreakdown {
  species: Species;
  path: PlacedCard[];
  basePoints: number;
  sameSpeciesBonus: number;
  startsWithOne: number;
  endsWithEight: number;
  total: number;
}

export interface PlayerScoreResult {
  playerId: string;
  breakdown: ScoreBreakdown[];
  total: number;
}
