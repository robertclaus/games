import {
  FullGameState,
  GameAction,
  Card,
  PublicGameState,
  PlayerPublicState,
  VaultSlot,
  SpyCharacter,
  CodeCard,
  ActionCard,
} from './types';
import { createDeck, dealCodes, shuffle } from './deck';

const HAND_LIMIT = 5;
const BOX_SIZE = 3;
const ESPIE_COUNTDOWN = 5;

// ── Helpers ────────────────────────────────────────────────────────────────────

function isAction(c: Card): c is ActionCard {
  return c.kind === 'action';
}

function drawFromDeck(deck: Card[]): [Card | null, Card[]] {
  if (deck.length === 0) return [null, deck];
  return [deck[0], deck.slice(1)];
}

function removeCardById(cards: Card[], id: string): [Card | null, Card[]] {
  const idx = cards.findIndex(c => c.id === id);
  if (idx === -1) return [null, cards];
  const card = cards[idx];
  return [card, [...cards.slice(0, idx), ...cards.slice(idx + 1)]];
}

function checkWin(vault: VaultSlot[]): boolean {
  return vault.every(slot => slot !== null);
}

function advanceTurn(state: FullGameState): FullGameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnPhase: 'draw',
    pendingAction: null,
  };
}

function refillBox(state: FullGameState): FullGameState {
  let deck = [...state.deck];
  let discard = [...state.discard];
  const box = [...state.box];

  for (let i = 0; i < BOX_SIZE; i++) {
    if (box[i] === null) {
      // Keep drawing until we get a non-action card
      let found = false;
      for (let attempts = 0; attempts < deck.length + 1; attempts++) {
        if (deck.length === 0) break;
        const top = deck[0];
        deck = deck.slice(1);
        if (isAction(top)) {
          // Action card can't be in box — discard it
          discard = [top, ...discard];
        } else {
          box[i] = top;
          found = true;
          break;
        }
      }
      if (!found) {
        // leave as null if deck is exhausted
      }
    }
  }

  return { ...state, deck, discard, box };
}

// ── initGame ───────────────────────────────────────────────────────────────────

export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
  playerCharacters: Record<string, SpyCharacter>
): FullGameState {
  let deck = shuffle(createDeck());
  const codes = dealCodes(playerIds.length);
  const codeMap: Record<string, CodeCard> = {};
  playerIds.forEach((id, i) => { codeMap[id] = codes[i]; });

  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) {
    hands[id] = [];
    for (let i = 0; i < 3; i++) {
      const [card, rest] = drawFromDeck(deck);
      deck = rest;
      if (card) hands[id].push(card);
    }
  }

  const vaults: Record<string, VaultSlot[]> = {};
  for (const id of playerIds) {
    vaults[id] = [null, null, null];
  }

  // Fill box with 3 non-action cards
  const box: (Card | null)[] = [null, null, null];
  let discard: Card[] = [];
  for (let i = 0; i < BOX_SIZE; i++) {
    // Keep drawing until non-action
    while (deck.length > 0) {
      const [top, rest] = drawFromDeck(deck);
      deck = rest;
      if (!top) break;
      if (isAction(top)) {
        discard = [top, ...discard];
      } else {
        box[i] = top;
        break;
      }
    }
  }

  const players: PlayerPublicState[] = playerIds.map(id => ({
    playerId: id,
    name: playerNames[id] ?? id,
    character: playerCharacters[id] ?? 'Denis',
    vault: [false, false, false],
    handCount: hands[id].length,
  }));

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    box,
    deckCount: deck.length,
    discardTop: discard.length > 0 ? discard[0] : null,
    turnPhase: 'draw',
    pendingAction: null,
    winnerId: null,
    lastEvent: 'Game started!',
    deck,
    discard,
    hands,
    codes: codeMap,
    vaults,
  };
}

// ── resolveAction ──────────────────────────────────────────────────────────────

