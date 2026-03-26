import {
  FullGameState,
  PublicGameState,
  PrivatePlayerState,
  GameAction,
  LocationId,
  SurvivorInstance,
  PlayerState,
  CrossroadsTrigger,
  CrossroadsEffect,
  ItemCard,
  LogEntry,
  TurnSubPhase,
  GamePhase,
  ALL_LOCATIONS,
  EXTERNAL_LOCATIONS,
  LOCATION_NAMES,
} from './types';
import { SURVIVORS, CRISIS_CARDS, CROSSROADS_CARDS, OBJECTIVES, LOCATION_ITEM_DECKS, shuffle } from './content';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_SURVIVOR_WOUNDS = 3;
const MAX_BARRICADES_PER_LOCATION = 4;
const MAX_NOISE_PER_LOCATION = 3;
const MAX_ZOMBIES_BEFORE_OVERRUN = 8;
const STARTING_HAND_SIZE = 5;
const WASTE_MORALE_THRESHOLD = 10;

// ── Exposure Die ──────────────────────────────────────────────────────────────
// Faces: blank(3), wound(1), frostbite(1), bitten(1) — 6 faces total
export type ExposureResult = 'blank' | 'wound' | 'frostbite' | 'bitten';
export function rollExposureDie(): ExposureResult {
  const roll = Math.floor(Math.random() * 6);
  if (roll < 3) return 'blank';
  if (roll === 3) return 'wound';
  if (roll === 4) return 'frostbite';
  return 'bitten';
}

// ── Module-level equipped item registry ──────────────────────────────────────
// Items leave the hand when equipped; we need to look them up by id later.
const equippedItemRegistry = new Map<string, ItemCard>();
function registerEquippedItem(item: ItemCard): void {
  equippedItemRegistry.set(item.id, item);
}
function findItemById(id: string): ItemCard | undefined {
  const fromRegistry = equippedItemRegistry.get(id);
  if (fromRegistry) return fromRegistry;
  for (const deck of Object.values(LOCATION_ITEM_DECKS)) {
    const found = (deck as ItemCard[]).find(c => c.id === id);
    if (found) return found;
  }
  return undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function addLog(s: FullGameState, text: string, type: LogEntry['type']): void {
  s.log.push({ round: s.round, text, type });
  if (s.log.length > 100) s.log.shift();
}

function getSurvivorName(surv: SurvivorInstance): string {
  return SURVIVORS.find(sc => sc.id === surv.cardId)?.name ?? surv.cardId;
}

function checkMoraleGameOver(s: FullGameState): boolean {
  return s.morale <= 0;
}

function checkGameOver(s: FullGameState): FullGameState {
  if (s.morale <= 0) return finalizeGameOver(s, 'Colony morale reached zero.');
  return s;
}

// ── Init Game ─────────────────────────────────────────────────────────────────
export function initGame(
  playerIds: string[],
  playerNames: Record<string, string>,
): FullGameState {
  const survivorPool = shuffle([...SURVIVORS]);
  const survivors: Record<string, SurvivorInstance> = {};

  // Build starting item pool from all location decks
  const startingItemPool: ItemCard[] = shuffle(
    Object.values(LOCATION_ITEM_DECKS).flat() as ItemCard[]
  );

  // Prepare objectives
  const normalObjs = shuffle(OBJECTIVES.filter(o => o.type === 'normal'));
  const betrayerObjs = shuffle(OBJECTIVES.filter(o => o.type === 'betrayer'));

  // 1 betrayer mixed in with normals
  const objectivePool = shuffle([
    ...normalObjs.slice(0, Math.max(0, playerIds.length - 1)),
    betrayerObjs[0],
  ]);

  let itemPoolIndex = 0;
  let survivorPoolIndex = 0;

  const players: PlayerState[] = playerIds.map((pid, i) => {
    const s1 = survivorPool[survivorPoolIndex++];
    const s2 = survivorPool[survivorPoolIndex++];

    const id1 = `${s1.id}_${pid}`;
    const id2 = `${s2.id}_${pid}`;

    survivors[id1] = {
      cardId: s1.id, ownerId: pid, wounds: 0, frostbiteWounds: 0,
      location: 'colony', equippedItemId: null, isLeader: true,
      hasUsedFreeAbilityThisTurn: false, noExposureUsed: false, killCount: 0,
    };
    survivors[id2] = {
      cardId: s2.id, ownerId: pid, wounds: 0, frostbiteWounds: 0,
      location: 'colony', equippedItemId: null, isLeader: false,
      hasUsedFreeAbilityThisTurn: false, noExposureUsed: false, killCount: 0,
    };

    const hand: ItemCard[] = [];
    for (let h = 0; h < STARTING_HAND_SIZE; h++) {
      if (itemPoolIndex < startingItemPool.length) {
        hand.push(startingItemPool[itemPoolIndex++]);
      }
    }

    const obj = objectivePool[i] ?? normalObjs[i] ?? normalObjs[0];

    return {
      playerId: pid,
      name: playerNames[pid] ?? pid,
      survivorIds: [id1, id2],
      hand,
      actionDice: [],
      diceSpent: [],
      isExiled: false,
      hasTakenTurn: false,
      hasContributedToCrisis: false,
      secretObjectiveId: obj.id,
      exiledObjectiveId: null,
      preventedCrisisCount: 0,
      hasInitiatedExileThisRound: false,
    };
  });

  // Build location states
  const locations: Record<string, unknown> = {};
  for (const locId of ALL_LOCATIONS) {
    const deck = LOCATION_ITEM_DECKS[locId as LocationId];
    locations[locId] = {
      id: locId,
      zombies: 0,
      barricades: 0,
      maxBarricades: MAX_BARRICADES_PER_LOCATION,
      noiseTokens: 0,
      maxNoise: MAX_NOISE_PER_LOCATION,
      itemDeck: shuffle([...(deck ?? [])]),
      discardPile: [],
    };
  }

  // Starter scenario: "First Winter"
  (locations['police_station'] as { zombies: number }).zombies = 2;
  (locations['grocery_store'] as { zombies: number }).zombies = 2;
  (locations['school'] as { zombies: number }).zombies = 1;

  const crisisDeck = shuffle([...CRISIS_CARDS]);
  const crossroadsDeck = shuffle([...CROSSROADS_CARDS]);

  const state: FullGameState = {
    phase: 'player_turns' as GamePhase,
    turnSubPhase: 'rolling' as TurnSubPhase,
    round: 1,
    maxRounds: 6,
    scenarioName: 'First Winter',
    morale: 8,
    maxMorale: 8,
    food: 5,
    wasteCount: 0,
    starvationTokens: 0,
    players,
    currentPlayerIndex: 0,
    survivors,
    locations: locations as FullGameState['locations'],
    crisisDeck,
    currentCrisis: crisisDeck[0] ?? null,
    crisisPool: [],
    crossroadsDeck,
    currentCrossroadsCard: crossroadsDeck[0] ?? null,
    activeCrossroads: null,
    activeExileVote: null,
    pendingSearch: null,
    gameOverReason: null,
    winners: [],
    losers: [],
    log: [{ round: 1, text: 'Game started: First Winter scenario. Survive 6 rounds!', type: 'info' }],
  };

  return state;
}

// ── Apply Action ──────────────────────────────────────────────────────────────
export function applyAction(
  state: FullGameState,
  playerId: string,
  action: GameAction,
): FullGameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.playerId === playerId);
  if (!player) return state;

  switch (action.type) {
    case 'ROLL_DICE':           return handleRollDice(s, player);
    case 'MOVE_SURVIVOR':       return handleMoveSurvivor(s, player, action.survivorId, action.targetLocation);
    case 'ATTACK_ZOMBIE':       return handleAttackZombie(s, player, action.survivorId, action.dieIndex);
    case 'SEARCH':              return handleSearch(s, player, action.survivorId, action.dieIndex);
    case 'SEARCH_DECIDE':       return handleSearchDecide(s, player, action.keepCardIndex);
    case 'BARRICADE':           return handleBarricade(s, player, action.survivorId, action.dieIndex);
    case 'CLEAN_WASTE':         return handleCleanWaste(s, player, action.survivorId, action.dieIndex);
    case 'PLAY_ITEM':           return handlePlayItem(s, player, action.cardId, action.targetSurvivorId, action.targetDieIndex);
    case 'EQUIP_ITEM':          return handleEquipItem(s, player, action.cardId, action.survivorId);
    case 'CONTRIBUTE_TO_CRISIS':return handleContributeToCrisis(s, player, action.cardId);
    case 'END_TURN':            return handleEndTurn(s, player);
    case 'CROSSROADS_VOTE':     return handleCrossroadsVote(s, player, action.optionIndex);
    case 'INITIATE_EXILE':      return handleInitiateExile(s, player, action.targetPlayerId);
    case 'EXILE_VOTE':          return handleExileVote(s, player, action.vote);
    default:                    return state;
  }
}

