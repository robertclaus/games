import {
  FullGameState,
  PublicGameState,
  PlayerInfo,
  TeamState,
  GameAction,
  TeamId,
  Guess,
} from './types';
import { pickAnswer } from './words';

// ── Constants ──────────────────────────────────────────────────────────────────

export const ROUND_DURATION_MS = 120_000; // 2 minutes
export const TOTAL_ROUNDS_DEFAULT = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getStorytellerId(state: FullGameState | PublicGameState, team: TeamId): string {
  const t = state.teams[team];
  return t.playerIds[t.storytellerIndex % Math.max(1, t.playerIds.length)];
}

function getPlayerTeam(state: FullGameState, playerId: string): TeamId | null {
  return state.players.find(p => p.playerId === playerId)?.team ?? null;
}

// ── initGame ───────────────────────────────────────────────────────────────────

export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
): FullGameState {
  // Auto-split: even join-order indices → red, odd → blue
  const redIds = playerIds.filter((_, i) => i % 2 === 0);
  const blueIds = playerIds.filter((_, i) => i % 2 === 1);

  const players: PlayerInfo[] = [
    ...redIds.map(pid => ({ playerId: pid, name: playerNames[pid] ?? pid, team: 'red' as TeamId })),
    ...blueIds.map(pid => ({ playerId: pid, name: playerNames[pid] ?? pid, team: 'blue' as TeamId })),
  ];

  const firstAnswer = pickAnswer([]);

  return {
    phase: 'round_active',
    players,
    teams: {
      red:  makeTeam('red',  redIds,  0),
      blue: makeTeam('blue', blueIds, 0),
    },
    round: 1,
    totalRounds: TOTAL_ROUNDS_DEFAULT,
    currentAnswer: firstAnswer,
    usedAnswers: [firstAnswer],
    roundStartTime: Date.now(),
    roundDuration: ROUND_DURATION_MS,
    guesses: [],
    roundResult: null,
    log: ['Game started! Round 1 begins.'],
  };
}

function makeTeam(id: TeamId, playerIds: string[], storytellerIndex: number): TeamState {
  return { id, score: 0, playerIds, storytellerIndex, arrangement: [] };
}

// ── startRound ─────────────────────────────────────────────────────────────────

export function startRound(state: FullGameState): FullGameState {
  const newRound = state.round + 1;
  const answer = pickAnswer(state.usedAnswers);

  const redLen  = Math.max(1, state.teams.red.playerIds.length);
  const blueLen = Math.max(1, state.teams.blue.playerIds.length);

  return {
    ...state,
    phase: 'round_active',
    round: newRound,
    currentAnswer: answer,
    usedAnswers: [...state.usedAnswers, answer],
    roundStartTime: Date.now(),
    guesses: [],
    roundResult: null,
    teams: {
      red:  { ...state.teams.red,  storytellerIndex: (newRound - 1) % redLen,  arrangement: [] },
      blue: { ...state.teams.blue, storytellerIndex: (newRound - 1) % blueLen, arrangement: [] },
    },
    log: [...state.log, `Round ${newRound} started!`],
  };
}

// ── applyAction ────────────────────────────────────────────────────────────────

export function applyAction(
  state: FullGameState,
  fromPlayerId: string,
  action: GameAction,
): FullGameState {
  if (state.phase !== 'round_active') return state;

  switch (action.type) {

    case 'UPDATE_ARRANGEMENT': {
      const team = getPlayerTeam(state, fromPlayerId);
      if (!team) return state;
      if (getStorytellerId(state, team) !== fromPlayerId) return state;

      return {
        ...state,
        teams: {
          ...state.teams,
          [team]: { ...state.teams[team], arrangement: action.wordIds },
        },
      };
    }

    case 'SUBMIT_GUESS': {
      const team = getPlayerTeam(state, fromPlayerId);
      if (!team) return state;

      // Storyteller cannot guess
      if (getStorytellerId(state, team) === fromPlayerId) return state;

      const player = state.players.find(p => p.playerId === fromPlayerId)!;
      const guessText = action.guess.trim();
      if (!guessText) return state;

      const correct = guessText.toLowerCase() === state.currentAnswer.toLowerCase();

      const newGuess: Guess = {
        playerId: fromPlayerId,
        playerName: player.name,
        team,
        guess: guessText,
        correct,
      };

      if (correct) {
        const teamLabel = team === 'red' ? '🔴 Red' : '🔵 Blue';
        return {
          ...state,
          phase: 'round_result',
          guesses: [...state.guesses, newGuess],
          roundResult: { winnerTeam: team, answer: state.currentAnswer },
          teams: {
            ...state.teams,
            [team]: { ...state.teams[team], score: state.teams[team].score + 1 },
          },
          log: [
            ...state.log,
            `${player.name} (${teamLabel}) correctly guessed "${guessText}"!`,
          ],
        };
      }

      return {
        ...state,
        guesses: [...state.guesses, newGuess],
      };
    }

    default:
      return state;
  }
}

// ── applyTimeout ───────────────────────────────────────────────────────────────

export function applyTimeout(state: FullGameState): FullGameState {
  if (state.phase !== 'round_active') return state;
  return {
    ...state,
    phase: 'round_result',
    roundResult: { winnerTeam: null, answer: state.currentAnswer },
    log: [
      ...state.log,
      `Round ${state.round} timed out! The word was "${state.currentAnswer}".`,
    ],
  };
}

// ── applyAdvance ───────────────────────────────────────────────────────────────
// Called after the result display period ends; starts next round or ends game.

export function applyAdvance(state: FullGameState): FullGameState {
  if (state.phase !== 'round_result') return state;

  if (state.round >= state.totalRounds) {
    return {
      ...state,
      phase: 'game_over',
      log: [
        ...state.log,
        `Game over! Red: ${state.teams.red.score} pts — Blue: ${state.teams.blue.score} pts.`,
      ],
    };
  }

  return startRound(state);
}

// ── getPublicState ─────────────────────────────────────────────────────────────

export function getPublicState(state: FullGameState): PublicGameState {
  return {
    phase: state.phase,
    players: state.players,
    teams: state.teams,
    round: state.round,
    totalRounds: state.totalRounds,
    roundStartTime: state.roundStartTime,
    roundDuration: state.roundDuration,
    guesses: state.guesses,
    roundResult: state.roundResult,
    log: state.log,
  };
}
