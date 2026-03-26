// ── Core domain types ──────────────────────────────────────────────────────────

export type EntryType = 'word' | 'drawing';

export interface BookletEntry {
  type: EntryType;
  content: string;      // plain text for 'word'; JPEG dataURL for 'drawing'
  authorId: string;
  authorName: string;
}

export interface Booklet {
  ownerPlayerId: string;
  ownerName: string;
  entries: BookletEntry[];
}

export interface PlayerInfo {
  playerId: string;
  name: string;
}

// Phases map to round types:
//   round 0 → 'writing'
//   round 1, 3, 5, … → 'drawing'
//   round 2, 4, 6, … → 'guessing'
//   after all rounds → 'results'
export type GamePhase = 'writing' | 'drawing' | 'guessing' | 'results';

// ── Full state (host only) ─────────────────────────────────────────────────────

export interface FullGameState {
  phase: GamePhase;
  players: PlayerInfo[];
  round: number;          // 0-indexed
  totalRounds: number;    // equals player count
  booklets: Booklet[];    // one per player, same order as players[]
  submittedIds: string[]; // playerIds who have submitted this round
}

// ── Public state (broadcast to all) ───────────────────────────────────────────

export interface PublicGameState {
  phase: GamePhase;
  players: PlayerInfo[];
  round: number;
  totalRounds: number;
  submittedCount: number;
  // null during active play (entries are private until results)
  booklets: Booklet[] | null;
}

// ── Private prompt sent to each player at the start of each round ─────────────

export interface BookletPrompt {
  round: number;
  // The previous entry in the booklet they're currently holding.
  // null for round 0 (no previous entry; player writes from scratch).
  previousEntry: BookletEntry | null;
  bookletOwnerName: string;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'SUBMIT_ENTRY'; content: string; entryType: EntryType }
  | { type: 'FORCE_ADVANCE' };  // host only: skip players who haven't submitted