// ── Roll Dice ─────────────────────────────────────────────────────────────────
function handleRollDice(s: FullGameState, player: PlayerState): FullGameState {
  if (s.turnSubPhase !== 'rolling') return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;

  // Apply frostbite damage at start of turn
  for (const sid of player.survivorIds) {
    const surv = s.survivors[sid];
    if (surv && surv.frostbiteWounds > 0 && surv.wounds < MAX_SURVIVOR_WOUNDS) {
      surv.wounds += surv.frostbiteWounds;
      addLog(s, `${getSurvivorName(surv)} suffers ${surv.frostbiteWounds} frostbite wound(s).`, 'danger');
      if (surv.wounds >= MAX_SURVIVOR_WOUNDS) {
        killSurvivor(s, sid);
      }
    }
  }

  if (checkMoraleGameOver(s)) return finalizeGameOver(s, 'Colony morale collapsed.');

  // Count dice: 1 base + 1 per alive survivor; extra_die ability adds 1 more
  const aliveSurvivorIds = player.survivorIds.filter(
    sid => s.survivors[sid] && s.survivors[sid].wounds < MAX_SURVIVOR_WOUNDS
  );
  const hasExtraDie = aliveSurvivorIds.some(
    sid => SURVIVORS.find(sv => sv.id === s.survivors[sid].cardId)?.abilityType === 'extra_die'
  );
  const diceCount = 1 + aliveSurvivorIds.length + (hasExtraDie ? 1 : 0);

  const dice: number[] = Array.from({ length: diceCount }, () => Math.ceil(Math.random() * 6));
  player.actionDice = dice;
  player.diceSpent = new Array(dice.length).fill(false) as boolean[];
  s.turnSubPhase = 'acting';

  // Reset per-turn flags
  for (const sid of player.survivorIds) {
    if (s.survivors[sid]) {
      s.survivors[sid].hasUsedFreeAbilityThisTurn = false;
    }
  }

  addLog(s, `${player.name} rolled: [${dice.join(', ')}]`, 'info');

  // Draw crossroads card for this turn
  if (s.crossroadsDeck.length > 0) {
    s.currentCrossroadsCard = s.crossroadsDeck.shift()!;
  }

  return s;
}

// ── Move Survivor ─────────────────────────────────────────────────────────────
function handleMoveSurvivor(
  s: FullGameState,
  player: PlayerState,
  survivorId: string,
  target: LocationId,
): FullGameState {
  if (s.turnSubPhase !== 'acting') return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;

  const surv = s.survivors[survivorId];
  if (!surv || surv.ownerId !== player.playerId) return s;
  if (surv.wounds >= MAX_SURVIVOR_WOUNDS) return s;
  if (surv.location === target) return s;

  const fromLocation = surv.location;
  surv.location = target;
  addLog(s, `${getSurvivorName(surv)} moved from ${LOCATION_NAMES[fromLocation]} to ${LOCATION_NAMES[target]}.`, 'info');

  // Exposure roll on move
  const exposure = rollExposureDie();
  applyExposureResult(s, survivorId, exposure);
  if (exposure !== 'blank') addLog(s, `Exposure roll on move: ${exposure}!`, 'danger');

  // Check crossroads trigger
  s = checkCrossroadsTrigger(s, { type: 'survivor_moves_to', location: target });

  return checkGameOver(s);
}

