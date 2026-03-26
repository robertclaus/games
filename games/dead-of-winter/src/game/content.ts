import { SurvivorCard, ItemCard, CrisisCard, CrossroadsCard, ObjectiveCard, LocationId } from './types';

// ── Shuffle Helper ────────────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Survivors ─────────────────────────────────────────────────────────────────
export const SURVIVORS: SurvivorCard[] = [
  { id:'alex',  name:'Alex Reeves',  influence:3, attack:3, search:3, abilityType:'free_barricade',          abilityDescription:'Once per turn, place a barricade without spending a die.' },
  { id:'blake', name:'Blake Torres', influence:2, attack:2, search:4, abilityType:'search_bonus',             abilityDescription:'+1 to all search die rolls (effectively lowers threshold by 1).' },
  { id:'casey', name:'Casey Kim',    influence:4, attack:4, search:3, abilityType:'no_exposure_first_attack', abilityDescription:'First zombie kill each turn does not trigger an exposure roll.' },
  { id:'dana',  name:'Dana Patel',   influence:1, attack:3, search:3, abilityType:'extra_die',               abilityDescription:'You roll one additional action die each turn.' },
  { id:'eli',   name:'Eli Nash',     influence:5, attack:5, search:2, abilityType:'double_kill_on_high',      abilityDescription:'If your attack die roll is 5 or 6, kill 2 zombies instead of 1.' },
  { id:'fran',  name:'Fran Webb',    influence:2, attack:3, search:5, abilityType:'search_bonus',             abilityDescription:'+1 to all search die rolls (effectively lowers threshold by 1).' },
  { id:'grant', name:'Grant Shaw',   influence:3, attack:4, search:3, abilityType:'attack_bonus',             abilityDescription:'+1 to all attack die rolls (effectively lowers threshold by 1).' },
  { id:'holly', name:'Holly Chen',   influence:4, attack:2, search:5, abilityType:'heal_bonus',              abilityDescription:'Medicine cards heal 1 extra wound when used on or by this survivor.' },
  { id:'ivan',  name:'Ivan Cruz',    influence:1, attack:4, search:3, abilityType:'attack_bonus',             abilityDescription:'+1 to all attack die rolls (effectively lowers threshold by 1).' },
  { id:'june',  name:'June Archer',  influence:5, attack:3, search:4, abilityType:'extra_die',               abilityDescription:'You roll one additional action die each turn.' },
  { id:'lars',  name:'Lars Burke',   influence:3, attack:4, search:2, abilityType:'no_exposure_first_attack', abilityDescription:'First zombie kill each turn does not trigger an exposure roll.' },
  { id:'mira',  name:'Mira Oaks',    influence:4, attack:3, search:4, abilityType:'heal_bonus',              abilityDescription:'Medicine cards heal 1 extra wound when used on or by this survivor.' },
];

