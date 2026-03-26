import {
  FullGameState,
  PublicGameState,
  PublicPlayerState,
  PrivatePlayerState,
  PublicOfferPile,
  TurnState,
  CardInstance,
  GameAction,
} from './types';
import {
  resetIdCounter,
  buildStartingDeck,
  buildOfferPiles,
  buildFamePiles,
  buildCommonPile,
  createWild2c,
  makeFameCard,
  shuffle,
} from './cards';

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculatePlayerFamePoints(player: PrivatePlayerState): number {
  const allCards = [...player.hand, ...player.drawPile, ...player.discardPile];
  return allCards.reduce((sum, c) => sum + c.famePoints, 0);
}

function drawCards(player: PrivatePlayerState, count: number): PrivatePlayerState {
  const hand: CardInstance[] = [];
  let drawPile = [...player.drawPile];
  let discardPile = [...player.discardPile];

  const available = drawPile.length + discardPile.length;
  const toDraw = Math.min(count, available);

  for (let i = 0; i < toDraw; i++) {
    if (drawPile.length === 0) {
      drawPile = shuffle(discardPile);
      discardPile = [];
    }
    if (drawPile.length > 0) {
      hand.push(drawPile.pop()!);
    }
  }

  return { ...player, hand, drawPile, discardPile };
}

function makePublicPlayer(player: PrivatePlayerState): PublicPlayerState {
  const allCards = [...player.hand, ...player.drawPile, ...player.discardPile];
  return {
    playerId: player.playerId,
    name: player.name,
    handCount: player.hand.length,
    deckCount: player.drawPile.length + player.discardPile.length,
    famePoints: calculatePlayerFamePoints(player),
    commonCardsGained: allCards.filter(c => c.cardType === 'common').length,
  };
}

function makePublicOfferPile(pile: { id: string; cards: CardInstance[] }): PublicOfferPile {
  return {
    id: pile.id,
    visible: pile.cards.slice(0, 2),
    remaining: pile.cards.length,
  };
}

// ── initGame ──────────────────────────────────────────────────────────────────

export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>
): FullGameState {
  resetIdCounter();

  const players: PrivatePlayerState[] = playerIds.map(pid => {
    const { hand, drawPile } = buildStartingDeck();
    return {
      playerId: pid,
      name: playerNames[pid] ?? pid,
      hand,
      drawPile,
      discardPile: [],
      pendingExtraDraws: 0,
    };
  });

  const offerPiles = buildOfferPiles();
  const famePiles = buildFamePiles(playerIds.length);
  const commonPile = buildCommonPile();

  const firstPlayer = players[0];
  const turnState: TurnState = {
    phase: 'spelling',
    currentPlayerId: firstPlayer.playerId,
    currentPlayerIndex: 0,
    playedWord: null,
    wordScore: 0,
    budgetRemaining: 0,
    trashRemaining: 0,
    extraDrawsNext: 0,
    gainedCommon: false,
    message: null,
  };

  return {
    phase: 'playing',
    players,
    offerPiles,
    famePiles,
    commonPile,
    commonLengthRequired: 3,
    turnState,
    turnPlayedCardIds: [],
    log: [`Game started! ${firstPlayer.name}'s turn.`],
    gameEndPending: false,
  };
}

// ── canSpellWord ──────────────────────────────────────────────────────────────