// ── Attack Zombie ─────────────────────────────────────────────────────────────
function handleAttackZombie(
  s: FullGameState,
  player: PlayerState,
  survivorId: string,
  dieIndex: number,
): FullGameState {
  if (s.turnSubPhase !== 'acting') return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;
  if (player.diceSpent[dieIndex]) return s;

  const surv = s.survivors[survivorId];
  if (!surv || surv.ownerId !== player.playerId || surv.wounds >= MAX_SURVIVOR_WOUNDS) return s;

  const loc = s.locations[surv.location];
  if (!loc || loc.zombies === 0) return s;

  const survivorCard = SURVIVORS.find(sc => sc.id === surv.cardId)!;
  let threshold = survivorCard.attack;

  if (survivorCard.abilityType === 'attack_bonus') threshold -= 1;
  if (surv.equippedItemId) {
    const equippedItem = findItemById(surv.equippedItemId);
    if (equippedItem?.equipEffect?.attackBonus) {
      threshold -= equippedItem.equipEffect.attackBonus;
    }
  }
  threshold = Math.max(1, threshold);

  const dieValue = player.actionDice[dieIndex];

  // Always spend the die
  player.diceSpent[dieIndex] = true;

  if (dieValue < threshold) {
    addLog(s, `${getSurvivorName(surv)} attacked (needs ${threshold}, rolled ${dieValue}) — missed!`, 'warning');
    return s;
  }

  // Determine kills
  let kills = 1;
  if (survivorCard.abilityType === 'double_kill_on_high' && dieValue >= 5) kills = 2;
  kills = Math.min(kills, loc.zombies);
  loc.zombies -= kills;
  surv.killCount += kills;

  addLog(s, `${getSurvivorName(surv)} killed ${kills} zombie(s) at ${LOCATION_NAMES[surv.location]}.`, 'success');

  // Determine if exposure is skipped
  const isFirstKillThisTurn = !player.survivorIds.some(sid => {
    if (sid === survivorId) return false;
    const sv = s.survivors[sid];
    return sv && sv.killCount > 0;
  });

  const abilitySaysNoExposure =
    survivorCard.abilityType === 'no_exposure_first_attack' &&
    isFirstKillThisTurn &&
    !surv.hasUsedFreeAbilityThisTurn;

  const weaponSaysNoExposure =
    !!surv.equippedItemId &&
    !surv.noExposureUsed &&
    !!(findItemById(surv.equippedItemId)?.equipEffect?.noExposureOnce);

  if (abilitySaysNoExposure) {
    surv.hasUsedFreeAbilityThisTurn = true;
    addLog(s, `${getSurvivorName(surv)}'s ability prevented exposure roll.`, 'info');
  } else if (weaponSaysNoExposure) {
    surv.noExposureUsed = true;
    addLog(s, `${getSurvivorName(surv)}'s weapon prevented exposure roll (once).`, 'info');
  } else {
    const exposure = rollExposureDie();
    applyExposureResult(s, survivorId, exposure);
    if (exposure !== 'blank') addLog(s, `Exposure after attack: ${exposure}!`, 'danger');
  }

  s = checkCrossroadsTrigger(s, { type: 'zombie_killed' });

  return checkGameOver(s);
}

// ── Search ────────────────────────────────────────────────────────────────────
function handleSearch(
  s: FullGameState,
  player: PlayerState,
  survivorId: string,
  dieIndex: number,
): FullGameState {
  if (s.turnSubPhase !== 'acting') return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;
  if (player.diceSpent[dieIndex]) return s;
  if (s.pendingSearch) return s;

  const surv = s.survivors[survivorId];
  if (!surv || surv.ownerId !== player.playerId || surv.wounds >= MAX_SURVIVOR_WOUNDS) return s;
  if (surv.location === 'colony') return s;

  const loc = s.locations[surv.location];
  if (!loc || loc.itemDeck.length === 0) {
    addLog(s, `No items left to search at ${LOCATION_NAMES[surv.location]}.`, 'warning');
    return s;
  }

  const survivorCard = SURVIVORS.find(sc => sc.id === surv.cardId)!;
  let threshold = survivorCard.search;
  if (survivorCard.abilityType === 'search_bonus') threshold -= 1;
  threshold = Math.max(1, threshold);

  const dieValue = player.actionDice[dieIndex];
  player.diceSpent[dieIndex] = true;

  if (dieValue < threshold) {
    addLog(s, `${getSurvivorName(surv)} searched (needs ${threshold}, rolled ${dieValue}) — nothing found.`, 'warning');
    return s;
  }

  const drawnCard = loc.itemDeck.shift()!;
  addLog(s, `${getSurvivorName(surv)} found an item at ${LOCATION_NAMES[surv.location]}.`, 'success');

  s.pendingSearch = {
    survivorId,
    location: surv.location,
    drawnCards: [drawnCard],
    noiseTokensAdded: 0,
  };

  s = checkCrossroadsTrigger(s, { type: 'search_at_location', location: surv.location });

  return s;
}

// ── Search Decide ─────────────────────────────────────────────────────────────
function handleSearchDecide(
  s: FullGameState,
  player: PlayerState,
  keepCardIndex: number | null,
): FullGameState {
  if (!s.pendingSearch) return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;

  const ps = s.pendingSearch;
  const loc = s.locations[ps.location];

  if (keepCardIndex !== null) {
    const kept = ps.drawnCards[keepCardIndex];
    if (!kept) return s;
    player.hand.push(kept);
    // Return other drawn cards to bottom of location deck
    ps.drawnCards.forEach((c, i) => {
      if (i !== keepCardIndex) loc.itemDeck.push(c);
    });
    addLog(s, `${player.name} kept ${kept.name}.`, 'success');
    s.pendingSearch = null;
  } else {
    // Make noise: add noise token and draw another card
    if (loc.noiseTokens >= loc.maxNoise || loc.itemDeck.length === 0) {
      addLog(s, `Can't make more noise — must keep a card.`, 'warning');
      return s;
    }
    loc.noiseTokens += 1;
    ps.noiseTokensAdded += 1;
    const nextCard = loc.itemDeck.shift()!;
    ps.drawnCards.push(nextCard);
    addLog(s, `Noise made at ${LOCATION_NAMES[ps.location]}. Drew another card.`, 'warning');
  }

  return s;
}