// ── All Item Cards ─────────────────────────────────────────────────────────────
export const ALL_ITEMS: ItemCard[] = [
  // Food
  { id:'canned_goods',   name:'Canned Goods',    type:'food',     description:'Canned goods. +1 food to colony.',                        playEffect:{ foodTokens:1 } },
  { id:'dried_rations',  name:'Dried Rations',   type:'food',     description:'Dried rations. +1 food to colony.',                       playEffect:{ foodTokens:1 } },
  { id:'fresh_supplies', name:'Fresh Supplies',  type:'food',     description:'A cache of fresh food. +2 food to colony.',               playEffect:{ foodTokens:2 } },
  { id:'granola_bars',   name:'Granola Bars',    type:'food',     description:'Granola bars. +1 food to colony.',                        playEffect:{ foodTokens:1 } },
  { id:'canned_soup',    name:'Canned Soup',     type:'food',     description:'Canned soup. +1 food to colony.',                         playEffect:{ foodTokens:1 } },
  // Weapons (equippable)
  { id:'hunting_knife',  name:'Hunting Knife',   type:'weapon',   description:'Hunting knife. Equipped: attack threshold -1.',           equipEffect:{ attackBonus:1 } },
  { id:'baseball_bat',   name:'Baseball Bat',    type:'weapon',   description:'Baseball bat. Equipped: attack threshold -1.',            equipEffect:{ attackBonus:1 } },
  { id:'pistol',         name:'Pistol',          type:'weapon',   description:'Pistol. Equipped: attack -2, once: kill without exposure roll.', equipEffect:{ attackBonus:2, noExposureOnce:true } },
  { id:'hunting_rifle',  name:'Hunting Rifle',   type:'weapon',   description:'Hunting rifle. Equipped: attack threshold -2.',           equipEffect:{ attackBonus:2 } },
  { id:'crowbar',        name:'Crowbar',         type:'weapon',   description:'Crowbar. Equipped: attack threshold -1.',                 equipEffect:{ attackBonus:1 } },
  // Medicine
  { id:'first_aid_kit',  name:'First Aid Kit',   type:'medicine', description:'First aid kit. Heal 1 wound on a survivor at your location.', playEffect:{ healWounds:1 } },
  { id:'antibiotics',    name:'Antibiotics',     type:'medicine', description:'Antibiotics. Heal 2 wounds on a survivor at your location.', playEffect:{ healWounds:2 } },
  { id:'painkillers',    name:'Painkillers',     type:'medicine', description:'Painkillers. Heal 1 wound and +1 to one die roll.',       playEffect:{ healWounds:1, dieBonusOnce:1 } },
  { id:'bandages',       name:'Bandages',        type:'medicine', description:'Bandages. Heal 1 wound on a survivor at your location.',  playEffect:{ healWounds:1 } },
  // Fuel
  { id:'gas_can',        name:'Gas Can',         type:'fuel',     description:'Gas can. Add +2 to one die roll this turn.',              playEffect:{ dieBonusOnce:2 } },
  { id:'motor_oil',      name:'Motor Oil',       type:'fuel',     description:'Motor oil. Add +1 to one die roll this turn.',            playEffect:{ dieBonusOnce:1 } },
  { id:'spare_battery',  name:'Spare Battery',   type:'fuel',     description:'Spare battery. Add +1 to one die roll this turn.',        playEffect:{ dieBonusOnce:1 } },
  // Tools
  { id:'hammer',         name:'Hammer',          type:'tool',     description:'Hammer. Place 2 barricades at a survivor\'s location.',   playEffect:{ placeBrricades:2 } },
  { id:'binoculars',     name:'Binoculars',      type:'tool',     description:'Binoculars. Add +2 to one search roll this turn.',        playEffect:{ dieBonusOnce:2 } },
  { id:'walkie_talkie',  name:'Walkie-Talkie',   type:'tool',     description:'Walkie-talkie. Secretly view one opponent\'s hand.',      playEffect:{ viewOpponentHand:true } },
  { id:'generator',      name:'Generator',       type:'tool',     description:'Generator. Remove 5 cards from the waste pile.',          playEffect:{ cleanWaste:5 } },
  { id:'toolkit',        name:'Toolkit',         type:'tool',     description:'Toolkit. Place 1 barricade AND remove 2 waste cards.',    playEffect:{ placeBrricades:1, cleanWaste:2 } },
];

function makeItem(id: string): ItemCard {
  const item = ALL_ITEMS.find(i => i.id === id);
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
}

