import {
  FullGameState,
  PublicGameState,
  PrivatePlayerState,
  PlayerState,
  OtterState,
  TummyCard,
  RuleCard,
  OtterRule,
  GameAction,
} from './types';
import { buildDeck, shuffle, HEAD_CARDS, TAIL_CARDS } from './deck';

// ── Rule checking ─────────────────────────────────────────────────────────────

/**
 * Checks whether a rule is satisfied when playing `card` onto `otter`.
 * For advanced rules (inside/outside/shallow/deep), `allOtters` is used
 * to find the OTHER two otters.
 */
export function checkRule(
  rule: OtterRule,
  card: TummyCard,
  otter: OtterState,
  allOtters: OtterState[],
): boolean {
  const top = otter.tummy.length > 0 ? otter.tummy[otter.tummy.length - 1] : null;
  const topValue = top?.value ?? null;

  switch (rule) {
    case 'higher':
      return topValue !== null && card.value > topValue;
    case 'lower':
      return topValue !== null && card.value < topValue;
    case 'near':
      return topValue !== null && Math.abs(card.value - topValue) <= 2;
    case 'far':
      return topValue !== null && Math.abs(card.value - topValue) >= 3;
    case 'odd':
      return card.value % 2 !== 0;
    case 'even':
      return card.value % 2 === 0;
    case 'inside':
    case 'outside':
    case 'shallow':
    case 'deep': {
      // Advanced rules: compare against the OTHER two otters
      const others = allOtters.filter(o => o.index !== otter.index);
      if (others.length < 2) return false;
      const top1 = others[0].tummy.length > 0 ? others[0].tummy[others[0].tummy.length - 1] : null;
      const top2 = others[1].tummy.length > 0 ? others[1].tummy[others[1].tummy.length - 1] : null;
      if (top1 === null || top2 === null) return false;

      if (rule === 'inside') {
        const lo = Math.min(top1.value, top2.value);
        const hi = Math.max(top1.value, top2.value);
        return card.value > lo && card.value < hi;
      }
      if (rule === 'outside') {
        const lo = Math.min(top1.value, top2.value);
        const hi = Math.max(top1.value, top2.value);
        return card.value < lo || card.value > hi;
      }
      if (rule === 'shallow') {
        return card.value + top1.value + top2.value < 20;
      }
      if (rule === 'deep') {
        return card.value + top1.value + top2.value > 20;
      }
      return false;
    }
    default:
      return false;
  }
}

function getActiveRule(card: RuleCard): OtterRule {
  return card.showing === 'A' ? card.sideA : card.sideB;
}

// ── Deck helpers ──────────────────────────────────────────────────────────────

/**
 * Draws `count` cards from `deck`. If deck runs low, shuffles `discard` into a new deck.
 * Returns { drawn, deck, discard }.
 */
function drawCards(
  deck: TummyCard[],
  discard: TummyCard[],
  count: number,
): { drawn: TummyCard[]; deck: TummyCard[]; discard: TummyCard[] } {
  let d = [...deck];
  let disc = [...discard];
  const drawn: TummyCard[] = [];

  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break; // No cards left anywhere
      d = shuffle(disc);
      disc = [];
    }
    drawn.push(d.pop()!);
  }

  return { drawn, deck: d, discard: disc };
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
): FullGameState {
  // Pick 3 random head cards from the 5
  const shuffledHeads = shuffle(HEAD_CARDS);
  const chosenHeads = shuffledHeads.slice(0, 3);

  // All 3 tail cards used
  const shuffledTails = shuffle(TAIL_CARDS);

  // Build rule cards with random sides
  function makeRuleCard(base: Omit<RuleCard, 'showing'>): RuleCard {
    return { ...base, showing: Math.random() < 0.5 ? 'A' : 'B' };
  }

  // Build otters
  const otters: OtterState[] = chosenHeads.map((hc, i) => ({
    index: i,
    head: makeRuleCard(hc),
    tail: makeRuleCard(shuffledTails[i]),
    tummy: [],
  }));

  // Build and shuffle deck
  let deck = shuffle(buildDeck());
  let discard: TummyCard[] = [];

  // Place 1 face-up card on each otter's tummy pile
  for (const otter of otters) {
    const card = deck.pop()!;
    otter.tummy.push(card);
    discard.push(card);
  }

  // Deal 10 cards to each player
  const players: PlayerState[] = playerIds.map(pid => ({
    playerId: pid,
    name: playerNames[pid] ?? pid,
    hand: [],
    luckyStones: 0,
  }));

  for (const player of players) {
    const { drawn, deck: newDeck, discard: newDiscard } = drawCards(deck, discard, 10);
    player.hand = drawn;
    deck = newDeck;
    discard = newDiscard;
  }

  const winThreshold = playerIds.length === 2 ? 2 : 3;

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    turnPhase: 'high_tide',
    highTideUsed: false,
    otters,
    deck,
    discard,
    canContinueTurn: false,
    activeOtterIndex: null,
    mustPlayCount: 0,
    winnerId: null,
    winThreshold,
    log: ['Game started! Good luck, otters!'],
  };
}

