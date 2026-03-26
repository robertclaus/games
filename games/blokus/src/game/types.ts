export type PlayerColor = 'blue' | 'yellow' | 'red' | 'green';

export interface Cell {
  r: number;
  c: number;
}

export interface PlayerState {
  playerId: string;
  name: string;
  color: PlayerColor;
  remainingPieceIds: string[];
  score: number;           // computed at game_over: negative squares or +15/+20 bonus
  placedAll: boolean;
  lastPieceWasMono: boolean;
  skippedCount: number;    // consecutive skips (no valid moves)
}

export type GamePhase = 'playing' | 'game_over';

export interface FullGameState {
  phase: GamePhase;
  players: PlayerState[];
  board: (string | null)[][];   // [row][col] = playerId or null (20x20)
  currentPlayerIndex: number;
  log: string[];
  lastPlacedCells: Cell[] | null;  // Cells of the most recently placed piece, for highlighting
}

// No hidden information in Blokus
export type PublicGameState = FullGameState;

export type GameAction =
  | { type: 'PLACE_PIECE'; pieceId: string; cells: Cell[] }
  | { type: 'PASS' };
