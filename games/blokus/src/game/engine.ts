import {
  FullGameState,
  PublicGameState,
  PlayerState,
  PlayerColor,
  GameAction,
  Cell,
} from './types';
import { PIECES_BY_ID, ALL_PIECE_IDS, PieceDef } from './pieces';

const BOARD_SIZE = 20;
const MAX_LOG = 30;
const COLORS: PlayerColor[] = ['blue', 'yellow', 'red', 'green'];

export const STARTING_CORNERS: Record<PlayerColor, Cell> = {
  blue:   { r: 0,  c: 0 },
  yellow: { r: 0,  c: 19 },
  red:    { r: 19, c: 19 },
  green:  { r: 19, c: 0 },
};

const COLOR_NAMES: Record<PlayerColor, string> = {
  blue: 'Blue', yellow: 'Yellow', red: 'Red', green: 'Green',
};

function addLog(log: string[], entry: string): string[] {
  const next = [...log, entry];
  return next.length > MAX_LOG ? next.slice(next.length - MAX_LOG) : next;
}

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
): FullGameState {
  const players: PlayerState[] = playerIds.map((pid, i) => ({
    playerId: pid,
    name: playerNames[pid] ?? pid,
    color: COLORS[i % COLORS.length],
    remainingPieceIds: [...ALL_PIECE_IDS],
    score: 0,
    placedAll: false,
    lastPieceWasMono: false,
    skippedCount: 0,
  }));

  return {
    phase: 'playing',
    players,
    board: emptyBoard(),
    currentPlayerIndex: 0,
    log: [`Game started with ${players.length} player${players.length !== 1 ? 's' : ''}.`],
    lastPlacedCells: null,
  };
}

// ── Placement validation ───────────────────────────────────────────────────────

function cellsKey(cells: Cell[]): string {
  return [...cells].sort((a, b) => a.r !== b.r ? a.r - b.r : a.c - b.c)
    .map(c => `${c.r},${c.c}`).join('|');
}

function isValidPieceShape(pieceId: string, cells: Cell[]): boolean {
  const piece = PIECES_BY_ID.get(pieceId);
  if (!piece) return false;
  if (cells.length !== piece.size) return false;

  // Normalize cells and check against orientations
  const minR = Math.min(...cells.map(c => c.r));
  const minC = Math.min(...cells.map(c => c.c));
  const relative = cells.map(c => ({ r: c.r - minR, c: c.c - minC }));
  const key = cellsKey(relative);
  return piece.orientations.some(o => cellsKey(o) === key);
}

export function isValidPlacement(
  state: PublicGameState,
  playerId: string,
  cells: Cell[],
): boolean {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) return false;

  // All cells in bounds
  for (const { r, c } of cells) {
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
  }

  // No overlaps
  for (const { r, c } of cells) {
    if (state.board[r][c] !== null) return false;
  }

  const cellSet = new Set(cells.map(({ r, c }) => `${r},${c}`));
  const hasOwnPiece = state.board.some(row => row.some(cell => cell === playerId));

  if (!hasOwnPiece) {
    // First piece: must cover starting corner
    const corner = STARTING_CORNERS[player.color];
    if (!cellSet.has(`${corner.r},${corner.c}`)) return false;
  } else {
    // Must not touch own pieces on sides
    const SIDES = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const { r, c } of cells) {
      for (const [dr, dc] of SIDES) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          if (state.board[nr][nc] === playerId) return false;
        }
      }
    }

    // Must touch own pieces at corners
    const CORNERS = [[-1,-1],[-1,1],[1,-1],[1,1]];
    let hasCornerTouch = false;
    outer:
    for (const { r, c } of cells) {
      for (const [dr, dc] of CORNERS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          if (state.board[nr][nc] === playerId) { hasCornerTouch = true; break outer; }
        }
      }
    }
    if (!hasCornerTouch) return false;
  }

  return true;
}

// ── Can player move? ───────────────────────────────────────────────────────────

