import {
  FullGameState,
  PublicGameState,
  GameAction,
  BookletEntry,
  BookletPrompt,
  GamePhase,
} from './types';

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getPhaseForRound(round: number): GamePhase {
  if (round === 0) return 'writing';
  return round % 2 === 1 ? 'drawing' : 'guessing';
}

/**
 * In round `round`, player at index `i` holds booklet at index `(i + round) % n`.
 * This passes each booklet one step to the left each round so that after
 * `n` rounds every booklet is back with its owner.
 */
function bookletIndexFor(playerIndex: number, round: number, n: number): number {
  return (playerIndex + round) % n;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
): FullGameState {
  const n = playerIds.length;
  if (n < 4 || n > 8) throw new Error('Telestrations requires 4–8 players');

  const players = playerIds.map(id => ({
    playerId: id,
    name: playerNames[id] ?? id,
  }));

  const booklets = playerIds.map(id => ({
    ownerPlayerId: id,
    ownerName: playerNames[id] ?? id,
    entries: [] as BookletEntry[],
  }));

  return {
    phase: 'writing',
    players,
    round: 0,
    totalRounds: n,
    booklets,
    submittedIds: [],
  };
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export function getPromptForPlayer(state: FullGameState, playerIndex: number): BookletPrompt {
  const n = state.players.length;
  const bookletIdx = bookletIndexFor(playerIndex, state.round, n);
  const booklet = state.booklets[bookletIdx];
  const previousEntry = state.round > 0 ? (booklet.entries[state.round - 1] ?? null) : null;

  return {
    round: state.round,
    previousEntry,
    bookletOwnerName: booklet.ownerName,
  };
}

/** Returns a Map<playerId → prompt> for all players. */
export function getAllPrompts(state: FullGameState): Map<string, BookletPrompt> {
  const map = new Map<string, BookletPrompt>();
  state.players.forEach((p, i) => {
    map.set(p.playerId, getPromptForPlayer(state, i));
  });
  return map;
}

// ── Round advancement ─────────────────────────────────────────────────────────

function advanceRound(state: FullGameState): FullGameState {
  const nextRound = state.round + 1;
  if (nextRound >= state.totalRounds) {
    return { ...state, phase: 'results', round: nextRound, submittedIds: [] };
  }
  return {
    ...state,
    phase: getPhaseForRound(nextRound),
    round: nextRound,
    submittedIds: [],
  };
}

// ── Apply action ──────────────────────────────────────────────────────────────

export function applyAction(
  state: FullGameState,
  playerId: string,
  action: GameAction,
): FullGameState {
  if (action.type === 'SUBMIT_ENTRY') {
    if (state.submittedIds.includes(playerId)) throw new Error('Already submitted this round');

    const playerIndex = state.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1) throw new Error(`Unknown player: ${playerId}`);

    const n = state.players.length;
    const bookletIdx = bookletIndexFor(playerIndex, state.round, n);

    const entry: BookletEntry = {
      type: action.entryType,
      content: action.content,
      authorId: playerId,
      authorName: state.players[playerIndex].name,
    };

    const newBooklets = state.booklets.map((b, i) =>
      i === bookletIdx ? { ...b, entries: [...b.entries, entry] } : b
    );

    const newSubmittedIds = [...state.submittedIds, playerId];
    const newState = { ...state, booklets: newBooklets, submittedIds: newSubmittedIds };

    // Auto-advance when everyone has submitted
    if (newSubmittedIds.length >= state.players.length) {
      return advanceRound(newState);
    }
    return newState;
  }

  if (action.type === 'FORCE_ADVANCE') {
    // Insert placeholder entries for players who haven't submitted yet
    let s = state;
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i];
      if (!s.submittedIds.includes(p.playerId)) {
        const bookletIdx = bookletIndexFor(i, s.round, s.players.length);
        const entry: BookletEntry = {
          type: state.phase === 'drawing' ? 'drawing' : 'word',
          content: '',
          authorId: p.playerId,
          authorName: p.name,
        };
        s = {
          ...s,
          booklets: s.booklets.map((b, j) =>
            j === bookletIdx ? { ...b, entries: [...b.entries, entry] } : b
          ),
          submittedIds: [...s.submittedIds, p.playerId],
        };
      }
    }
    return advanceRound(s);
  }

  return state;
}

// ── Public state ──────────────────────────────────────────────────────────────

export function getPublicState(state: FullGameState): PublicGameState {
  return {
    phase: state.phase,
    players: state.players,
    round: state.round,
    totalRounds: state.totalRounds,
    submittedCount: state.submittedIds.length,
    // Reveal full booklets only in results phase so drawings stay private during play
    booklets: state.phase === 'results' ? state.booklets : null,
  };
}