// ── Barricade ─────────────────────────────────────────────────────────────────
function handleBarricade(
  s: FullGameState,
  player: PlayerState,
  survivorId: string,
  dieIndex: number | null,
): FullGameState {
  if (s.turnSubPhase !== 'acting') return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;

  const surv = s.survivors[survivorId];
  if (!surv || surv.ownerId !== player.playerId || surv.wounds >= MAX_SURVIVOR_WOUNDS) return s;

  const loc = s.locations[surv.location];
  if (!loc || loc.barricades >= loc.maxBarricades) {
    addLog(s, `${LOCATION_NAMES[surv.location]} already has max barricades.`, 'warning');
    return s;
  }

  const survivorCard = SURVIVORS.find(sc => sc.id === surv.cardId)!;
  const hasFreeBarricade =
    survivorCard.abilityType === 'free_barricade' && !surv.hasUsedFreeAbilityThisTurn;

  if (dieIndex === null) {
    if (!hasFreeBarricade) return s;
    surv.hasUsedFreeAbilityThisTurn = true;
  } else {
    if (player.diceSpent[dieIndex]) return s;
    player.diceSpent[dieIndex] = true;
  }

  loc.barricades += 1;
  addLog(s, `Barricade placed at ${LOCATION_NAMES[surv.location]}.`, 'success');
  return s;
}

// ── Clean Waste ───────────────────────────────────────────────────────────────
function handleCleanWaste(
  s: FullGameState,
  player: PlayerState,
  survivorId: string,
  dieIndex: number,
): FullGameState {
  if (s.turnSubPhase !== 'acting') return s;
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;
  if (player.diceSpent[dieIndex]) return s;

  const surv = s.survivors[survivorId];
  if (!surv || surv.ownerId !== player.playerId || surv.wounds >= MAX_SURVIVOR_WOUNDS) return s;

  player.diceSpent[dieIndex] = true;
  const removed = Math.min(3, s.wasteCount);
  s.wasteCount -= removed;
  addLog(s, `Waste cleaned: removed ${removed} waste card(s).`, 'success');
  return s;
}

// ── Play Item ─────────────────────────────────────────────────────────────────
function handlePlayItem(
  s: FullGameState,
  player: PlayerState,
  cardId: string,
  targetSurvivorId?: string,
  targetDieIndex?: number,
): FullGameState {
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return s;

  const card = player.hand[cardIndex];
  if (!card.playEffect) return s;

  player.hand.splice(cardIndex, 1);
  s.wasteCount += 1;

  const effect = card.playEffect;

  if (effect.foodTokens) {
    s.food += effect.foodTokens;
    addLog(s, `${player.name} played ${card.name}: +${effect.foodTokens} food.`, 'success');
  }

  if (effect.healWounds && targetSurvivorId) {
    const surv = s.survivors[targetSurvivorId];
    if (surv) {
      const survivorCard = SURVIVORS.find(sc => sc.id === surv.cardId);
      const hasHealBonus = survivorCard?.abilityType === 'heal_bonus';
      const healed = effect.healWounds + (hasHealBonus ? 1 : 0);
      surv.wounds = Math.max(0, surv.wounds - healed);
      addLog(s, `${getSurvivorName(surv)} healed ${healed} wound(s).`, 'success');
    }
  }

  if (effect.dieBonusOnce !== undefined && targetDieIndex !== undefined) {
    if (!player.diceSpent[targetDieIndex]) {
      player.actionDice[targetDieIndex] = Math.min(6, player.actionDice[targetDieIndex] + effect.dieBonusOnce);
      addLog(s, `${player.name} used ${card.name}: die boosted to ${player.actionDice[targetDieIndex]}.`, 'info');
    }
  }

  if (effect.placeBrricades && targetSurvivorId) {
    const surv = s.survivors[targetSurvivorId];
    if (surv) {
      const loc = s.locations[surv.location];
      const placed = Math.min(effect.placeBrricades, loc.maxBarricades - loc.barricades);
      loc.barricades += placed;
      addLog(s, `${player.name} placed ${placed} barricade(s) at ${LOCATION_NAMES[surv.location]}.`, 'success');
    }
  }

  if (effect.cleanWaste) {
    s.wasteCount = Math.max(0, s.wasteCount - effect.cleanWaste);
    addLog(s, `${player.name} cleaned ${effect.cleanWaste} waste cards.`, 'success');
  }

  // viewOpponentHand is a host-side concern (sends private message); no state mutation here.

  return s;
}

// ── Equip Item ────────────────────────────────────────────────────────────────
function handleEquipItem(
  s: FullGameState,
  player: PlayerState,
  cardId: string,
  survivorId: string,
): FullGameState {
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return s;

  const card = player.hand[cardIndex];
  if (card.type !== 'weapon' || !card.equipEffect) return s;

  const surv = s.survivors[survivorId];
  if (!surv || surv.ownerId !== player.playerId || surv.wounds >= MAX_SURVIVOR_WOUNDS) return s;

  // Unequip existing weapon — goes to waste
  if (surv.equippedItemId) {
    s.wasteCount += 1;
    addLog(s, `${getSurvivorName(surv)} unequipped previous weapon.`, 'info');
  }

  player.hand.splice(cardIndex, 1);
  surv.equippedItemId = card.id;
  registerEquippedItem(card);

  addLog(s, `${getSurvivorName(surv)} equipped ${card.name}.`, 'success');
  return s;
}

// ── Contribute to Crisis ──────────────────────────────────────────────────────
function handleContributeToCrisis(
  s: FullGameState,
  player: PlayerState,
  cardId: string,
): FullGameState {
  if (s.phase !== 'player_turns') return s;

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return s;

  const card = player.hand[cardIndex];
  player.hand.splice(cardIndex, 1);

  s.crisisPool.push({ playerId: player.playerId, cardId: card.id, itemType: card.type });
  player.hasContributedToCrisis = true;
  addLog(s, `${player.name} contributed a card to the crisis pool.`, 'info');
  return s;
}