export function canSpellWord(
  hand: CardInstance[],
  word: string,
  cardIds: string[],
  useCommonCard: boolean,
  commonCardLetter?: string
): { ok: boolean; message: string } {
  if (!word || word.length < 2) {
    return { ok: false, message: 'Word must be at least 2 letters' };
  }
  const w = word.toUpperCase();

  const handMap = new Map(hand.map(c => [c.id, c]));
  const selectedCards: CardInstance[] = [];
  for (const id of cardIds) {
    const card = handMap.get(id);
    if (!card) return { ok: false, message: 'Card not in hand' };
    selectedCards.push(card);
  }

  // Build letter supply
  const supply: Record<string, number> = {};
  let wilds = 0;
  for (const card of selectedCards) {
    if (card.cardType === 'wild' || card.cardType === 'common') {
      wilds++;
    } else {
      for (const letter of card.letters) {
        supply[letter] = (supply[letter] ?? 0) + 1;
      }
    }
  }

  // Add common card contribution (one vowel)
  if (useCommonCard && commonCardLetter) {
    const vowel = commonCardLetter.toUpperCase();
    if (['A', 'E', 'I', 'O', 'U'].includes(vowel)) {
      supply[vowel] = (supply[vowel] ?? 0) + 1;
    }
  }

  // Check coverage
  const needed: Record<string, number> = {};
  for (const ch of w) {
    needed[ch] = (needed[ch] ?? 0) + 1;
  }

  for (const [letter, count] of Object.entries(needed)) {
    const avail = supply[letter] ?? 0;
    const deficit = Math.max(0, count - avail);
    if (deficit > wilds) {
      return { ok: false, message: `Not enough cards to spell "${word}"` };
    }
    wilds -= deficit;
    if (avail > 0) supply[letter] = Math.max(0, avail - count);
  }

  return { ok: true, message: '' };
}

// ── setValidating ─────────────────────────────────────────────────────────────

export function setValidating(state: FullGameState, word: string): FullGameState {
  if (!state.turnState) return state;
  return {
    ...state,
    turnState: {
      ...state.turnState,
      phase: 'validating',
      playedWord: word,
      message: `Validating "${word}"...`,
    },
  };
}

// ── rejectWord ────────────────────────────────────────────────────────────────

export function rejectWord(state: FullGameState, message: string): FullGameState {
  if (!state.turnState) return state;
  return {
    ...state,
    turnState: {
      ...state.turnState,
      phase: 'spelling',
      playedWord: null,
      message,
    },
    turnPlayedCardIds: [],
  };
}

// ── acceptWord ────────────────────────────────────────────────────────────────
// Played cards are moved to a "played staging" (tracked in turnPlayedCardIds for the UI).
// At END_TURN, remaining hand cards + the played staging cards all go to discard.
// To support this, we store played card instances in the player's discardPile immediately
// so they're preserved, BUT we track their IDs so END_TURN knows not to double-count them.
//
// Actually, the cleanest approach: played cards go to a dedicated staging on the player.
// We repurpose the concept: at END_TURN, hand goes to discard. Played cards were already
// removed from hand. We need a place to store them until END_TURN.
//
// Solution: Add them to a temporary "playedThisTurn" in PrivatePlayerState is not in the type.
// Instead: put them directly into discardPile in acceptWord (they ARE going to discard eventually),
// and track IDs in turnPlayedCardIds so UI knows what's been played.

