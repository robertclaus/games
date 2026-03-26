import {
  FullGameState,
  PublicGameState,
  PlayerState,
  GameAction,
  ItemType,
} from './types';
import { buildDeck, getCorrectAnswer, ITEM_EMOJI } from './cards';

const MAX_LOG = 20;

function addLog(log: string[], entry: string): string[] {
  const updated = [...log, entry];
  if (updated.length > MAX_LOG) return updated.slice(updated.length - MAX_LOG);
  return updated;
}

/**
 * Initialise a fresh game state from a list of player IDs and their names.
 * Draws the first card immediately and sets phase to 'revealing'.
 */
export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
): FullGameState {
  const deck = buildDeck();

  const players: PlayerState[] = playerIds.map(pid => ({
    playerId: pid,
    name: playerNames[pid] ?? pid,
    score: 0,
    guessedThisRound: false,
  }));

  // Draw first card
  const firstCard = deck.pop()!;

  const state: FullGameState = {
    phase: 'revealing',
    players,
    deck,
    cardsPlayed: 1,
    totalCards: 65,
    currentCard: firstCard,
    roundResult: null,
    log: [`Game started with ${players.length} players. 65 cards in the deck.`],
  };

  return state;
}

/**
 * Apply a player action to the game state and return the new state.
 * Throws if the action is illegal (caller should catch and ignore).
 */
export function applyAction(
  state: FullGameState,
  playerId: string,
  action: GameAction,
): FullGameState {
  switch (action.type) {
    case 'START_GAME':
      // Handled externally by the host (calls initGame)
      return state;

    case 'GUESS':
      return applyGuess(state, playerId, action.item);

    case 'ADVANCE':
      return applyAdvance(state);

    default:
      return state;
  }
}

function applyGuess(state: FullGameState, playerId: string, item: ItemType): FullGameState {
  if (state.phase !== 'revealing') {
    throw new Error(`Cannot guess in phase: ${state.phase}`);
  }
  if (!state.currentCard) {
    throw new Error('No current card to guess');
  }

  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    throw new Error(`Unknown player: ${playerId}`);
  }

  const player = state.players[playerIndex];
  if (player.guessedThisRound) {
    throw new Error(`Player ${playerId} already guessed this round`);
  }

  const correctItem = getCorrectAnswer(state.currentCard);
  const isCorrect = item === correctItem;

  let newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) {
      return { ...p, guessedThisRound: true };
    }
    return p;
  });

  let newLog = state.log;

  if (isCorrect) {
    // Collect wrongGuessers: players who already guessed this round (before this guess)
    // They are already marked guessedThisRound=true from their earlier wrong guesses,
    // EXCEPT the current player who just guessed (we marked them above).
    // So wrongGuessers = players with guessedThisRound=true after update, minus current player.
    const wrongGuessers = newPlayers
      .filter(p => p.playerId !== playerId && p.guessedThisRound)
      .map(p => p.playerId);

    // Winner gets +1 for the round card + 1 per wrong guesser (penalty cards)
    const winnerBonus = 1 + wrongGuessers.length;
    newPlayers = newPlayers.map(p => {
      if (p.playerId === playerId) {
        return { ...p, score: p.score + winnerBonus, guessedThisRound: false };
      }
      return { ...p, guessedThisRound: false };
    });

    const winnerName = player.name;
    const emoji = ITEM_EMOJI[correctItem];
    const logEntry = `Round ${state.cardsPlayed}: ${winnerName} grabbed the ${correctItem}! (+${winnerBonus} card${winnerBonus !== 1 ? 's' : ''}) ${emoji}`;
    newLog = addLog(state.log, logEntry);

    return {
      ...state,
      phase: 'result',
      players: newPlayers,
      roundResult: {
        winnerId: playerId,
        correctItem,
        wrongGuessers,
      },
      log: newLog,
    };
  } else {
    // Wrong guess: decrement score immediately (min 0)
    newPlayers = newPlayers.map(p => {
      if (p.playerId === playerId) {
        return { ...p, score: Math.max(0, p.score - 1) };
      }
      return p;
    });

    // Check if ALL players have now guessed (all wrong)
    const allGuessed = newPlayers.every(p => p.guessedThisRound);

    if (allGuessed) {
      // Nobody won this round
      const wrongGuessers = newPlayers.map(p => p.playerId);
      const emoji = ITEM_EMOJI[correctItem];
      const logEntry = `Round ${state.cardsPlayed}: Nobody got it! The ${correctItem} ${emoji} was the answer.`;
      newLog = addLog(state.log, logEntry);

      // Reset guessedThisRound
      newPlayers = newPlayers.map(p => ({ ...p, guessedThisRound: false }));

      return {
        ...state,
        phase: 'result',
        players: newPlayers,
        roundResult: {
          winnerId: null,
          correctItem,
          wrongGuessers,
        },
        log: newLog,
      };
    }

    // Still waiting for other players
    return {
      ...state,
      players: newPlayers,
    };
  }
}

function applyAdvance(state: FullGameState): FullGameState {
  if (state.phase !== 'result' && state.phase !== 'revealing') {
    throw new Error(`Cannot advance in phase: ${state.phase}`);
  }

  // Reset guessedThisRound and clear roundResult
  let newPlayers = state.players.map(p => ({ ...p, guessedThisRound: false }));
  let newLog = state.log;

  if (state.phase === 'revealing' && !state.roundResult) {
    // Timeout case — no one guessed
    const correctItem = state.currentCard ? getCorrectAnswer(state.currentCard) : null;
    if (correctItem) {
      const emoji = ITEM_EMOJI[correctItem];
      newLog = addLog(state.log, `Round ${state.cardsPlayed}: Time's up! The ${correctItem} ${emoji} was the answer.`);
    }
  }

  const newDeck = [...state.deck];

  if (newDeck.length === 0) {
    // Deck exhausted — game over
    return {
      ...state,
      phase: 'game_over',
      players: newPlayers,
      deck: newDeck,
      currentCard: null,
      roundResult: null,
      log: addLog(newLog, 'Game over! All 60 cards played.'),
    };
  }

  // Draw next card
  const nextCard = newDeck.pop()!;
  return {
    ...state,
    phase: 'revealing',
    players: newPlayers,
    deck: newDeck,
    cardsPlayed: state.cardsPlayed + 1,
    currentCard: nextCard,
    roundResult: null,
    log: newLog,
  };
}

/**
 * Returns the public view of the game state (strips the full deck, adds deckCount).
 */
export function getPublicState(state: FullGameState): PublicGameState {
  const { deck, ...rest } = state;
  return { ...rest, deckCount: deck.length };
}