// ── End Turn ──────────────────────────────────────────────────────────────────
function handleEndTurn(s: FullGameState, player: PlayerState): FullGameState {
  if (s.players[s.currentPlayerIndex].playerId !== player.playerId) return s;
  if (s.pendingSearch) return s;

  // Return unused crossroads card to bottom of deck
  if (s.currentCrossroadsCard) {
    s.crossroadsDeck.push(s.currentCrossroadsCard);
    s.currentCrossroadsCard = null;
  }

  player.hasTakenTurn = true;
  addLog(s, `${player.name} ended their turn.`, 'info');

  const activePlayers = s.players.filter(p => !p.isExiled);
  if (activePlayers.every(p => p.hasTakenTurn)) {
    return startColonyPhase(s);
  }

  // Advance to next player
  let nextIndex = (s.currentPlayerIndex + 1) % s.players.length;
  let safety = 0;
  while (
    (s.players[nextIndex].hasTakenTurn || s.players[nextIndex].isExiled) &&
    safety < s.players.length
  ) {
    nextIndex = (nextIndex + 1) % s.players.length;
    safety++;
  }
  s.currentPlayerIndex = nextIndex;
  s.turnSubPhase = 'rolling';

  return s;
}

// ── Colony Phase ──────────────────────────────────────────────────────────────
function startColonyPhase(s: FullGameState): FullGameState {
  s.phase = 'colony_phase';
  addLog(s, `=== Colony Phase: Round ${s.round} ===`, 'info');

  s = checkCrossroadsTrigger(s, { type: 'colony_phase_begins' });

  // 1. Pay food
  const survivorsAtColony = Object.values(s.survivors).filter(
    sv => sv.location === 'colony' && sv.wounds < MAX_SURVIVOR_WOUNDS
  ).length;
  const foodNeeded = Math.ceil(survivorsAtColony / 2);

  if (s.food >= foodNeeded) {
    s.food -= foodNeeded;
    addLog(s, `Colony ate: ${foodNeeded} food consumed. ${s.food} remaining.`, 'info');
  } else {
    const deficit = foodNeeded - s.food;
    s.food = 0;
    s.starvationTokens += deficit;
    s.morale = Math.max(0, s.morale - deficit);
    addLog(s, `Starvation! Not enough food — morale -${deficit}.`, 'danger');
    s = checkCrossroadsTrigger(s, { type: 'starvation_occurs' });
    if (checkMoraleGameOver(s)) return finalizeGameOver(s, 'Colony starved to death.');
  }

  // 2. Waste penalty
  const wastePenalty = Math.floor(s.wasteCount / WASTE_MORALE_THRESHOLD);
  if (wastePenalty > 0) {
    s.morale = Math.max(0, s.morale - wastePenalty);
    addLog(s, `Waste pile too large (${s.wasteCount} cards): morale -${wastePenalty}.`, 'warning');
    if (checkMoraleGameOver(s)) return finalizeGameOver(s, 'Waste overwhelmed the colony.');
  }

  // 3. Resolve crisis
  s = resolveCrisis(s);
  if (s.phase === 'game_over') return s;

  // 4. Spawn zombies
  for (const locId of ALL_LOCATIONS) {
    const loc = s.locations[locId];
    const survivorsHere = Object.values(s.survivors).filter(
      sv => sv.location === locId && sv.wounds < MAX_SURVIVOR_WOUNDS
    ).length;
    if (survivorsHere === 0) continue;

    const zombiesToAdd = Math.ceil(survivorsHere / 2);

    for (let z = 0; z < zombiesToAdd; z++) {
      if (loc.zombies >= MAX_ZOMBIES_BEFORE_OVERRUN) {
        if (loc.barricades > 0) {
          loc.barricades -= 1;
          s.wasteCount += 1;
          addLog(s, `Barricade destroyed at ${LOCATION_NAMES[locId as LocationId]}!`, 'danger');
          s = checkCrossroadsTrigger(s, { type: 'barricade_destroyed' });
        } else {
          s = overrunLocation(s, locId as LocationId);
          if (checkMoraleGameOver(s)) return finalizeGameOver(s, 'Zombies overran the colony.');
        }
      } else {
        loc.zombies += 1;
      }
    }

    s = checkCrossroadsTrigger(s, { type: 'location_reaches_zombie_count', location: locId as LocationId, count: loc.zombies });
  }

  // 5. Check if game is won (survived all rounds)
  if (s.round >= s.maxRounds) {
    return finalizeGame(s);
  }

  // 6. Advance round
  s.round += 1;
  addLog(s, `Round ${s.round} begins.`, 'info');

  s.players.forEach(p => {
    p.hasTakenTurn = false;
    p.hasContributedToCrisis = false;
    p.hasInitiatedExileThisRound = false;
  });

  if (s.crisisDeck.length > 0) {
    const nextCrisis = s.crisisDeck.shift()!;
    s.currentCrisis = nextCrisis;
    addLog(s, `Crisis: "${nextCrisis.title}". Required: ${nextCrisis.requiredType}.`, 'warning');
  } else {
    s.currentCrisis = null;
  }

  s.phase = 'player_turns';
  s.turnSubPhase = 'rolling';
  s.currentPlayerIndex = s.players.findIndex(p => !p.isExiled);
  if (s.currentPlayerIndex === -1) s.currentPlayerIndex = 0;

  s = checkCrossroadsTrigger(s, { type: 'round_begins', round: s.round });

  return s;
}

