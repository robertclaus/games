// ── Locations ────────────────────────────────────────────────────────────────
export type LocationId =
  | 'colony'
  | 'police_station'
  | 'grocery_store'
  | 'school'
  | 'library'
  | 'hospital'
  | 'gas_station';

export const ALL_LOCATIONS: LocationId[] = [
  'colony','police_station','grocery_store','school','library','hospital','gas_station',
];
export const EXTERNAL_LOCATIONS: LocationId[] = ALL_LOCATIONS.filter(l => l !== 'colony');

export const LOCATION_NAMES: Record<LocationId, string> = {
  colony: 'Colony',
  police_station: 'Police Station',
  grocery_store: 'Grocery Store',
  school: 'School',
  library: 'Library',
  hospital: 'Hospital',
  gas_station: 'Gas Station',
};

// ── Items ─────────────────────────────────────────────────────────────────────
export type ItemType = 'food' | 'weapon' | 'medicine' | 'fuel' | 'tool';

export interface ItemCard {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  // Effects when played from hand (non-weapon, non-equip)
  playEffect?: {
    foodTokens?: number;          // add to colony food supply
    healWounds?: number;          // heal wounds on a chosen survivor (same location)
    dieBonusOnce?: number;        // add to one die roll this turn
    placeBrricades?: number;      // place N barricades at survivor's location
    cleanWaste?: number;          // remove N cards from waste
    viewOpponentHand?: boolean;   // peek at one opponent's hand
  };
  // When equipped to a survivor
  equipEffect?: {
    attackBonus?: number;         // reduce attack threshold by N (min 1)
    noExposureOnce?: boolean;     // once per game: kill zombie with no exposure roll
  };
}

// ── Survivors ─────────────────────────────────────────────────────────────────
export type AbilityType =
  | 'attack_bonus'
  | 'search_bonus'
  | 'extra_die'
  | 'free_barricade'
  | 'no_exposure_first_attack'
  | 'double_kill_on_high'  // kills 2 zombies if die roll >= 5
  | 'heal_bonus';          // medicine heals +1 extra wound

export interface SurvivorCard {
  id: string;
  name: string;
  influence: number;   // 1–5
  attack: number;      // min die value to kill a zombie (2–5)
  search: number;      // min die value to search a location (2–5)
  abilityType: AbilityType;
  abilityDescription: string;
}

export interface SurvivorInstance {
  cardId: string;              // references SurvivorCard.id
  ownerId: string;             // playerId
  wounds: number;              // 0–2 alive; 3 = dead
  frostbiteWounds: number;     // each causes +1 wound at start of owner's turn
  location: LocationId;
  equippedItemId: string | null;
  isLeader: boolean;
  hasUsedFreeAbilityThisTurn: boolean;
  noExposureUsed: boolean;     // for equipEffect.noExposureOnce
  killCount: number;
}

// ── Locations ─────────────────────────────────────────────────────────────────
export interface LocationState {
  id: LocationId;
  zombies: number;
  barricades: number;
  maxBarricades: number;
  noiseTokens: number;
  maxNoise: number;
  itemDeck: ItemCard[];   // shuffled draw pile
  discardPile: ItemCard[];
}

// ── Crisis ────────────────────────────────────────────────────────────────────
export interface CrisisCard {
  id: string;
  title: string;
  description: string;
  requiredType: ItemType;
  failEffect: string;
  failGameEffect: {
    morale?: number;
    removeFood?: number;
    addZombies?: { location: LocationId; count: number };
    woundSurvivorsAtColony?: number;
    frostbiteAllSurvivors?: boolean;
  };
}

export interface CrisisContribution {
  playerId: string;
  cardId: string;
  itemType: ItemType;
}

// ── Crossroads ────────────────────────────────────────────────────────────────
export type CrossroadsTriggerType =
  | 'survivor_moves_to'
  | 'zombie_killed'
  | 'survivor_dies'
  | 'starvation_occurs'
  | 'morale_drops_below'
  | 'location_reaches_zombie_count'
  | 'player_exiled'
  | 'survivor_bitten'
  | 'survivor_frostbitten'
  | 'crisis_prevented'
  | 'barricade_destroyed'
  | 'search_at_location'
  | 'colony_phase_begins'
  | 'round_begins';

