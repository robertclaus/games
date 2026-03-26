# Dead of Winter

A cooperative (with possible betrayer) survival horror game for 2–4 players. Survivors must outlast a zombie apocalypse while secretly working toward personal objectives — and possibly betraying the colony.

---

## Rules Summary

### Objective

The colony must survive a set number of rounds while maintaining morale. Each player has a **secret objective** — one player may secretly be a **betrayer** working against the colony. Everyone wins only if the colony survives **and** they met their personal objective.

### Components

- **Survivors** — 12 unique characters, each with stats and a special ability
- **Item cards** — 5 types: food, weapon, medicine, fuel, tool
- **Crisis cards** — one resolved each round; requires a specific item type contribution
- **Crossroads cards** — triggered by in-game events; group votes on the outcome
- **Objective cards** — secret personal goals (normal, betrayer, or exiled)
- **Action dice** — each player rolls 2 dice per turn; die value determines success thresholds

### Survivor Stats

| Stat | Meaning |
|------|---------|
| Influence | Tiebreaker for exile votes |
| Attack | Minimum die roll to kill a zombie |
| Search | Minimum die roll to successfully search a location |

### Turn Structure

On your turn:
1. **Roll dice** — roll all your remaining action dice
2. **Act** — spend dice on actions (move, attack, search, barricade, clean waste)
3. **Contribute to crisis** (optional, anytime during your turn)
4. **End turn** — the host advances to the next player

### Actions

| Action | Cost | Effect |
|--------|------|--------|
| Move | Free | Move one of your survivors to an adjacent location |
| Attack | 1 die ≥ survivor's attack threshold | Kill one zombie at survivor's location; roll exposure die |
| Search | 1 die ≥ survivor's search threshold | Draw item cards from location; choose one to keep |
| Barricade | 1 die or free ability | Place a barricade at survivor's location (reduces zombie spawning) |
| Clean Waste | 1 die | Remove a waste card from the colony |
| Play Item | Free | Use an item card from hand for its effect |
| Equip Item | Free | Attach a weapon/item to a survivor permanently |

### Exposure Die

Whenever a survivor attacks a zombie or moves through a location with zombies, roll the **exposure die**:

| Face | Probability | Effect |
|------|-------------|--------|
| Blank | 3/6 | Nothing |
| Wound | 1/6 | +1 wound on survivor |
| Frostbite | 1/6 | +1 frostbite wound (deals 1 wound at start of your next turn) |
| Bitten | 1/6 | Survivor is bitten — dies in 2 rounds unless cured |

A survivor with 3 wounds dies.

### Colony Phase (end of each round)

1. **Food consumption** — remove 1 food per 2 survivors (round up); if not enough food, add starvation tokens
2. **Starvation penalty** — each starvation token = −1 morale
3. **Crisis resolution** — compare contributed items to required type; if enough matching items were contributed, crisis is prevented (+1 morale); otherwise fail effect triggers
4. **Zombie spawning** — zombies spawn at each location based on noise tokens; barricades reduce spawning
5. **Round advance** — if round > maxRounds, game ends; otherwise next round begins

### Crossroads Events

Crossroads cards trigger when specific conditions are met mid-turn. When triggered:
- All players vote on one of two options
- Majority wins; tie goes to option A
- Effects apply immediately

### Exile

Any player (on their turn) may call for another player's exile:
- All non-targeted players vote YES or NO
- Majority YES → player is exiled (loses their normal objective; receives an exiled objective)
- If 2 players are exiled, morale collapses (game loss)

### Winning

The colony survives if morale > 0 after all rounds complete.

Each player then checks their secret objective:
- **Normal** players win if the colony survived and their objective is met
- **Betrayer** wins if the colony falls (or their objective is met regardless)
- **Exiled** players have a separate objective assigned at exile

---

## Technical Implementation

### Directory Structure

```
games/dead-of-winter/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                    # Host/client WebSocket logic + view routing
    ├── game/
    │   ├── types.ts               # All TypeScript types
    │   ├── content.ts             # Survivors, items, crisis, crossroads, objectives
    │   ├── engine.ts              # Game engine: initGame, applyAction, getPublicState, getPrivateState
    │   └── scoring.ts             # Objective evaluation at game end
    ├── hooks/
    │   └── useWebSocket.ts        # Generic WS hook
    └── components/
        ├── Lobby.tsx              # Create/join room + waiting room
        ├── GameBoard.tsx          # Full game layout
        ├── LocationPanel.tsx      # Location display + actions
        ├── SurvivorPanel.tsx      # Survivor cards with actions
        ├── HandPanel.tsx          # Item hand with play/equip/crisis
        ├── CrisisPanel.tsx        # Current crisis display
        ├── CrossroadsModal.tsx    # Group vote modal
        ├── ExileModal.tsx         # Exile vote modal
        ├── GameLog.tsx            # Scrolling event log
        └── ScoreScreen.tsx        # Game over + objective reveal
```

### Key Types

```typescript
interface SurvivorInstance {
  cardId: string;
  ownerId: string;        // playerId
  wounds: number;         // 0–2 alive; 3 = dead
  frostbiteWounds: number;
  location: LocationId;
  equippedItemId: string | null;
  isLeader: boolean;
}

type TurnSubPhase =
  | 'rolling'        // player must roll dice
  | 'acting'         // player spends dice
  | 'crossroads'     // group voting on crossroads card
  | 'exile_vote'     // exile vote in progress
  | 'search_pending' // player choosing what to keep from search
  | 'done';          // turn ended
```

### Information Hiding

| Information | Visible to |
|-------------|-----------|
| Player hand | Owning player only |
| Secret objective | Owning player only |
| Crisis pool contents | Nobody until colony phase |
| Crossroads card content | Nobody until triggered |
| Other players' objectives | Revealed at game end only |

### Message Protocol

| Message | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `PLAYER_LIST` | host → all | `{ players }` | Waiting room roster |
| `START_GAME` | host → all | — | Begin game |
| `PUBLIC_STATE` | host → all | `PublicGameState` | Full public game state |
| `PRIVATE_STATE` | host → player | `PrivatePlayerState` | Hand + objective |
| `GAME_ACTION` | player → host | `GameAction` | Any player action |
| `REQUEST_STATE` | player → host | — | Resync after reconnect |
| `PLAY_AGAIN` | host → all | — | Reset for new game |

### Action Flow

```
Non-host player              Host
      │                        │
      │──GAME_ACTION──────────►│
      │  { type, ...params }   │  applyAction(state, playerId, action)
      │                        │
      │  ◄──PUBLIC_STATE───────│  broadcast to all
      │  ◄──PRIVATE_STATE──────│  send only to each player individually
```

The host processes all actions through the same `applyAction` function, which validates legality, applies effects, logs events, triggers crossroads checks, and returns the new state.

### Vite Config

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/dead-of-winter/',
  build: { outDir: '../../server/public/dead-of-winter', emptyOutDir: true },
})
```
