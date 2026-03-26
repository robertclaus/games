import { FullGameState, GameAction, Card, PlacedCard, GridPosition, PublicGameState } from './types';
import { createDeck, shuffle } from './deck';

function startingHandSize(playerCount: number): number {
  if (playerCount === 2) return 7;
  if (playerCount === 3) return 6;
  return 5;
}

export function initGame(playerIds: string[], playerNames: Record<string, string>): FullGameState {
  const deck = shuffle(createDeck());
  const handSize = startingHandSize(playerIds.length);
  const hands: Record<string, Card[]> = {};
  let deckIndex = 0;

  for (const pid of playerIds) {
    hands[pid] = [];
    for (let i = 0; i < handSize; i++) {
      hands[pid].push(deck[deckIndex++]);
    }
  }

  return {
    phase: 'drawing',
    players: playerIds.map(pid => ({
      playerId: pid,
      name: playerNames[pid] || pid,
      arboretum: [],
      discardPile: [],
    })),
    currentPlayerIndex: 0,
    deckCount: deck.length - deckIndex,
    drawCount: 0,
    discardedThisTurn: false,
    playedThisTurn: false,
    deck: deck.slice(deckIndex),
    hands,
    hostPlayerId: playerIds[0],
  };
}

export function applyAction(state: FullGameState, playerId: string, action: GameAction): FullGameState {
  const s = structuredClone(state) as FullGameState;

  const currentPlayer = s.players[s.currentPlayerIndex];

  if (action.type === 'DRAW_FROM_DECK') {
    if (s.phase !== 'drawing' || s.drawCount >= 2 || currentPlayer.playerId !== playerId) return state;
    if (s.deck.length === 0) return state;
    const card = s.deck.shift()!;
    s.hands[playerId].push(card);
    s.drawCount++;
    s.deckCount = s.deck.length;
    // Advance to playing once 2 cards drawn, or immediately if deck is now empty
    // (prevents getting stuck in drawing phase with no cards left to draw)
    if (s.drawCount === 2 || s.deck.length === 0) s.phase = 'playing';
  }

  else if (action.type === 'DRAW_FROM_DISCARD') {
    if (s.phase !== 'drawing' || s.drawCount >= 2 || currentPlayer.playerId !== playerId) return state;
    const targetPlayer = s.players.find(p => p.playerId === action.targetPlayerId);
    if (!targetPlayer || targetPlayer.discardPile.length === 0) return state;
    const card = targetPlayer.discardPile.pop()!;
    s.hands[playerId].push(card);
    s.drawCount++;
    s.deckCount = s.deck.length;
    if (s.drawCount === 2) s.phase = 'playing';
  }

  else if (action.type === 'PLAY_CARD') {
    if (s.phase !== 'playing' || s.playedThisTurn || currentPlayer.playerId !== playerId) return state;
    const cardIndex = s.hands[playerId].findIndex(c => c.id === action.cardId);
    if (cardIndex === -1) return state;

    // Validate placement
    const isValid = isValidPlacement(currentPlayer.arboretum, action.position);
    if (!isValid) return state;

    const [card] = s.hands[playerId].splice(cardIndex, 1);
    const updatedPlayer = s.players.find(p => p.playerId === playerId)!;
    updatedPlayer.arboretum.push({ card, position: action.position });
    s.playedThisTurn = true;
    s.phase = 'discarding';
  }

  else if (action.type === 'DISCARD_CARD') {
    if (s.phase !== 'discarding' || s.discardedThisTurn || currentPlayer.playerId !== playerId) return state;
    const cardIndex = s.hands[playerId].findIndex(c => c.id === action.cardId);
    if (cardIndex === -1) return state;

    const [card] = s.hands[playerId].splice(cardIndex, 1);
    const updatedPlayer = s.players.find(p => p.playerId === playerId)!;
    updatedPlayer.discardPile.push(card);
    s.discardedThisTurn = true;

    // Check for end game
    if (s.deck.length === 0) {
      s.phase = 'ended';
    } else {
      // Next player's turn
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
      s.drawCount = 0;
      s.discardedThisTurn = false;
      s.playedThisTurn = false;
      s.phase = 'drawing';
    }
  }

  return s;
}

export function isValidPlacement(arboretum: PlacedCard[], position: GridPosition): boolean {
  if (arboretum.length === 0) return true; // First card can go anywhere

  const occupied = new Set(arboretum.map(p => `${p.position.row},${p.position.col}`));
  const posKey = `${position.row},${position.col}`;

  if (occupied.has(posKey)) return false; // Position already occupied

  const neighbors = [
    `${position.row - 1},${position.col}`,
    `${position.row + 1},${position.col}`,
    `${position.row},${position.col - 1}`,
    `${position.row},${position.col + 1}`,
  ];

  return neighbors.some(n => occupied.has(n));
}

export function getPublicState(state: FullGameState): PublicGameState {
  return {
    phase: state.phase,
    players: state.players.map(p => ({
      ...p,
      discardPile: p.discardPile,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    deckCount: state.deckCount,
    drawCount: state.drawCount,
    discardedThisTurn: state.discardedThisTurn,
    playedThisTurn: state.playedThisTurn,
    scores: state.scores,
  };
}