export interface CrossroadsTrigger {
  type: CrossroadsTriggerType;
  location?: LocationId;
  count?: number;
  round?: number;
  moraleThreshold?: number;
}

export interface CrossroadsOption {
  label: string;
  description: string;
  effect: CrossroadsEffect;
}

export interface CrossroadsEffect {
  morale?: number;
  addFood?: number;
  removeFood?: number;
  healCurrentPlayerSurvivor?: number;    // heal N wounds on current player's first alive survivor
  woundCurrentPlayerSurvivor?: number;   // wound current player's first alive survivor
  addZombies?: { location: LocationId; count: number };
  removeZombies?: { location: LocationId; count: number };
  addBarricade?: LocationId;
  addItemTypeToCurrentPlayer?: ItemType;
  loseActionDie?: boolean;               // current player loses 1 die
}

export interface CrossroadsCard {
  id: string;
  title: string;
  flavourText: string;
  trigger: CrossroadsTrigger;
  options: [CrossroadsOption, CrossroadsOption];
}

// ── Objectives ────────────────────────────────────────────────────────────────
export type ObjectiveType = 'normal' | 'betrayer' | 'exiled';

export interface ObjectiveCard {
  id: string;
  type: ObjectiveType;
  title: string;
  description: string;
  // Evaluated at game end — string key for serialization; engine has a registry
  conditionKey: string;
}

// ── Player State ──────────────────────────────────────────────────────────────
export interface PlayerState {
  playerId: string;
  name: string;
  survivorIds: string[];       // SurvivorInstance keys they control
  hand: ItemCard[];            // private
  actionDice: number[];        // rolled die values for current turn
  diceSpent: boolean[];        // parallel to actionDice
  isExiled: boolean;
  hasTakenTurn: boolean;       // this round
  hasContributedToCrisis: boolean;
  secretObjectiveId: string;   // private
  exiledObjectiveId: string | null;
  preventedCrisisCount: number;
  hasInitiatedExileThisRound: boolean;
}

// ── Exile Vote ────────────────────────────────────────────────────────────────
export interface ExileVote {
  initiatorId: string;
  targetId: string;
  votes: Record<string, boolean>; // playerId -> yes/no
  resolved: boolean;
}

// ── Active Crossroads ─────────────────────────────────────────────────────────
export interface ActiveCrossroads {
  card: CrossroadsCard;
  votes: Record<string, number>; // playerId -> option index (0 or 1)
  resolved: boolean;
}

// ── Game Log ──────────────────────────────────────────────────────────────────
export interface LogEntry {
  round: number;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

// ── Search State ──────────────────────────────────────────────────────────────
// When a player is mid-search (deciding whether to keep or make noise)
export interface PendingSearch {
  survivorId: string;
  location: LocationId;
  drawnCards: ItemCard[];   // cards drawn so far
  noiseTokensAdded: number;
}

// ── Full Game State ───────────────────────────────────────────────────────────
export type GamePhase =
  | 'lobby'
  | 'player_turns'
  | 'colony_phase'
  | 'game_over';

export type TurnSubPhase =
  | 'rolling'          // waiting for player to roll dice
  | 'acting'           // player is spending dice on actions
  | 'crossroads'       // crossroads card triggered, waiting for group vote
  | 'exile_vote'       // exile vote in progress
  | 'search_pending'   // player is mid-search deciding to keep/noise
  | 'done';            // player ended turn, waiting for host to advance

export interface FullGameState {
  // Meta
  phase: GamePhase;
  turnSubPhase: TurnSubPhase;
  round: number;
  maxRounds: number;
  scenarioName: string;

  // Colony resources
  morale: number;
  maxMorale: number;
  food: number;
  wasteCount: number;
  starvationTokens: number;

