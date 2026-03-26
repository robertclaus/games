export type SpyCharacter = 'Denis' | 'Barry' | 'Count' | 'Miki' | 'Mobel' | 'Libby';

export const SPY_CHARACTERS: SpyCharacter[] = ['Denis', 'Barry', 'Count', 'Miki', 'Mobel', 'Libby'];

export const SPY_EMOJI: Record<SpyCharacter, string> = {
  Denis: '🕵️',
  Barry: '🦊',
  Count: '🧛',
  Miki: '🐱',
  Mobel: '🤖',
  Libby: '🎭',
};

export type ActionType =
  | 'SneakPeak'
  | 'Ambush'
  | 'FastFrenzy'
  | 'EspieNAH'
  | 'Snatched'
  | 'MasterOfForgery';

export interface NumberCard {
  id: string;
  kind: 'number';
  value: number; // 0–9
}

export interface ActionCard {
  id: string;
  kind: 'action';
  action: ActionType;
}

export type Card = NumberCard | ActionCard;

export interface CodeCard {
  digits: [number, number, number];
}

// What's in a vault slot: null (empty), a number card, or a Master of Forgery
export type VaultSlot = Card | null;

export interface PlayerPublicState {
  playerId: string;
  name: string;
  character: SpyCharacter;
  vault: [boolean, boolean, boolean]; // true = filled (value hidden from others)
  handCount: number;
}

export type TurnPhase =
  | 'draw'
  | 'play'
  | 'fastFrenzy2'
  | 'pendingAction'
  | 'sneakPeakChoose';

export interface PendingAction {
  playerId: string;        // who played the action
  action: ActionType;
  payload: unknown;        // action-specific data (e.g. targetPlayerId, digit)
  countdown: number;       // seconds remaining for Espie-NAH! response
  affectedPlayerIds: string[]; // who can counter
}

export interface PublicGameState {
  phase: 'lobby' | 'playing' | 'ended';
  players: PlayerPublicState[];
  currentPlayerIndex: number;
  box: (Card | null)[];   // 3 slots, visible to all
  deckCount: number;
  discardTop: Card | null;
  turnPhase: TurnPhase;
  pendingAction: PendingAction | null;
  winnerId: string | null;
  lastEvent: string | null;
}

export interface PrivatePlayerState {
  hand: Card[];
  code: CodeCard;
  vault: VaultSlot[]; // full vault with actual cards (for owner only)
}

// Host-only full state
export interface FullGameState extends PublicGameState {
  deck: Card[];
  discard: Card[];
  hands: Record<string, Card[]>;
  codes: Record<string, CodeCard>;
  vaults: Record<string, VaultSlot[]>; // actual cards in vault
}

// Game actions sent from players to host
export type GameAction =
  | { type: 'SELECT_CHARACTER'; character: SpyCharacter }
  | { type: 'START_GAME' }
  | { type: 'DRAW_FROM_PILE' }
  | { type: 'DRAW_FROM_BOX'; boxIndex: number }
  | { type: 'PLAY_NUMBER'; cardId: string; vaultSlot: number }
  | { type: 'PLAY_ACTION'; cardId: string; targetPlayerId?: string; targetDigit?: number }
  | { type: 'SWAP_WITH_BOX'; handCardId: string; boxIndex: number }
  | { type: 'DISCARD_CARD'; cardId: string }
  | { type: 'COUNTER_ACTION' }
  | { type: 'SNEAK_PEAK_CHOOSE'; keepCardId: string; returnOrder: string[] }
  | { type: 'REQUEST_STATE' };