export function resolveAction(state: FullGameState): FullGameState {
  const pending = state.pendingAction;
  if (!pending) return state;

  const actorId = pending.playerId;
  let s: FullGameState = { ...state, pendingAction: null };

  switch (pending.action) {
    case 'SneakPeak': {
      // Peek at top 3 of deck — send privately to player
      // We enter a sub-phase where the actor chooses which card to keep.
      // Expose top 3 in the pendingAction payload (only sent privately to that player)
      const peekCards = s.deck.slice(0, 3);
      return {
        ...s,
        turnPhase: 'sneakPeakChoose',
        pendingAction: {
          playerId: actorId,
          action: 'SneakPeak',
          payload: { peekCards },
          countdown: 60, // plenty of time to choose
          affectedPlayerIds: [actorId],
        },
        lastEvent: `${s.players.find(p => p.playerId === actorId)?.name} is peeking at the top 3 cards...`,
      };
    }

    case 'Ambush': {
      const payload = pending.payload as { targetPlayerId: string };
      const targetId = payload.targetPlayerId;
      let actorHand = [...(s.hands[actorId] ?? [])];
      let targetHand = [...(s.hands[targetId] ?? [])];

      if (targetHand.length > 0) {
        const idx = Math.floor(Math.random() * targetHand.length);
        const stolen = targetHand[idx];
        targetHand = [...targetHand.slice(0, idx), ...targetHand.slice(idx + 1)];
        actorHand = [...actorHand, stolen];
      }

      s = {
        ...s,
        hands: { ...s.hands, [actorId]: actorHand, [targetId]: targetHand },
        lastEvent: `${s.players.find(p => p.playerId === actorId)?.name} ambushed ${s.players.find(p => p.playerId === targetId)?.name}!`,
      };
      s = updateHandCounts(s);
      return advanceTurn(s);
    }

    case 'FastFrenzy': {
      return {
        ...s,
        turnPhase: 'fastFrenzy2',
        lastEvent: `${s.players.find(p => p.playerId === actorId)?.name} uses Fast Frenzy — play another Number card!`,
      };
    }

    case 'Snatched': {
      const payload = pending.payload as { targetPlayerId: string; digit: number };
      const targetId = payload.targetPlayerId;
      const digit = payload.digit;
      let actorHand = [...(s.hands[actorId] ?? [])];
      let targetHand = [...(s.hands[targetId] ?? [])];
      const actorName = s.players.find(p => p.playerId === actorId)?.name ?? actorId;
      const targetName = s.players.find(p => p.playerId === targetId)?.name ?? targetId;

      const idx = targetHand.findIndex(c => c.kind === 'number' && (c as import('./types').NumberCard).value === digit);
      let eventMsg: string;
      if (idx !== -1) {
        const stolen = targetHand[idx];
        targetHand = [...targetHand.slice(0, idx), ...targetHand.slice(idx + 1)];
        actorHand = [...actorHand, stolen];
        eventMsg = `${actorName} snatched a ${digit} from ${targetName}!`;
      } else {
        eventMsg = `${actorName} tried to snatch ${digit} from ${targetName} — they didn't have it!`;
      }

      s = {
        ...s,
        hands: { ...s.hands, [actorId]: actorHand, [targetId]: targetHand },
        lastEvent: eventMsg,
      };
      s = updateHandCounts(s);
      return advanceTurn(s);
    }

    case 'EspieNAH':
    case 'MasterOfForgery':
      // These are not resolved here
      return advanceTurn(s);

    default:
      return advanceTurn(s);
  }
}

// ── updateHandCounts ───────────────────────────────────────────────────────────

function updateHandCounts(state: FullGameState): FullGameState {
  const players = state.players.map(p => ({
    ...p,
    handCount: (state.hands[p.playerId] ?? []).length,
  }));
  return { ...state, players };
}

// ── applyAction ────────────────────────────────────────────────────────────────