  // Players & survivors
  players: PlayerState[];
  currentPlayerIndex: number;
  survivors: Record<string, SurvivorInstance>; // key = survivorCardId + ownerId

  // Locations
  locations: Record<LocationId, LocationState>;

  // Crisis
  crisisDeck: CrisisCard[];
  currentCrisis: CrisisCard | null;
  crisisPool: CrisisContribution[]; // hidden until colony phase

  // Crossroads
  crossroadsDeck: CrossroadsCard[];
  currentCrossroadsCard: CrossroadsCard | null; // drawn for current turn, hidden
  activeCrossroads: ActiveCrossroads | null;

  // Exile
  activeExileVote: ExileVote | null;

  // Mid-turn state
  pendingSearch: PendingSearch | null;

  // End state
  gameOverReason: string | null;
  winners: string[];   // playerIds who met their objective
  losers: string[];

  // Log
  log: LogEntry[];
}

// ── Public State (broadcast to all) ──────────────────────────────────────────
// Strips out private info (hands, secret objectives, crisis pool contents, crossroads card content)
export interface PublicPlayerState {
  playerId: string;
  name: string;
  survivorIds: string[];
  handCount: number;
  actionDice: number[];
  diceSpent: boolean[];
  isExiled: boolean;
  hasTakenTurn: boolean;
  hasContributedToCrisis: boolean;
  preventedCrisisCount: number;
}

export interface PublicGameState {
  phase: GamePhase;
  turnSubPhase: TurnSubPhase;
  round: number;
  maxRounds: number;
  scenarioName: string;
  morale: number;
  maxMorale: number;
  food: number;
  wasteCount: number;
  starvationTokens: number;
  players: PublicPlayerState[];
  currentPlayerIndex: number;
  survivors: Record<string, SurvivorInstance>;
  locations: Record<LocationId, Omit<LocationState, 'itemDeck' | 'discardPile'> & { deckCount: number }>;
  currentCrisis: CrisisCard | null;
  crisisPoolCount: number;  // how many cards contributed (not what they are)
  activeCrossroads: ActiveCrossroads | null;
  activeExileVote: ExileVote | null;
  pendingSearch: PendingSearch | null;
  gameOverReason: string | null;
  winners: string[];
  losers: string[];
  log: LogEntry[];
}

// ── Private State (sent only to owning player) ────────────────────────────────
export interface PrivatePlayerState {
  hand: ItemCard[];
  secretObjectiveId: string;
  exiledObjectiveId: string | null;
  // During sneak-peek from Walkie-Talkie — host sends one-time payload
  viewingOpponentHand?: { playerName: string; hand: ItemCard[] };
}

// ── Player Actions ────────────────────────────────────────────────────────────
export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'ROLL_DICE' }
  | { type: 'MOVE_SURVIVOR'; survivorId: string; targetLocation: LocationId }
  | { type: 'ATTACK_ZOMBIE'; survivorId: string; dieIndex: number }
  | { type: 'SEARCH'; survivorId: string; dieIndex: number }
  | { type: 'SEARCH_DECIDE'; keepCardIndex: number | null } // null = take noise, keep nothing; OR keepCardIndex=N
  | { type: 'BARRICADE'; survivorId: string; dieIndex: number | null } // null if free ability
  | { type: 'CLEAN_WASTE'; survivorId: string; dieIndex: number }
  | { type: 'PLAY_ITEM'; cardId: string; targetSurvivorId?: string; targetDieIndex?: number }
  | { type: 'EQUIP_ITEM'; cardId: string; survivorId: string }
  | { type: 'CONTRIBUTE_TO_CRISIS'; cardId: string }
  | { type: 'END_TURN' }
  | { type: 'CROSSROADS_VOTE'; optionIndex: 0 | 1 }
  | { type: 'INITIATE_EXILE'; targetPlayerId: string }
  | { type: 'EXILE_VOTE'; vote: boolean }
  | { type: 'REQUEST_STATE' };