export function canPlayerMove(state: PublicGameState, playerId: string): boolean {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player || player.remainingPieceIds.length === 0) return false;

  for (const pieceId of player.remainingPieceIds) {
    const piece = PIECES_BY_ID.get(pieceId) as PieceDef;
    for (const orientation of piece.orientations) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cells = orientation.map(({ r: dr, c: dc }) => ({ r: r + dr, c: c + dc }));
          if (isValidPlacement(state, playerId, cells)) return true;
        }
      }
    }
  }
  return false;
}

// ── Score computation ──────────────────────────────────────────────────────────

function computeScore(player: PlayerState): number {
  if (player.placedAll) {
    return player.lastPieceWasMono ? 20 : 15;
  }
  const remaining = player.remainingPieceIds.reduce(
    (sum, pid) => sum + (PIECES_BY_ID.get(pid)?.size ?? 0), 0
  );
  return -remaining;
}

// ── Advance turn ───────────────────────────────────────────────────────────────

function advanceTurn(state: FullGameState): FullGameState {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentPlayerIndex + i) % n;
    if (canPlayerMove(state, state.players[idx].playerId)) {
      return { ...state, currentPlayerIndex: idx };
    }
  }
  // Nobody can move → game over
  return computeGameOver(state);
}

function computeGameOver(state: FullGameState): FullGameState {
  const players = state.players.map(p => ({ ...p, score: computeScore(p) }));
  const winner = players.reduce((best, p) => p.score > best.score ? p : best);
  return {
    ...state,
    phase: 'game_over',
    players,
    log: addLog(state.log, `Game over! ${winner.name} wins with ${winner.score} points.`),
  };
}

// ── Apply action ───────────────────────────────────────────────────────────────

export function applyAction(
  state: FullGameState,
  playerId: string,
  action: GameAction,
): FullGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.playerId !== playerId) {
    throw new Error('Not your turn');
  }

  if (action.type === 'PASS') {
    // Allowed; mark this player as having no moves (voluntarily skipping)
    const players = state.players.map(p =>
      p.playerId === playerId ? { ...p, skippedCount: p.skippedCount + 1 } : p
    );
    const newState = { ...state, players };
    const log = addLog(newState.log, `${currentPlayer.name} passed.`);
    return advanceTurn({ ...newState, log });
  }

  if (action.type === 'PLACE_PIECE') {
    const { pieceId, cells } = action;

    // Validate piece belongs to player
    if (!currentPlayer.remainingPieceIds.includes(pieceId)) {
      throw new Error('Piece not available');
    }

    // Validate shape
    if (!isValidPieceShape(pieceId, cells)) {
      throw new Error('Invalid piece shape/orientation');
    }

    // Validate placement rules
    if (!isValidPlacement(state, playerId, cells)) {
      throw new Error('Invalid placement');
    }

    // Place the piece on the board
    const newBoard = state.board.map(row => [...row]);
    for (const { r, c } of cells) {
      newBoard[r][c] = playerId;
    }

    const remainingPieceIds = currentPlayer.remainingPieceIds.filter(id => id !== pieceId);
    const placedAll = remainingPieceIds.length === 0;
    const lastPieceWasMono = placedAll && pieceId === 'I1';

    const piece = PIECES_BY_ID.get(pieceId)!;
    let log = addLog(state.log, `${currentPlayer.name} placed ${piece.name}.${placedAll ? ' All pieces placed! 🎉' : ''}`);

    const newPlayers = state.players.map(p =>
      p.playerId === playerId
        ? { ...p, remainingPieceIds, placedAll, lastPieceWasMono, skippedCount: 0 }
        : p
    );

    const newState: FullGameState = {
      ...state,
      board: newBoard,
      players: newPlayers,
      log,
      lastPlacedCells: cells,
    };

    return advanceTurn(newState);
  }

  return state;
}

export function getPublicState(state: FullGameState): PublicGameState {
  return state;
}