// ── Crisis Resolution ─────────────────────────────────────────────────────────
function resolveCrisis(s: FullGameState): FullGameState {
  if (!s.currentCrisis) return s;

  const crisis = s.currentCrisis;
  const pool = s.crisisPool;
  const numPlayers = s.players.length;

  let score = 0;
  for (const contrib of pool) {
    score += contrib.itemType === crisis.requiredType ? 1 : -1;
  }

  addLog(s, `Crisis "${crisis.title}": pool ${pool.length} cards, score ${score} (need ${numPlayers}).`, 'info');

  if (score >= numPlayers) {
    if (score >= numPlayers + 2) {
      s.morale = Math.min(s.maxMorale, s.morale + 1);
      addLog(s, `Crisis prevented with bonus! Morale +1.`, 'success');
    } else {
      addLog(s, `Crisis prevented!`, 'success');
    }
    for (const contrib of pool) {
      const p = s.players.find(pl => pl.playerId === contrib.playerId);
      if (p) p.preventedCrisisCount += 1;
    }
    s = checkCrossroadsTrigger(s, { type: 'crisis_prevented' });
  } else {
    addLog(s, `Crisis failed! ${crisis.failEffect}`, 'danger');
    const effect = crisis.failGameEffect;

    if (effect.morale) {
      s.morale = Math.max(0, s.morale + effect.morale); // morale is negative in failGameEffect
    }
    if (effect.removeFood) {
      s.food = Math.max(0, s.food - effect.removeFood);
    }
    if (effect.addZombies) {
      s.locations[effect.addZombies.location].zombies += effect.addZombies.count;
    }
    if (effect.woundSurvivorsAtColony) {
      const atColony = Object.entries(s.survivors)
        .filter(([, sv]) => sv.location === 'colony' && sv.wounds < MAX_SURVIVOR_WOUNDS)
        .slice(0, effect.woundSurvivorsAtColony);
      for (const [sid, sv] of atColony) {
        sv.wounds += 1;
        if (sv.wounds >= MAX_SURVIVOR_WOUNDS) killSurvivor(s, sid);
      }
    }
    if (effect.frostbiteAllSurvivors) {
      for (const sv of Object.values(s.survivors)) {
        if (sv.wounds < MAX_SURVIVOR_WOUNDS) sv.frostbiteWounds += 1;
      }
      addLog(s, 'All survivors gained 1 frostbite wound.', 'danger');
    }
    if (checkMoraleGameOver(s)) return finalizeGameOver(s, 'Colony morale collapsed after crisis.');
  }

  s.wasteCount += pool.length;
  s.crisisPool = [];

  return s;
}

// ── Crossroads ────────────────────────────────────────────────────────────────
function checkCrossroadsTrigger(s: FullGameState, event: CrossroadsTrigger): FullGameState {
  if (!s.currentCrossroadsCard || s.activeCrossroads) return s;

  const card = s.currentCrossroadsCard;
  if (triggerMatches(card.trigger, event)) {
    s.activeCrossroads = { card, votes: {}, resolved: false };
    s.turnSubPhase = 'crossroads';
    addLog(s, `Crossroads triggered: "${card.title}"!`, 'warning');
  }
  return s;
}

function triggerMatches(trigger: CrossroadsTrigger, event: CrossroadsTrigger): boolean {
  if (trigger.type !== event.type) return false;
  if (trigger.location && trigger.location !== event.location) return false;
  if (trigger.count !== undefined && event.count !== undefined && event.count < trigger.count) return false;
  if (trigger.round !== undefined && trigger.round !== event.round) return false;
  if (trigger.moraleThreshold !== undefined && event.moraleThreshold !== undefined && event.moraleThreshold > trigger.moraleThreshold) return false;
  return true;
}

function handleCrossroadsVote(
  s: FullGameState,
  player: PlayerState,
  optionIndex: 0 | 1,
): FullGameState {
  if (!s.activeCrossroads || s.turnSubPhase !== 'crossroads') return s;

  s.activeCrossroads.votes[player.playerId] = optionIndex;

  const activePlayers = s.players.filter(p => !p.isExiled);
  const allVoted = activePlayers.every(p => s.activeCrossroads!.votes[p.playerId] !== undefined);

  if (allVoted) {
    const votes0 = Object.values(s.activeCrossroads.votes).filter(v => v === 0).length;
    const votes1 = Object.values(s.activeCrossroads.votes).filter(v => v === 1).length;
    const chosenIndex: 0 | 1 = votes1 > votes0 ? 1 : 0;
    const chosen = s.activeCrossroads.card.options[chosenIndex];

    addLog(s, `Crossroads resolved: "${chosen.label}". ${chosen.description}`, 'info');
    s = applyCrossroadsEffect(s, chosen.effect);

    if (s.activeCrossroads) s.activeCrossroads.resolved = true;
    s.activeCrossroads = null;
    s.currentCrossroadsCard = null;

    // Restore sub-phase
    const currentPlayer = s.players[s.currentPlayerIndex];
    s.turnSubPhase = currentPlayer.hasTakenTurn ? 'done' : 'acting';
  }

  return checkGameOver(s);
}

function applyCrossroadsEffect(s: FullGameState, effect: CrossroadsEffect): FullGameState {
  const currentPlayer = s.players[s.currentPlayerIndex];

  if (effect.morale !== undefined) {
    s.morale = Math.min(s.maxMorale, Math.max(0, s.morale + effect.morale));
    if (checkMoraleGameOver(s)) return finalizeGameOver(s, 'Crossroads event ended the colony.');
  }
  if (effect.addFood) s.food += effect.addFood;
  if (effect.removeFood) s.food = Math.max(0, s.food - effect.removeFood);

  if (effect.healCurrentPlayerSurvivor) {
    const target = currentPlayer.survivorIds
      .map(id => s.survivors[id])
      .find(sv => sv && sv.wounds > 0 && sv.wounds < MAX_SURVIVOR_WOUNDS);
    if (target) target.wounds = Math.max(0, target.wounds - effect.healCurrentPlayerSurvivor);
  }

  if (effect.woundCurrentPlayerSurvivor) {
    const target = currentPlayer.survivorIds
      .map(id => s.survivors[id])
      .find(sv => sv && sv.wounds < MAX_SURVIVOR_WOUNDS);
    if (target) {
      target.wounds += effect.woundCurrentPlayerSurvivor;
      if (target.wounds >= MAX_SURVIVOR_WOUNDS) {
        killSurvivor(s, `${target.cardId}_${target.ownerId}`);
      }
    }
  }

  if (effect.addZombies) {
    s.locations[effect.addZombies.location].zombies += effect.addZombies.count;
  }
  if (effect.removeZombies) {
    const loc = s.locations[effect.removeZombies.location];
    loc.zombies = Math.max(0, loc.zombies - effect.removeZombies.count);
  }
  if (effect.addBarricade) {
    const loc = s.locations[effect.addBarricade];
    if (loc.barricades < loc.maxBarricades) loc.barricades += 1;
  }
  if (effect.addItemTypeToCurrentPlayer) {
    for (const locId of EXTERNAL_LOCATIONS) {
      const loc = s.locations[locId];
      const idx = loc.itemDeck.findIndex(c => c.type === effect.addItemTypeToCurrentPlayer);
      if (idx !== -1) {
        const [item] = loc.itemDeck.splice(idx, 1);
        currentPlayer.hand.push(item);
        addLog(s, `${currentPlayer.name} received a ${effect.addItemTypeToCurrentPlayer} item.`, 'success');
        break;
      }
    }
  }

  return s;
}

