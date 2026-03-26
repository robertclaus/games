// ── Word Library ───────────────────────────────────────────────────────────────

export type WordCategory = 'noun' | 'verb' | 'adjective' | 'connector';

export interface LibraryWord {
  id: string;
  word: string;
  category: WordCategory;
}

// ── Teams ──────────────────────────────────────────────────────────────────────

export type TeamId = 'red' | 'blue';

// ── Players ────────────────────────────────────────────────────────────────────

export interface PlayerInfo {
  playerId: string;
  name: string;
  team: TeamId;
}

// ── Team State ─────────────────────────────────────────────────────────────────

export interface TeamState {
  id: TeamId;
  score: number;
  playerIds: string[];       // ordered list; storyteller rotates through this
  storytellerIndex: number;  // index into playerIds for current round's storyteller
  arrangement: string[];     // ordered list of LibraryWord IDs placed by storyteller
}

// ── Guesses ────────────────────────────────────────────────────────────────────

export interface Guess {
  playerId: string;
  playerName: string;
  team: TeamId;
  guess: string;
  correct: boolean;
}

// ── Round Result ───────────────────────────────────────────────────────────────

export interface RoundResult {
  winnerTeam: TeamId | null;  // null = timer ran out, no one scored
  answer: string;             // revealed to all when round ends
}

// ── Game Phases ────────────────────────────────────────────────────────────────

export type GamePhase = 'round_active' | 'round_result' | 'game_over';

// ── Full Game State (host only) ────────────────────────────────────────────────

export interface FullGameState {
  phase: GamePhase;
  players: PlayerInfo[];
  teams: { red: TeamState; blue: TeamState };
  round: number;           // 1-based
  totalRounds: number;
  currentAnswer: string;   // secret — omitted from PublicGameState
  usedAnswers: string[];   // answers already used — omitted from PublicGameState
  roundStartTime: number;  // Date.now() when this round started
  roundDuration: number;   // ms per round (default 120_000)
  guesses: Guess[];
  roundResult: RoundResult | null;
  log: string[];
}

// ── Public Game State (broadcast to all) ──────────────────────────────────────

export interface PublicGameState {
  phase: GamePhase;
  players: PlayerInfo[];
  teams: { red: TeamState; blue: TeamState };
  round: number;
  totalRounds: number;
  // currentAnswer intentionally omitted — only storytellers know it via ROUND_ANSWER
  roundStartTime: number;
  roundDuration: number;
  guesses: Guess[];
  roundResult: RoundResult | null;
  log: string[];
}

// ── Game Actions (client → host via GAME_ACTION message) ──────────────────────

export type GameAction =
  | { type: 'UPDATE_ARRANGEMENT'; wordIds: string[] }
  | { type: 'SUBMIT_GUESS'; guess: string };