// ── Location Item Decks ────────────────────────────────────────────────────────
export const LOCATION_ITEM_DECKS: Record<LocationId, ItemCard[]> = {
  colony: [],
  police_station: shuffle([
    'pistol','hunting_rifle','baseball_bat','crowbar','hunting_knife',
    'gas_can','motor_oil',
    'hammer','walkie_talkie',
    'canned_goods','dried_rations',
    'bandages',
  ].map(makeItem)),
  grocery_store: shuffle([
    'canned_goods','dried_rations','fresh_supplies','canned_soup','granola_bars',
    'gas_can','motor_oil','spare_battery',
    'first_aid_kit',
    'baseball_bat',
    'hammer','binoculars',
  ].map(makeItem)),
  school: shuffle([
    'canned_goods','dried_rations','canned_soup','granola_bars',
    'hammer','toolkit','binoculars',
    'first_aid_kit','bandages',
    'baseball_bat',
    'motor_oil',
    'hunting_knife',
  ].map(makeItem)),
  library: shuffle([
    'hammer','binoculars','toolkit','walkie_talkie','generator',
    'antibiotics','first_aid_kit','bandages','painkillers',
    'dried_rations',
    'motor_oil',
    'hunting_knife',
  ].map(makeItem)),
  hospital: shuffle([
    'antibiotics','first_aid_kit','bandages','painkillers',
    'antibiotics','first_aid_kit',
    'hammer','toolkit','generator',
    'canned_goods','dried_rations',
    'spare_battery',
  ].map(makeItem)),
  gas_station: shuffle([
    'gas_can','motor_oil','spare_battery','gas_can','motor_oil',
    'hunting_rifle','pistol','crowbar',
    'canned_goods','granola_bars',
    'hammer',
    'bandages',
  ].map(makeItem)),
};

// ── Crisis Cards ──────────────────────────────────────────────────────────────
export const CRISIS_CARDS: CrisisCard[] = [
  { id:'c1', title:'Food Shortage',         requiredType:'food',     description:'The colony is running desperately low on food.',          failEffect:'Lose 2 food tokens and 1 morale.',                        failGameEffect:{ removeFood:2, morale:-1 } },
  { id:'c2', title:'Security Breach',       requiredType:'weapon',   description:'Zombies have found a weak point in our defenses.',        failEffect:'2 zombies are added to the colony.',                      failGameEffect:{ addZombies:{ location:'colony', count:2 } } },
  { id:'c3', title:'Fuel Crisis',           requiredType:'fuel',     description:'The generators are failing. Heat is critical.',           failEffect:'All survivors gain 1 frostbite wound.',                   failGameEffect:{ frostbiteAllSurvivors:true } },
  { id:'c4', title:'Medical Emergency',     requiredType:'medicine', description:'A sickness spreads through the colony.',                  failEffect:'2 survivors at the colony each gain 1 wound.',            failGameEffect:{ woundSurvivorsAtColony:2 } },
  { id:'c5', title:'Infrastructure Failure',requiredType:'tool',     description:'Critical systems are breaking down.',                     failEffect:'Lose 2 morale.',                                          failGameEffect:{ morale:-2 } },
  { id:'c6', title:'Cold Snap',             requiredType:'fuel',     description:'A sudden freeze threatens to kill everyone.',             failEffect:'All survivors gain 1 frostbite wound and lose 1 morale.', failGameEffect:{ frostbiteAllSurvivors:true, morale:-1 } },
  { id:'c7', title:'Supply Run Gone Wrong', requiredType:'food',     description:'A supply run ended in disaster.',                         failEffect:'Lose 3 food tokens.',                                     failGameEffect:{ removeFood:3 } },
  { id:'c8', title:'Armed Intruders',       requiredType:'weapon',   description:'Armed survivors demand entry to the colony.',             failEffect:'2 zombies added to two external locations.',              failGameEffect:{ addZombies:{ location:'police_station', count:2 }, morale:-1 } },
];