// ── Turn helpers ──────────────────────────────────────────────────────────────

function advanceTurn(state: FullGameState): FullGameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnPhase: 'high_tide',
    highTideUsed: false,
    canContinueTurn: false,
    activeOtterIndex: null,
    mustPlayCount: 0,
  };
}

/**
 * Refills all players' hands back to 10 cards. If deck runs out, shuffle discard.
 */
function refillHands(state: FullGameState): FullGameState {
  let { deck, discard } = state;
  const players = state.players.map(p => ({ ...p, hand: [...p.hand] }));

  for (const player of players) {
    const needed = 10 - player.hand.length;
    if (needed > 0) {
      const { drawn, deck: newDeck, discard: newDiscard } = drawCards(deck, discard, needed);
      player.hand.push(...drawn);
      deck = newDeck;
      discard = newDiscard;
    }
  }

  return { ...state, players, deck, discard };
}

// ── Apply action ──────────────────────────────────────────────────────────────

export function applyAction(
  state: FullGameState,
  playerId: string,
  action: GameAction,
): FullGameState {
  if (action.type === 'START_GAME') {
    // Already started in initGame
    return state;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isCurrentPlayer = currentPlayer.playerId === playerId;

  // ── HIGH_TIDE_DRAW ───────────────────────────────────────────────────────────
  if (action.type === 'HIGH_TIDE_DRAW') {
    if (!isCurrentPlayer) throw new Error('Not your turn');
    if (state.highTideUsed) throw new Error('High tide already used this turn');

    const { count } = action;
    const { drawn, deck, discard } = drawCards(state.deck, state.discard, count);

    const players = state.players.map(p =>
      p.playerId === playerId
        ? { ...p, hand: [...p.hand, ...drawn] }
        : p
    );

    const playerName = currentPlayer.name;
    const logMsg = `${playerName} drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''} (High Tide).`;

    return {
      ...state,
      players,
      deck,
      discard,
      highTideUsed: true,
      turnPhase: 'high_tide',
      log: [...state.log, logMsg].slice(-50),
    };
  }

  // ── HIGH_TIDE_FLIP ───────────────────────────────────────────────────────────
  if (action.type === 'HIGH_TIDE_FLIP') {
    if (!isCurrentPlayer) throw new Error('Not your turn');
    if (state.highTideUsed) throw new Error('High tide already used this turn');

    const { target, otterIndex } = action;
    const otters = state.otters.map(o => {
      if (o.index !== otterIndex) return o;
      if (target === 'head') {
        const newShowing: 'A' | 'B' = o.head.showing === 'A' ? 'B' : 'A';
        return { ...o, head: { ...o.head, showing: newShowing } };
      } else {
        const newShowing: 'A' | 'B' = o.tail.showing === 'A' ? 'B' : 'A';
        return { ...o, tail: { ...o.tail, showing: newShowing } };
      }
    });

    const logMsg = `${currentPlayer.name} flipped otter ${otterIndex + 1}'s ${target} card.`;

    return {
      ...state,
      otters,
      highTideUsed: true,
      turnPhase: 'high_tide',
      log: [...state.log, logMsg].slice(-50),
    };
  }

  // ── HIGH_TIDE_SWAP ───────────────────────────────────────────────────────────
  if (action.type === 'HIGH_TIDE_SWAP') {
    if (!isCurrentPlayer) throw new Error('Not your turn');
    if (state.highTideUsed) throw new Error('High tide already used this turn');

    const { swapWhat, otterA, otterB } = action;
    if (otterA === otterB) throw new Error('Cannot swap with itself');

    const otters = state.otters.map(o => {
      if (swapWhat === 'heads') {
        if (o.index === otterA) return { ...o, head: state.otters[otterB].head };
        if (o.index === otterB) return { ...o, head: state.otters[otterA].head };
      } else {
        if (o.index === otterA) return { ...o, tail: state.otters[otterB].tail };
        if (o.index === otterB) return { ...o, tail: state.otters[otterA].tail };
      }
      return o;
    });

    const logMsg = `${currentPlayer.name} swapped ${swapWhat} between otters ${otterA + 1} and ${otterB + 1}.`;

    return {
      ...state,
      otters,
      highTideUsed: true,
      turnPhase: 'high_tide',
      log: [...state.log, logMsg].slice(-50),
    };
  }

  // ── PLAY_CARD ────────────────────────────────────────────────────────────────
  if (action.type === 'PLAY_CARD') {
    if (!isCurrentPlayer) throw new Error('Not your turn');

    const { cardId, otterIndex } = action;

    // If turn has already started on a specific otter, enforce same otter
    if (state.canContinueTurn && state.activeOtterIndex !== null && state.activeOtterIndex !== otterIndex) {
      throw new Error('Must continue playing on the same otter');
    }

    // Find card in hand
    const player = state.players[state.currentPlayerIndex];
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) throw new Error('Card not in hand');
    const card = player.hand[cardIdx];

    // Find otter
    const otter = state.otters.find(o => o.index === otterIndex);
    if (!otter) throw new Error('Otter not found');

    // Check rules
    const headRule = getActiveRule(otter.head);
    const tailRule = getActiveRule(otter.tail);
    const headFollows = checkRule(headRule, card, otter, state.otters);
    const tailFollows = checkRule(tailRule, card, otter, state.otters);

    if (!headFollows && !tailFollows) {
      throw new Error(`Card ${card.value} doesn't follow any rule (head: ${headRule}, tail: ${tailRule})`);
    }

    const bothFollow = headFollows && tailFollows;
    const newCanContinue = bothFollow;

    // Remove card from hand, push to tummy and discard
    const newHand = [...player.hand];
    newHand.splice(cardIdx, 1);

    const newOtters = state.otters.map(o => {
      if (o.index !== otterIndex) return o;
      return { ...o, tummy: [...o.tummy, card] };
    });

    const newDiscard = [...state.discard, card];
    const newMustPlayCount = state.mustPlayCount + 1;

    const ruleDesc = headFollows && tailFollows
      ? `both rules`
      : headFollows
        ? `head rule (${headRule})`
        : `tail rule (${tailRule})`;

    const logMsg = `${player.name} played ${card.value} (${card.suit}) on otter ${otterIndex + 1} — follows ${ruleDesc}.${bothFollow ? ' Can continue!' : ''}`;

    const updatedPlayers = state.players.map(p =>
      p.playerId === playerId ? { ...p, hand: newHand } : p
    );

    let newState: FullGameState = {
      ...state,
      players: updatedPlayers,
      otters: newOtters,
      discard: newDiscard,
      canContinueTurn: newCanContinue,
      activeOtterIndex: otterIndex,
      mustPlayCount: newMustPlayCount,
      turnPhase: 'low_tide',
      log: [...state.log, logMsg].slice(-50),
    };

    // Check if hand is empty
    if (newHand.length === 0) {
      // Check win condition
      const updatedPlayer = newState.players.find(p => p.playerId === playerId)!;

      if (updatedPlayer.luckyStones >= newState.winThreshold) {
        // They win!
        newState = {
          ...newState,
          phase: 'over',
          winnerId: playerId,
          log: [...newState.log, `${player.name} wins with ${updatedPlayer.luckyStones} Lucky Stones!`].slice(-50),
        };
        return newState;
      } else {
        // Give +1 Lucky Stone
        const newLuckyStones = updatedPlayer.luckyStones + 1;
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.playerId === playerId ? { ...p, luckyStones: newLuckyStones } : p
          ),
          log: [...newState.log, `${player.name} emptied their hand! +1 Lucky Stone (now ${newLuckyStones}). Refilling hands...`].slice(-50),
        };

        // Refill all hands
        newState = refillHands(newState);

        // Advance to next player
        newState = advanceTurn(newState);
        return newState;
      }
    }

    // If can't continue (only one rule followed), advance turn
    if (!newCanContinue) {
      newState = advanceTurn(newState);
    }

    return newState;
  }

  // ── END_TURN ─────────────────────────────────────────────────────────────────
  if (action.type === 'END_TURN') {
    if (!isCurrentPlayer) throw new Error('Not your turn');
    if (state.mustPlayCount < 1) throw new Error('Must play at least 1 card before ending turn');

    const logMsg = `${currentPlayer.name} ended their turn.`;
    const newState: FullGameState = {
      ...state,
      log: [...state.log, logMsg].slice(-50),
    };
    return advanceTurn(newState);
  }

  return state;
}

// ── State projections ─────────────────────────────────────────────────────────

export function getPublicState(state: FullGameState): PublicGameState {
  return {
    phase: state.phase,
    players: state.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      handCount: p.hand.length,
      luckyStones: p.luckyStones,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    turnPhase: state.turnPhase,
    highTideUsed: state.highTideUsed,
    otters: state.otters,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    canContinueTurn: state.canContinueTurn,
    activeOtterIndex: state.activeOtterIndex,
    mustPlayCount: state.mustPlayCount,
    winnerId: state.winnerId,
    winThreshold: state.winThreshold,
    log: state.log,
  };
}

export function getPrivateState(state: FullGameState, playerId: string): PrivatePlayerState {
  const player = state.players.find(p => p.playerId === playerId);
  return {
    hand: player?.hand ?? [],
  };
}