export function acceptWord(
  state: FullGameState,
  fromPlayerId: string,
  word: string,
  cardIds: string[],
  useCommonCard: boolean,
  commonCardLetter?: string
): FullGameState {
  if (!state.turnState) return state;

  const playerIdx = state.players.findIndex(p => p.playerId === fromPlayerId);
  if (playerIdx < 0) return state;

  const player = state.players[playerIdx];
  const handMap = new Map(player.hand.map(c => [c.id, c]));
  const playedCards: CardInstance[] = cardIds.map(id => handMap.get(id)!).filter(Boolean);

  // Remove played cards from hand
  const remainingHand = player.hand.filter(c => !cardIds.includes(c.id));

  // Move played cards to discard immediately (they'll be there at END_TURN)
  let newDiscardPile = [...player.discardPile, ...playedCards];

  // Calculate score and process automatic abilities
  let wordScore = 0;
  let extraDrawsNext = state.turnState.extraDrawsNext;
  let trashRemaining = 0;

  for (const card of playedCards) {
    wordScore += card.score;
    if (card.ability) {
      switch (card.ability.type) {
        case 'score':
          wordScore += card.ability.value;
          break;
        case 'draw':
          extraDrawsNext += card.ability.value;
          break;
        case 'gain_wild':
          newDiscardPile = [...newDiscardPile, createWild2c()];
          break;
        case 'trash':
          trashRemaining += card.ability.value;
          break;
      }
    }
  }

  // Check common card gain (word length >= required)
  let newCommonPile = [...state.commonPile];
  let newCommonLengthRequired = state.commonLengthRequired;
  let gainedCommon = false;
  let gameEndPending = state.gameEndPending;

  const commonCard = newCommonPile[0] ?? null;
  const willGainCommon = word.length >= state.commonLengthRequired && newCommonPile.length > 0;

  if (willGainCommon && commonCard) {
    gainedCommon = true;
    newCommonPile = newCommonPile.slice(1);
    newCommonLengthRequired = state.commonLengthRequired + 1;

    // Add common card to player's discard (it's now owned)
    newDiscardPile = [...newDiscardPile, commonCard];

    if (newCommonPile.length === 0) {
      gameEndPending = true;
    }
  }

  // Apply common card score/abilities if it was USED in the word.
  // The card's score and abilities trigger when used, regardless of whether it was gained.
  // (Gaining is a separate reward for word length; using it in the word is the scoring action.)
  if (useCommonCard && commonCard) {
    wordScore += commonCard.score;
    if (commonCard.ability) {
      switch (commonCard.ability.type) {
        case 'score':
          wordScore += commonCard.ability.value;
          break;
        case 'draw':
          extraDrawsNext += commonCard.ability.value;
          break;
        case 'gain_wild':
          // Add a free wild to discard (separate from the common card itself)
          newDiscardPile = [...newDiscardPile, createWild2c()];
          break;
        case 'trash':
          trashRemaining += commonCard.ability.value;
          break;
      }
    }
  }

  const updatedPlayer: PrivatePlayerState = {
    ...player,
    hand: remainingHand,
    discardPile: newDiscardPile,
  };

  const updatedPlayers = state.players.map((p, i) => i === playerIdx ? updatedPlayer : p);

  const gainMsg = gainedCommon ? ' (gained Common Card!)' : '';
  const logEntry = `${player.name} spelled "${word.toUpperCase()}" for ${wordScore}¢${gainMsg}`;

  const newTurnState: TurnState = {
    ...state.turnState,
    phase: trashRemaining > 0 ? 'trashing' : 'buying',
    playedWord: word.toUpperCase(),
    wordScore,
    budgetRemaining: wordScore,
    trashRemaining,
    extraDrawsNext,
    gainedCommon,
    message: trashRemaining > 0
      ? `Trash ${trashRemaining} card(s) from your remaining hand`
      : `Spend ${wordScore}¢ to buy cards`,
  };

  return {
    ...state,
    players: updatedPlayers,
    commonPile: newCommonPile,
    commonLengthRequired: newCommonLengthRequired,
    turnState: newTurnState,
    turnPlayedCardIds: [...state.turnPlayedCardIds, ...cardIds],
    log: [...state.log, logEntry],
    gameEndPending,
  };
}

// ── applyAction ───────────────────────────────────────────────────────────────