// ── Crossroads Cards ──────────────────────────────────────────────────────────
export const CROSSROADS_CARDS: CrossroadsCard[] = [
  {
    id:'cr1', title:'Hidden Cache',
    flavourText:'While moving through the corridors, a survivor notices a false wall panel.',
    trigger:{ type:'survivor_moves_to', location:'hospital' },
    options:[
      { label:'Investigate', description:'Spend time searching. Find 2 medicine items.', effect:{ addItemTypeToCurrentPlayer:'medicine' } },
      { label:'Stay focused', description:'No time to explore.',                          effect:{} },
    ],
  },
  {
    id:'cr2', title:'Desperate Plea',
    flavourText:'A wounded stranger appears at the police station entrance, begging for shelter.',
    trigger:{ type:'survivor_moves_to', location:'police_station' },
    options:[
      { label:'Bring them in',  description:'Gain 1 food token but lose 1 morale (scarce resources).', effect:{ addFood:1, morale:-1 } },
      { label:'Turn them away', description:'Survive on your own. Lose 1 morale from guilt.',          effect:{ morale:-1 } },
    ],
  },
  {
    id:'cr3', title:'Rattled Nerves',
    flavourText:'After the kill, the survivor stands trembling, staring at the fallen zombie.',
    trigger:{ type:'zombie_killed' },
    options:[
      { label:'Shake it off',   description:'The survivor refocuses. No effect.',              effect:{} },
      { label:'Take a breather',description:'Survivor rests and heals 1 wound.',               effect:{ healCurrentPlayerSurvivor:1 } },
    ],
  },
  {
    id:'cr4', title:'Last Words',
    flavourText:"As a survivor falls, they press something into a companion's hand.",
    trigger:{ type:'survivor_dies' },
    options:[
      { label:'Accept the gift', description:'Receive 1 food item.',          effect:{ addItemTypeToCurrentPlayer:'food' } },
      { label:'No time',         description:'Too dangerous to stop.',         effect:{} },
    ],
  },
  {
    id:'cr5', title:'Hollow Stomachs',
    flavourText:'The sound of empty stomachs is worse than the moaning outside.',
    trigger:{ type:'starvation_occurs' },
    options:[
      { label:'Emergency ration', description:"Someone gives up their food. Add 1 food.", effect:{ addFood:1, morale:-1 } },
      { label:'Bear through it',  description:'The colony endures. No additional effect.', effect:{} },
    ],
  },
  {
    id:'cr6', title:'Panic Spreads',
    flavourText:'Whispers of abandonment ripple through the colony.',
    trigger:{ type:'morale_drops_below', moraleThreshold:5 },
    options:[
      { label:'Rally together', description:'A speech lifts spirits. +1 morale, costs 1 food.', effect:{ morale:1, removeFood:1 } },
      { label:'Accept the fear', description:'Nothing changes.',                                  effect:{} },
    ],
  },
  {
    id:'cr7', title:'Overwhelmed',
    flavourText:'Zombies are massing. The noise is deafening.',
    trigger:{ type:'location_reaches_zombie_count', count:4 },
    options:[
      { label:'Fortify',        description:'Add a barricade at the overrun location.',          effect:{ addBarricade:'colony' } },
      { label:'Thin the herd',  description:'Remove 1 zombie from that location immediately.',   effect:{ removeZombies:{ location:'colony', count:1 } } },
    ],
  },
  {
    id:'cr8', title:'The Cost of Safety',
    flavourText:'The exiled survivor pauses at the gate, looking back.',
    trigger:{ type:'player_exiled' },
    options:[
      { label:'Show mercy', description:'The exiled player keeps 1 item from their hand.',               effect:{} },
      { label:'Strip them',  description:'Lose 1 morale; the exiled player discards all items.',          effect:{ morale:-1 } },
    ],
  },
  {
    id:'cr9', title:'Turning',
    flavourText:"The bitten survivor's eyes are unfocused. There is still time.",
    trigger:{ type:'survivor_bitten' },
    options:[
      { label:'One last act', description:'The survivor acts once more before turning. Current player gains 1 action die.', effect:{} },
      { label:'Mercy',        description:'End it quickly. Lose 1 morale.',                                                 effect:{ morale:-1 } },
    ],
  },
  {
    id:'cr10', title:'Frozen Fingers',
    flavourText:'The cold is getting into their bones.',
    trigger:{ type:'survivor_frostbitten' },
    options:[
      { label:'Wrap the wounds', description:"Spend 1 medicine token to prevent this turn's frostbite wounds.", effect:{ healCurrentPlayerSurvivor:1 } },
      { label:'Power through',   description:'No medicine spent. Take the extra wound next turn.',               effect:{ woundCurrentPlayerSurvivor:1 } },
    ],
  },
  {
    id:'cr11', title:'Small Victory',
    flavourText:'The crisis is averted. For once, the colony breathes easy.',
    trigger:{ type:'crisis_prevented' },
    options:[
      { label:'Celebrate',     description:'Boost morale. +1 morale.',            effect:{ morale:1 } },
      { label:'Stay vigilant', description:"No celebration — the danger isn't over.", effect:{} },
    ],
  },
  {
    id:'cr12', title:"Wall's Down",
    flavourText:'A barricade collapses with a crash. Everyone freezes.',
    trigger:{ type:'barricade_destroyed' },
    options:[
      { label:'Rebuild immediately', description:'Place a new barricade at that location.',      effect:{ addBarricade:'colony' } },
      { label:'Fall back',           description:'Abandon that position. No barricade, no risk.',effect:{} },
    ],
  },
  {
    id:'cr13', title:"The Librarian's Secret",
    flavourText:'Deep in the stacks, a note points to a hidden room.',
    trigger:{ type:'search_at_location', location:'library' },
    options:[
      { label:'Follow the clue', description:'Find hidden medicine. +1 medicine item.', effect:{ addItemTypeToCurrentPlayer:'medicine' } },
      { label:'Ignore it',       description:'Too risky to investigate further.',        effect:{} },
    ],
  },
  {
    id:'cr14', title:'Tension at the Gate',
    flavourText:'As the colony phase begins, two survivors argue loudly.',
    trigger:{ type:'colony_phase_begins' },
    options:[
      { label:'Mediate',       description:'Costs time but builds trust. +1 morale.',         effect:{ morale:1 } },
      { label:'Let them fight',description:'No morale cost but the argument festers. -1 morale.', effect:{ morale:-1 } },
    ],
  },
  {
    id:'cr15', title:'Old Contacts',
    flavourText:'On round 3, a signal crackles through a dead radio.',
    trigger:{ type:'round_begins', round:3 },
    options:[
      { label:'Respond', description:'Potential allies. +1 food and +1 tool.', effect:{ addFood:1, addItemTypeToCurrentPlayer:'tool' } },
      { label:'Ignore',  description:'Could be a trap. Stay quiet.',           effect:{} },
    ],
  },
  {
    id:'cr16', title:'Gas Station Ghosts',
    flavourText:'The gas station has an eerie silence broken only by a distant sobbing.',
    trigger:{ type:'survivor_moves_to', location:'gas_station' },
    options:[
      { label:'Investigate',  description:'Find fuel — but the survivor takes 1 wound.', effect:{ woundCurrentPlayerSurvivor:1, addItemTypeToCurrentPlayer:'fuel' } },
      { label:'Leave quickly',description:'The survivor retreats safely.',                effect:{} },
    ],
  },
  {
    id:'cr17', title:'Grocery Run',
    flavourText:'The store is mostly picked over, but patience reveals abundance.',
    trigger:{ type:'search_at_location', location:'grocery_store' },
    options:[
      { label:'Search deeper',    description:'Risk the noise, find more food. +1 food, +1 noise token.', effect:{ addFood:1 } },
      { label:'Take what you found', description:'No noise, no extra items.',                               effect:{} },
    ],
  },
  {
    id:'cr18', title:'Mob at the Gates',
    flavourText:"The colony's walls groan under pressure.",
    trigger:{ type:'location_reaches_zombie_count', location:'colony', count:3 },
    options:[
      { label:'Open the gate to run', description:'All survivors may immediately move to adjacent locations. -1 morale.', effect:{ morale:-1 } },
      { label:'Hold the walls',       description:'Place 2 barricades at the colony.',                                    effect:{ addBarricade:'colony' } },
    ],
  },
  {
    id:'cr19', title:'Tough Choices',
    flavourText:'Food is running low and everyone knows it.',
    trigger:{ type:'colony_phase_begins' },
    options:[
      { label:'Share equally',   description:'Morale holds. No change.',                        effect:{} },
      { label:'Strict rationing',description:'+1 food saved, but -1 morale from resentment.',   effect:{ addFood:1, morale:-1 } },
    ],
  },
  {
    id:'cr20', title:'Inspired',
    flavourText:'A sacrifice is not forgotten.',
    trigger:{ type:'survivor_dies' },
    options:[
      { label:'Channel the grief', description:'The group is moved. +1 morale.',        effect:{ morale:1 } },
      { label:'Grieve quietly',    description:'The loss weighs on everyone. -1 morale.',effect:{ morale:-1 } },
    ],
  },
];