// ── Exile ─────────────────────────────────────────────────────────────────────
function handleInitiateExile(
  s: FullGameState,
  player: PlayerState,
  targetPlayerId: string,
): FullGameState {
  if (s.activeExileVote) return s;
  if (player.hasInitiatedExileThisRound || player.isExiled) return s;

  const target = s.players.find(p => p.playerId === targetPlayerId);
  if (!target || target.isExiled) return s;

  player.hasInitiatedExileThisRound = true;
  s.activeExileVote = {
    initiatorId: player.playerId,
    targetId: targetPlayerId,
    votes: {},
    resolved: false,
  };
  s.turnSubPhase = 'exile_vote';
  addLog(s, `${player.name} called for exile of ${target.name}!`, 'warning');
  return s;
}

function handleExileVote(
  s: FullGameState,
  player: PlayerState,
  vote: boolean,
): FullGameState {
  if (!s.activeExileVote || s.activeExileVote.resolved) return s;

  s.activeExileVote.votes[player.playerId] = vote;

  const voters = s.players.filter(p => !p.isExiled);
  const allVoted = voters.every(p => s.activeExileVote!.votes[p.playerId] !== undefined);

  if (allVoted) {
    const yesVotes = Object.values(s.activeExileVote.votes).filter(Boolean).length;
    const noVotes = Object.values(s.activeExileVote.votes).filter(v => !v).length;
    const target = s.players.find(p => p.playerId === s.activeExileVote!.targetId)!;

    if (yesVotes > noVotes) {
      target.isExiled = true;
      const exiledObjs = OBJECTIVES.filter(o => o.type === 'exiled');
      target.exiledObjectiveId = exiledObjs[Math.floor(Math.random() * exiledObjs.length)].id;

      // Move target's colony survivors to police station
      for (const sid of target.survivorIds) {
        const surv = s.survivors[sid];
        if (surv && surv.location === 'colony' && surv.wounds < MAX_SURVIVOR_WOUNDS) {
          surv.location = 'police_station';
        }
      }
      addLog(s, `${target.name} has been exiled!`, 'danger');
      s = checkCrossroadsTrigger(s, { type: 'player_exiled' });

      // Exiling 2+ innocent players ends the colony
      const exiledNonBetrayers = s.players.filter(p => {
        if (!p.isExiled) return false;
        const obj = OBJECTIVES.find(o => o.id === p.secretObjectiveId);
        return obj?.type !== 'betrayer';
      });
      if (exiledNonBetrayers.length >= 2) {
        s.morale = 0;
        return finalizeGameOver(s, 'Two non-betrayers exiled — colony loses hope.');
      }
    } else {
      addLog(s, `Exile vote failed for ${target.name}.`, 'info');
    }

    if (s.activeExileVote) s.activeExileVote.resolved = true;
    s.activeExileVote = null;
    s.turnSubPhase = 'acting';
  }

  return checkGameOver(s);
}

// ── Survivor Helpers ──────────────────────────────────────────────────────────
function applyExposureResult(
  s: FullGameState,
  survivorId: string,
  result: ExposureResult,
): void {
  const surv = s.survivors[survivorId];
  if (!surv || surv.wounds >= MAX_SURVIVOR_WOUNDS) return;

  if (result === 'wound') {
    surv.wounds += 1;
    if (surv.wounds >= MAX_SURVIVOR_WOUNDS) killSurvivor(s, survivorId);
  } else if (result === 'frostbite') {
    surv.frostbiteWounds += 1;
    checkCrossroadsTrigger(s, { type: 'survivor_frostbitten' });
  } else if (result === 'bitten') {
    checkCrossroadsTrigger(s, { type: 'survivor_bitten' });
    killSurvivor(s, survivorId);
    // Spread bite to lowest-influence survivor at same location
    const atLoc = Object.entries(s.survivors)
      .filter(([id, sv]) => id !== survivorId && sv.location === surv.location && sv.wounds < MAX_SURVIVOR_WOUNDS)
      .map(([id, sv]) => ({
        id,
        sv,
        card: SURVIVORS.find(sc => sc.id === sv.cardId)!,
      }))
      .sort((a, b) => a.card.influence - b.card.influence);

    if (atLoc.length > 0) {
      addLog(s, `Bite spreads to ${getSurvivorName(atLoc[0].sv)}!`, 'danger');
      killSurvivor(s, atLoc[0].id);
    }
  }
}

function killSurvivor(s: FullGameState, survivorInstanceKey: string): void {
  const surv = s.survivors[survivorInstanceKey];
  if (!surv) return;
  if (surv.wounds >= MAX_SURVIVOR_WOUNDS) return; // already dead

  surv.wounds = MAX_SURVIVOR_WOUNDS;

  const owner = s.players.find(p => p.playerId === surv.ownerId);
  if (!owner?.isExiled) {
    s.morale = Math.max(0, s.morale - 1);
    addLog(s, `${getSurvivorName(surv)} has died! Morale -1.`, 'danger');
  } else {
    addLog(s, `${getSurvivorName(surv)} has died (exiled — no morale loss).`, 'warning');
  }

  checkCrossroadsTrigger(s, { type: 'survivor_dies' });
}

function overrunLocation(s: FullGameState, locId: LocationId): FullGameState {
  const atLoc = Object.entries(s.survivors)
    .filter(([, sv]) => sv.location === locId && sv.wounds < MAX_SURVIVOR_WOUNDS)
    .map(([id, sv]) => ({
      id,
      sv,
      card: SURVIVORS.find(sc => sc.id === sv.cardId)!,
    }))
    .sort((a, b) => a.card.influence - b.card.influence);

  if (atLoc.length > 0) {
    addLog(s, `Overrun at ${LOCATION_NAMES[locId]}! ${getSurvivorName(atLoc[0].sv)} is killed.`, 'danger');
    killSurvivor(s, atLoc[0].id);
  }
  return s;
}