export function applyAction(
  state: FullGameState,
  playerId: string,
  action: GameAction
): FullGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isCurrentPlayer = currentPlayer?.playerId === playerId;

  switch (action.type) {
    case 'REQUEST_STATE':
      return state;

    case 'DRAW_FROM_PILE': {
      if (!isCurrentPlayer || state.turnPhase !== 'draw') return state;
      if (state.deck.length === 0) {
        // Skip draw if deck is empty
        return { ...state, turnPhase: 'play', lastEvent: 'Deck is empty — no card to draw.' };
      }
      const [card, newDeck] = drawFromDeck(state.deck);
      if (!card) return state;
      const newHand = [...(state.hands[playerId] ?? []), card];
      let s: FullGameState = {
        ...state,
        deck: newDeck,
        deckCount: newDeck.length,
        hands: { ...state.hands, [playerId]: newHand },
        turnPhase: 'play',
        lastEvent: `${currentPlayer.name} drew from the deck.`,
      };
      s = updateHandCounts(s);
      return s;
    }

    case 'DRAW_FROM_BOX': {
      if (!isCurrentPlayer || state.turnPhase !== 'draw') return state;
      const { boxIndex } = action;
      const boxCard = state.box[boxIndex];
      if (!boxCard) return state;

      const newBox = [...state.box];
      newBox[boxIndex] = null;

      const newHand = [...(state.hands[playerId] ?? []), boxCard];
      let s: FullGameState = {
        ...state,
        box: newBox,
        hands: { ...state.hands, [playerId]: newHand },
        turnPhase: 'play',
        lastEvent: `${currentPlayer.name} took a card from the box.`,
      };
      // Refill the taken slot
      s = refillBox(s);
      s = updateHandCounts(s);
      s.deckCount = s.deck.length;
      return s;
    }

    case 'PLAY_NUMBER': {
      if (!isCurrentPlayer) return state;
      if (state.turnPhase !== 'play' && state.turnPhase !== 'fastFrenzy2') return state;

      const { cardId, vaultSlot } = action;
      const hand = state.hands[playerId] ?? [];
      const card = hand.find(c => c.id === cardId);
      if (!card) return state;

      const code = state.codes[playerId];
      const vault = state.vaults[playerId];

      if (vault[vaultSlot] !== null) return state; // slot already filled

      const isMasterOfForgery = card.kind === 'action' && (card as ActionCard).action === 'MasterOfForgery';
      const isNumberMatch = card.kind === 'number' &&
        (card as import('./types').NumberCard).value === code.digits[vaultSlot];

      if (!isMasterOfForgery && !isNumberMatch) return state;

      const [, newHand] = removeCardById(hand, cardId);
      const newVault: VaultSlot[] = [...vault];
      newVault[vaultSlot] = card;

      const newVaultPublic: [boolean, boolean, boolean] = [
        newVault[0] !== null,
        newVault[1] !== null,
        newVault[2] !== null,
      ];

      const won = checkWin(newVault);
      let s: FullGameState = {
        ...state,
        hands: { ...state.hands, [playerId]: newHand },
        vaults: { ...state.vaults, [playerId]: newVault },
        players: state.players.map(p =>
          p.playerId === playerId
            ? { ...p, vault: newVaultPublic, handCount: newHand.length }
            : p
        ),
        lastEvent: isMasterOfForgery
          ? `${currentPlayer.name} placed a Master of Forgery in slot ${vaultSlot + 1}!`
          : `${currentPlayer.name} filled vault slot ${vaultSlot + 1}!`,
      };

      if (won) {
        return {
          ...s,
          phase: 'ended',
          winnerId: playerId,
          lastEvent: `${currentPlayer.name} declared SPYOUTS and wins!`,
        };
      }

      // FastFrenzy lets you play 2 numbers
      if (state.turnPhase === 'fastFrenzy2') {
        // Already played 2nd number under fast frenzy — advance turn
        return advanceTurn(s);
      }

      // Check if we just resolved a FastFrenzy
      // Normal play — advance turn
      return advanceTurn(s);
    }

    case 'PLAY_ACTION': {
      if (!isCurrentPlayer) return state;
      if (state.turnPhase !== 'play' && state.turnPhase !== 'fastFrenzy2') return state;

      // Special case: MasterOfForgery is played as a number card via PLAY_NUMBER
      // But if someone tries PLAY_ACTION with it, ignore
      const { cardId, targetPlayerId, targetDigit } = action;
      const hand = state.hands[playerId] ?? [];
      const card = hand.find(c => c.id === cardId);
      if (!card || card.kind !== 'action') return state;

      const actionCard = card as ActionCard;
      if (actionCard.action === 'MasterOfForgery') return state; // use PLAY_NUMBER

      const [, newHand] = removeCardById(hand, cardId);

      // Everyone else can counter (Espie-NAH!)
      const otherPlayerIds = state.players
        .map(p => p.playerId)
        .filter(id => id !== playerId);

      const pendingPayload: Record<string, unknown> = {};
      if (targetPlayerId) pendingPayload.targetPlayerId = targetPlayerId;
      if (targetDigit !== undefined) pendingPayload.digit = targetDigit;

      const actorName = currentPlayer.name;

      let eventMsg = '';
      switch (actionCard.action) {
        case 'SneakPeak':
          eventMsg = `${actorName} plays Sneak Peak!`;
          break;
        case 'Ambush':
          eventMsg = `${actorName} plays Ambush on ${state.players.find(p => p.playerId === targetPlayerId)?.name ?? targetPlayerId}!`;
          break;
        case 'FastFrenzy':
          eventMsg = `${actorName} plays Fast Frenzy!`;
          break;
        case 'EspieNAH':
          // Playing EspieNAH as the active player is unusual; skip
          return state;
        case 'Snatched':
          eventMsg = `${actorName} plays Snatched! Calling digit ${targetDigit} from ${state.players.find(p => p.playerId === targetPlayerId)?.name ?? targetPlayerId}!`;
          break;
      }

      let s: FullGameState = {
        ...state,
        hands: { ...state.hands, [playerId]: newHand },
        turnPhase: 'pendingAction',
        pendingAction: {
          playerId,
          action: actionCard.action,
          payload: pendingPayload,
          countdown: ESPIE_COUNTDOWN,
          affectedPlayerIds: otherPlayerIds,
        },
        discard: [card, ...state.discard],
        discardTop: card,
        lastEvent: eventMsg,
      };
      s = updateHandCounts(s);
      return s;
    }

    case 'COUNTER_ACTION': {
      // Any other player plays Espie-NAH! to cancel the pending action
      const pending = state.pendingAction;
      if (!pending) return state;
      if (pending.playerId === playerId) return state; // can't counter your own
      if (state.turnPhase !== 'pendingAction') return state;

      // Find an EspieNAH card in their hand
      const hand = state.hands[playerId] ?? [];
      const espieIdx = hand.findIndex(c => c.kind === 'action' && (c as ActionCard).action === 'EspieNAH');
      if (espieIdx === -1) return state;

      const espieCard = hand[espieIdx];
      const newHand = [...hand.slice(0, espieIdx), ...hand.slice(espieIdx + 1)];
      const counterName = state.players.find(p => p.playerId === playerId)?.name ?? playerId;
      const actorName = state.players.find(p => p.playerId === pending.playerId)?.name ?? pending.playerId;

      let s: FullGameState = {
        ...state,
        hands: { ...state.hands, [playerId]: newHand },
        discard: [espieCard, ...state.discard],
        discardTop: espieCard,
        lastEvent: `${counterName} played Espie-NAH! — cancelling ${actorName}'s ${pending.action}!`,
      };
      s = updateHandCounts(s);
      return advanceTurn(s);
    }

    case 'SNEAK_PEAK_CHOOSE': {
      // Only the actor can choose
      const pending = state.pendingAction;
      if (!pending || pending.action !== 'SneakPeak') return state;
      if (pending.playerId !== playerId) return state;
      if (state.turnPhase !== 'sneakPeakChoose') return state;

      const { keepCardId, returnOrder } = action;
      const peekCards = (pending.payload as { peekCards: Card[] }).peekCards;

      const keepCard = peekCards.find(c => c.id === keepCardId);
      if (!keepCard) return state;

      // returnOrder is the ordered IDs of cards to put back on top of deck
      const returnCards = returnOrder
        .map(id => peekCards.find(c => c.id === id))
        .filter((c): c is Card => c !== undefined && c.id !== keepCardId);

      // Remove top 3 from deck (those were the peek cards), put back the returned ones
      const newDeck = [...returnCards, ...state.deck.slice(peekCards.length)];
      const newHand = [...(state.hands[playerId] ?? []), keepCard];
      const actorName = state.players.find(p => p.playerId === playerId)?.name ?? playerId;

      let s: FullGameState = {
        ...state,
        deck: newDeck,
        deckCount: newDeck.length,
        hands: { ...state.hands, [playerId]: newHand },
        pendingAction: null,
        lastEvent: `${actorName} kept a card from Sneak Peak.`,
      };
      s = updateHandCounts(s);
      return advanceTurn(s);
    }

    case 'SWAP_WITH_BOX': {
      if (!isCurrentPlayer || state.turnPhase !== 'play') return state;
      const { handCardId, boxIndex } = action;
      const hand = state.hands[playerId] ?? [];
      const boxCard = state.box[boxIndex];
      const [handCard, newHand] = removeCardById(hand, handCardId);
      if (!handCard || !boxCard) return state;

      const newBox = [...state.box];
      newBox[boxIndex] = handCard;
      const newHandWithBoxCard = [...newHand, boxCard];
      const actorName = currentPlayer.name;

      let s: FullGameState = {
        ...state,
        hands: { ...state.hands, [playerId]: newHandWithBoxCard },
        box: newBox,
        lastEvent: `${actorName} swapped a card with the box.`,
      };
      s = updateHandCounts(s);
      return advanceTurn(s);
    }

    case 'DISCARD_CARD': {
      // Used when player is over hand limit
      const hand = state.hands[playerId] ?? [];
      const [card, newHand] = removeCardById(hand, action.cardId);
      if (!card) return state;

      let s: FullGameState = {
        ...state,
        hands: { ...state.hands, [playerId]: newHand },
        discard: [card, ...state.discard],
        discardTop: card,
        lastEvent: `${state.players.find(p => p.playerId === playerId)?.name} discarded a card.`,
      };
      s = updateHandCounts(s);
      return s;
    }

    case 'SELECT_CHARACTER':
    case 'START_GAME':
      // Handled in App.tsx
      return state;

    default:
      return state;
  }
}