// ── Objectives ─────────────────────────────────────────────────────────────────
export const OBJECTIVES: ObjectiveCard[] = [
  // Normal
  { id:'o_survivalist',   type:'normal',   title:'Survivalist',     description:'Control 3+ survivors at the colony when the game ends.',           conditionKey:'survivalist' },
  { id:'o_provider',      type:'normal',   title:'Provider',        description:'The colony has 3+ food tokens when the game ends.',                 conditionKey:'provider' },
  { id:'o_medic',         type:'normal',   title:'Field Medic',     description:'All your survivors have 0 wounds when the game ends.',              conditionKey:'medic' },
  { id:'o_armed',         type:'normal',   title:'Well Armed',      description:'One of your survivors has a weapon equipped when the game ends.',   conditionKey:'armed' },
  { id:'o_influencer',    type:'normal',   title:'Influencer',      description:'You control the highest-influence survivor alive when game ends.',  conditionKey:'influencer' },
  { id:'o_fighter',       type:'normal',   title:'Fighter',         description:'Your survivors have killed 5+ zombies total by game end.',          conditionKey:'fighter' },
  { id:'o_helper',        type:'normal',   title:'Crisis Hero',     description:'You have contributed to 2+ crisis pools that were prevented.',      conditionKey:'helper' },
  { id:'o_hoarder',       type:'normal',   title:'Hoarder',         description:'You have 3+ items in your hand when the game ends.',                conditionKey:'hoarder' },
  { id:'o_guardian',      type:'normal',   title:'Guardian',        description:'No location has more than 2 zombies when the game ends.',           conditionKey:'guardian' },
  { id:'o_quiet',         type:'normal',   title:'Quiet Hands',     description:'None of your survivors ever gained a frostbite wound.',             conditionKey:'quiet' },
  // Betrayer
  { id:'o_saboteur',      type:'betrayer', title:'Saboteur',        description:'[BETRAYER] The colony fails (morale hits 0 or time runs out).',    conditionKey:'saboteur' },
  { id:'o_infester',      type:'betrayer', title:'Infester',        description:'[BETRAYER] Any single location has 5+ zombies when game ends.',    conditionKey:'infester' },
  { id:'o_killer',        type:'betrayer', title:'The Killer',      description:'[BETRAYER] 4 or more total survivors are dead when game ends.',    conditionKey:'killer' },
  // Exiled
  { id:'o_exile_revenge', type:'exiled',   title:"Exile's Revenge", description:'[EXILED] The colony fails (morale hits 0 or time runs out).',      conditionKey:'exile_revenge' },
  { id:'o_lone_wolf',     type:'exiled',   title:'Lone Wolf',       description:'[EXILED] You have at least 1 survivor alive when game ends.',      conditionKey:'lone_wolf' },
  { id:'o_scavenger',     type:'exiled',   title:'Scavenger',       description:'[EXILED] You have more items in hand than any other player.',      conditionKey:'scavenger' },
];