// ── Game Over / Finalize ──────────────────────────────────────────────────────
function finalizeGameOver(s: FullGameState, reason: string): FullGameState {
  s.gameOverReason = reason;
  s.phase = 'game_over';
  addLog(s, `GAME OVER: ${reason}`, 'danger');
  return evaluateObjectives(s);
}

function finalizeGame(s: FullGameState): FullGameState {
  const reason = s.morale > 0 ? 'Colony survived all rounds!' : 'Colony morale reached zero.';
  s.gameOverReason = reason;
  s.phase = 'game_over';
  addLog(s, reason, s.morale > 0 ? 'success' : 'danger');
  return evaluateObjectives(s);
}

// ── Objective Evaluation ──────────────────────────────────────────────────────
function evaluateObjectives(s: FullGameState): FullGameState {
  const colonyWon = s.morale > 0;
  const totalDeadSurvivors = Object.values(s.survivors).filter(sv => sv.wounds >= MAX_SURVIVOR_WOUNDS).length;

  for (const player of s.players) {
    const objId = player.isExiled && player.exiledObjectiveId ? player.exiledObjectiveId : player.secretObjectiveId;
    const objective = OBJECTIVES.find(o => o.id === objId);
    if (!objective) { s.losers.push(player.playerId); continue; }

    const won = checkObjectiveCondition(s, player.playerId, objective.conditionKey, colonyWon, totalDeadSurvivors);
    if (won) s.winners.push(player.playerId);
    else s.losers.push(player.playerId);
  }

  return s;
}

function checkObjectiveCondition(
  s: FullGameState,
  playerId: string,
  conditionKey: string,
  colonyWon: boolean,
  totalDeadSurvivors: number,
): boolean {
  const player = s.players.find(p => p.playerId === playerId)!;
  const mySurvivors = Object.values(s.survivors).filter(sv => sv.ownerId === playerId);
  const myAliveSurvivors = mySurvivors.filter(sv => sv.wounds < MAX_SURVIVOR_WOUNDS);

  switch (conditionKey) {
    case 'survivalist':
      return myAliveSurvivors.filter(sv => sv.location === 'colony').length >= 3;
    case 'provider':
      return s.food >= 3;
    case 'medic':
      return myAliveSurvivors.length > 0 && myAliveSurvivors.every(sv => sv.wounds === 0);
    case 'armed':
      return myAliveSurvivors.some(sv => sv.equippedItemId !== null);
    case 'influencer': {
      const allAlive = Object.values(s.survivors).filter(sv => sv.wounds < MAX_SURVIVOR_WOUNDS);
      if (allAlive.length === 0) return false;
      const maxInfluence = Math.max(
        ...allAlive.map(sv => SURVIVORS.find(sc => sc.id === sv.cardId)?.influence ?? 0)
      );
      return myAliveSurvivors.some(
        sv => (SURVIVORS.find(sc => sc.id === sv.cardId)?.influence ?? 0) === maxInfluence
      );
    }
    case 'fighter':
      return mySurvivors.reduce((sum, sv) => sum + sv.killCount, 0) >= 5;
    case 'helper':
      return player.preventedCrisisCount >= 2;
    case 'hoarder':
      return player.hand.length >= 3;
    case 'guardian':
      return Object.values(s.locations).every(loc => loc.zombies <= 2);
    case 'quiet':
      return mySurvivors.every(sv => sv.frostbiteWounds === 0);
    // Betrayer
    case 'saboteur':
      return !colonyWon;
    case 'infester':
      return Object.values(s.locations).some(loc => loc.zombies >= 5);
    case 'killer':
      return totalDeadSurvivors >= 4;
    // Exiled
    case 'exile_revenge':
      return !colonyWon;
    case 'lone_wolf':
      return myAliveSurvivors.length >= 1;
    case 'scavenger': {
      const myCount = player.hand.length;
      return s.players.filter(p => p.playerId !== playerId).every(p => p.hand.length < myCount);
    }
    default:
      return false;
  }
}

// ── Public / Private State ────────────────────────────────────────────────────
export function getPublicState(s: FullGameState): PublicGameState {
  return {
    phase: s.phase,
    turnSubPhase: s.turnSubPhase,
    round: s.round,
    maxRounds: s.maxRounds,
    scenarioName: s.scenarioName,
    morale: s.morale,
    maxMorale: s.maxMorale,
    food: s.food,
    wasteCount: s.wasteCount,
    starvationTokens: s.starvationTokens,
    players: s.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      survivorIds: p.survivorIds,
      handCount: p.hand.length,
      actionDice: p.actionDice,
      diceSpent: p.diceSpent,
      isExiled: p.isExiled,
      hasTakenTurn: p.hasTakenTurn,
      hasContributedToCrisis: p.hasContributedToCrisis,
      preventedCrisisCount: p.preventedCrisisCount,
    })),
    currentPlayerIndex: s.currentPlayerIndex,
    survivors: s.survivors,
    locations: Object.fromEntries(
      ALL_LOCATIONS.map(lid => [
        lid,
        {
          id: s.locations[lid].id,
          zombies: s.locations[lid].zombies,
          barricades: s.locations[lid].barricades,
          maxBarricades: s.locations[lid].maxBarricades,
          noiseTokens: s.locations[lid].noiseTokens,
          maxNoise: s.locations[lid].maxNoise,
          deckCount: s.locations[lid].itemDeck.length,
        },
      ])
    ) as unknown as PublicGameState['locations'],
    currentCrisis: s.currentCrisis,
    crisisPoolCount: s.crisisPool.length,
    activeCrossroads: s.activeCrossroads,
    activeExileVote: s.activeExileVote,
    pendingSearch: s.pendingSearch,
    gameOverReason: s.gameOverReason,
    winners: s.winners,
    losers: s.losers,
    log: s.log.slice(-20),
  };
}

export function getPrivateState(s: FullGameState, playerId: string): PrivatePlayerState {
  const player = s.players.find(p => p.playerId === playerId);
  if (!player) return { hand: [], secretObjectiveId: '', exiledObjectiveId: null };
  return {
    hand: player.hand,
    secretObjectiveId: player.secretObjectiveId,
    exiledObjectiveId: player.exiledObjectiveId,
  };
}