// ── getPublicState ─────────────────────────────────────────────────────────────

export function getPublicState(state: FullGameState): PublicGameState {
  return {
    phase: state.phase,
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    box: state.box,
    deckCount: state.deck.length,
    discardTop: state.discard.length > 0 ? state.discard[0] : null,
    turnPhase: state.turnPhase,
    pendingAction: state.pendingAction
      ? {
          ...state.pendingAction,
          // Don't expose SneakPeak cards in public state
          payload: state.pendingAction.action === 'SneakPeak' ? {} : state.pendingAction.payload,
        }
      : null,
    winnerId: state.winnerId,
    lastEvent: state.lastEvent,
  };
}

// ── getPrivateState ────────────────────────────────────────────────────────────

export function getPrivateState(
  state: FullGameState,
  playerId: string
): { hand: Card[]; code: CodeCard; vault: VaultSlot[]; sneakPeakCards?: Card[] } {
  const result: { hand: Card[]; code: CodeCard; vault: VaultSlot[]; sneakPeakCards?: Card[] } = {
    hand: state.hands[playerId] ?? [],
    code: state.codes[playerId] ?? { digits: [0, 0, 0] },
    vault: state.vaults[playerId] ?? [null, null, null],
  };

  // If there's a pending SneakPeak for this player, include the peek cards
  if (
    state.pendingAction?.action === 'SneakPeak' &&
    state.pendingAction.playerId === playerId &&
    state.turnPhase === 'sneakPeakChoose'
  ) {
    result.sneakPeakCards = (state.pendingAction.payload as { peekCards: Card[] }).peekCards;
  }

  return result;
}

// ── decrementCountdown ─────────────────────────────────────────────────────────

export function decrementCountdown(state: FullGameState): FullGameState {
  if (!state.pendingAction || state.turnPhase !== 'pendingAction') return state;
  const newCountdown = state.pendingAction.countdown - 1;
  return {
    ...state,
    pendingAction: { ...state.pendingAction, countdown: newCountdown },
  };
}