export function applyAction(
  state: FullGameState,
  fromPlayerId: string,
  action: GameAction
): FullGameState {
  if (!state.turnState) return state;
  const ts = state.turnState;

  if (ts.currentPlayerId !== fromPlayerId) return state;

  switch (action.type) {
    case 'SUBMIT_WORD':
      // SUBMIT_WORD is handled asynchronously in App.tsx via handleSubmitWordAsync
      // This path should not be reached normally, but handle gracefully
      return state;

    case 'TRASH_CARD': {
      if (ts.phase !== 'trashing') return state;
      if (ts.trashRemaining <= 0) return state;

      const playerIdx = state.players.findIndex(p => p.playerId === fromPlayerId);
      if (playerIdx < 0) return state;
      const player = state.players[playerIdx];

      // Cannot trash a card already played this turn
      if (state.turnPlayedCardIds.includes(action.cardId)) return state;

      const cardIdx = player.hand.findIndex(c => c.id === action.cardId);
      if (cardIdx < 0) return state;

      const card = player.hand[cardIdx];
      const newHand = player.hand.filter((_, i) => i !== cardIdx);
      // Trashed card is removed from game entirely
      const updatedPlayer: PrivatePlayerState = { ...player, hand: newHand };
      const updatedPlayers = state.players.map((p, i) => i === playerIdx ? updatedPlayer : p);

      const newTrashRemaining = ts.trashRemaining - 1;
      const newPhase = newTrashRemaining <= 0 ? 'buying' : 'trashing';
      const cardLabel = card.letters.length > 0 ? card.letters.join('') : 'Wild';

      return {
        ...state,
        players: updatedPlayers,
        turnState: {
          ...ts,
          phase: newPhase,
          trashRemaining: newTrashRemaining,
          message: newPhase === 'buying'
            ? `Spend ${ts.budgetRemaining}¢ to buy cards`
            : `Trash ${newTrashRemaining} more card(s) from your hand`,
        },
        log: [...state.log, `${player.name} trashed "${cardLabel}"`],
      };
    }

    case 'BUY_CARD': {
      if (ts.phase !== 'buying') return state;

      const pileIdx = state.offerPiles.findIndex(p => p.id === action.pileId);
      if (pileIdx < 0) return state;

      const pile = state.offerPiles[pileIdx];
      if (pile.cards.length === 0) return state;

      // Only the top 2 visible cards may be bought
      const cardIdx = pile.cards.slice(0, 2).findIndex(c => c.id === action.cardId);
      if (cardIdx < 0) return state;

      const card = pile.cards[cardIdx];
      if (ts.budgetRemaining < card.cost) return state;

      const playerIdx = state.players.findIndex(p => p.playerId === fromPlayerId);
      if (playerIdx < 0) return state;
      const player = state.players[playerIdx];

      const newPileCards = pile.cards.filter((_, i) => i !== cardIdx);
      const newOfferPiles = state.offerPiles.map((p, i) =>
        i === pileIdx ? { ...p, cards: newPileCards } : p
      );

      const updatedPlayer: PrivatePlayerState = {
        ...player,
        discardPile: [...player.discardPile, card],
      };
      const updatedPlayers = state.players.map((p, i) => i === playerIdx ? updatedPlayer : p);
      const cardLabel = card.letters.length > 0 ? card.letters.join('') : 'Wild';
      const newBudget = ts.budgetRemaining - card.cost;

      return {
        ...state,
        players: updatedPlayers,
        offerPiles: newOfferPiles,
        turnState: {
          ...ts,
          budgetRemaining: newBudget,
          message: newBudget > 0
            ? `Bought "${cardLabel}". ${newBudget}¢ remaining.`
            : `Bought "${cardLabel}". No budget left.`,
        },
        log: [...state.log, `${player.name} bought "${cardLabel}" for ${card.cost}¢`],
      };
    }

    case 'BUY_FAME': {
      if (ts.phase !== 'buying') return state;

      const fameIdx = state.famePiles.findIndex(p => p.rank === action.rank);
      if (fameIdx < 0) return state;

      const famePile = state.famePiles[fameIdx];
      if (famePile.count <= 0) return state;
      if (ts.budgetRemaining < famePile.cost) return state;

      const playerIdx = state.players.findIndex(p => p.playerId === fromPlayerId);
      if (playerIdx < 0) return state;
      const player = state.players[playerIdx];

      const fameCard = makeFameCard(famePile.rank, famePile.cost, famePile.famePoints);
      const newFamePiles = state.famePiles.map((p, i) =>
        i === fameIdx ? { ...p, count: p.count - 1 } : p
      );

      const updatedPlayer: PrivatePlayerState = {
        ...player,
        discardPile: [...player.discardPile, fameCard],
      };
      const updatedPlayers = state.players.map((p, i) => i === playerIdx ? updatedPlayer : p);

      let gameEndPending = state.gameEndPending;
      if (newFamePiles[fameIdx].count === 0) {
        gameEndPending = true;
      }

      const newBudget = ts.budgetRemaining - famePile.cost;

      return {
        ...state,
        players: updatedPlayers,
        famePiles: newFamePiles,
        turnState: {
          ...ts,
          budgetRemaining: newBudget,
          message: newBudget > 0
            ? `Bought ${famePile.famePoints}-pt Fame card. ${newBudget}¢ remaining.`
            : `Bought ${famePile.famePoints}-pt Fame card. No budget left.`,
        },
        log: [...state.log, `${player.name} bought a ${famePile.famePoints}-point Fame card for ${famePile.cost}¢`],
        gameEndPending,
      };
    }

    case 'END_TURN': {
      const playerIdx = state.players.findIndex(p => p.playerId === fromPlayerId);
      if (playerIdx < 0) return state;

      let player = state.players[playerIdx];

      // Move remaining hand cards to discard
      // (played cards were already moved to discard in acceptWord)
      const remainingHand = player.hand;
      player = {
        ...player,
        hand: [],
        discardPile: [...player.discardPile, ...remainingHand],
        pendingExtraDraws: 0,
      };

      // Draw new hand: 5 + pendingExtraDraws (from previous turns) + extraDrawsNext (from this turn)
      const oldPending = state.players[playerIdx].pendingExtraDraws;
      const drawCount = 5 + oldPending + ts.extraDrawsNext;
      const drawnPlayer = drawCards(player, drawCount);

      const updatedPlayers = state.players.map((p, i) => i === playerIdx ? drawnPlayer : p);

      // Check game end
      if (state.gameEndPending) {
        return {
          ...state,
          phase: 'game_over',
          players: updatedPlayers,
          turnState: null,
          turnPlayedCardIds: [],
          log: [...state.log, 'Game over! Final scores calculated.'],
          gameEndPending: false,
        };
      }

      // Advance to next player
      const nextPlayerIndex = (ts.currentPlayerIndex + 1) % updatedPlayers.length;
      const nextPlayer = updatedPlayers[nextPlayerIndex];

      const newTurnState: TurnState = {
        phase: 'spelling',
        currentPlayerId: nextPlayer.playerId,
        currentPlayerIndex: nextPlayerIndex,
        playedWord: null,
        wordScore: 0,
        budgetRemaining: 0,
        trashRemaining: 0,
        extraDrawsNext: 0,
        gainedCommon: false,
        message: null,
      };

      return {
        ...state,
        players: updatedPlayers,
        turnState: newTurnState,
        turnPlayedCardIds: [],
        log: [...state.log, `${nextPlayer.name}'s turn.`],
      };
    }

    default:
      return state;
  }
}

// ── getPublicState ────────────────────────────────────────────────────────────

export function getPublicState(state: FullGameState): PublicGameState {
  return {
    phase: state.phase,
    players: state.players.map(makePublicPlayer),
    offerPiles: state.offerPiles.map(makePublicOfferPile),
    famePiles: state.famePiles,
    commonPile: {
      topCard: state.commonPile[0] ?? null,
      remaining: state.commonPile.length,
      lengthRequired: state.commonLengthRequired,
    },
    turnState: state.turnState,
    log: state.log,
  };
}

// ── getPlayerHand ─────────────────────────────────────────────────────────────

export function getPlayerHand(state: FullGameState, playerId: string): { hand: CardInstance[]; pendingExtraDraws: number } {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) return { hand: [], pendingExtraDraws: 0 };
  return { hand: player.hand, pendingExtraDraws: player.pendingExtraDraws };
}
