# Arboretum

Arboretum is a card game for 2–4 players in which each player builds a garden of trees (an arboretum) by placing cards in a grid. The goal is to score points by creating paths through the grid, but the right to score each tree species is contested based on what you hold in your hand at the end of the game.

The digital implementation lives in `games/arboretum/`.

---

## Rules Summary

### The Deck

The deck contains **80 cards**: 10 species × 8 values (1 through 8) = 80 cards.

| Species | Colour |
|---|---|
| Blue Spruce | Blue |
| Cassia | Yellow |
| Cherry Blossom | Pink |
| Dogwood | White |
| Jacaranda | Purple |
| Maple | Red |
| Oak | Brown |
| Royal Poinciana | Orange |
| Willow | Green |
| Sycamore | Grey |

### Setup

Players are dealt a starting hand depending on player count:

| Players | Starting hand size |
|---|---|
| 2 | 7 cards |
| 3 | 6 cards |
| 4 | 5 cards |

### Turn Structure

On your turn you must perform exactly three steps in order:

1. **Draw 2 cards** — Each draw independently comes from either the face-down deck or the top card of any player's face-up discard pile (including your own).
2. **Play 1 card** — Place one card from your hand into your arboretum. Cards must be placed **orthogonally adjacent** to an existing card. The first card in your arboretum can go anywhere.
3. **Discard 1 card** — Place one card from your hand face-up on your personal discard pile. Each player has their own discard pile and only its top card is available for drawing.

### End Game

The game ends immediately when the **draw deck is exhausted** — specifically, when a player completes their discard step and the deck is empty. The current player finishes their full turn (draw → play → discard), then scoring begins.

### Scoring

Scoring has two phases: determining who has the **right to score** each species, and then calculating **path scores**.

#### Right to Score

For each species, players compare the **total value** of all cards of that species remaining in their hand at game end.

- The player(s) with the **highest total** earn the right to score that species in their arboretum.
- If multiple players tie for the highest total, all tying players can score it.
- If no player holds any cards of a species, **all players** can score it.

**Exception — the 8/1 rule:** If you hold the 8 of a species but an opponent holds the 1 of that species, you **lose** the right to score that species (even if your total is highest). The player holding the 1 can use it to cancel the 8-holder.

#### Path Scoring

For each species a player has the right to score, they find the best **valid path** through their arboretum:

- A path is a sequence of cards connected orthogonally (each card must be adjacent to the previous one in the grid).
- Values must be **strictly increasing** along the path.
- The path must **begin and end** with a card of the species being scored. Intermediate cards can be any species.
- Only the single highest-scoring path per species is counted.

**Points for a path:**

| Condition | Points |
|---|---|
| Each card in the path | +1 per card |
| All cards in the path are the same species AND path length ≥ 4 | +1 per card (additional) |
| Path starts with the 1 of the species | +1 |
| Path ends with the 8 of the species | +2 |

The player with the most total points wins.

---

## Technical Implementation

### File Structure

```
games/arboretum/src/
├── App.tsx                  # Root component and WebSocket orchestration
├── main.tsx                 # React entry point
├── index.css                # Global styles (dark theme, CSS custom properties)
├── game/
│   ├── types.ts             # All shared TypeScript types and constants
│   ├── deck.ts              # Card creation and Fisher-Yates shuffle
│   ├── gameEngine.ts        # State machine: initGame, applyAction, getPublicState
│   └── scoring.ts           # Path DFS and score calculation
├── hooks/
│   └── useWebSocket.ts      # Generic WebSocket React hook
└── components/
    ├── Lobby.tsx            # Create/join room UI
    ├── GameBoard.tsx        # Main in-game layout
    ├── ArboretumGrid.tsx    # Interactive grid renderer
    ├── CardComponent.tsx    # Individual card and card-back rendering
    ├── HandComponent.tsx    # Player hand display
    └── ScoreScreen.tsx      # End-game score breakdown
```

---

### `game/types.ts`

Defines all shared types. Key types:

```ts
export type Species =
  | 'BlueSpruce' | 'Cassia' | 'CherryBlossom' | 'Dogwood'
  | 'Jacaranda' | 'Maple' | 'Oak' | 'RoyalPoinciana' | 'Willow' | 'Sycamore';

export interface Card {
  id: string;       // e.g. "Maple-4"
  species: Species;
  value: number;    // 1–8
}

export interface PlacedCard {
  card: Card;
  position: GridPosition; // { row: number; col: number }
}

export type GamePhase = 'lobby' | 'drawing' | 'playing' | 'discarding' | 'scoring' | 'ended';
```

**State split:**

```ts
// Everything non-host players see
export interface PublicGameState {
  phase: GamePhase;
  players: PlayerState[];           // includes arboretum and discardPile for each player
  currentPlayerIndex: number;
  deckCount: number;
  drawCount: number;                // 0, 1, or 2 — how many draws taken this turn
  discardedThisTurn: boolean;
  playedThisTurn: boolean;
  scores?: Record<string, number>;  // only populated in 'ended' phase
}

// Only the host holds this
export interface FullGameState extends PublicGameState {
  deck: Card[];
  hands: Record<string, Card[]>;   // playerId → hand
  hostPlayerId: string;
}

// Sent privately to each player
export interface PrivatePlayerState {
  hand: Card[];
}
```

**Action types:**

```ts
export type GameAction =
  | { type: 'DRAW_FROM_DECK' }
  | { type: 'DRAW_FROM_DISCARD'; targetPlayerId: string }
  | { type: 'PLAY_CARD'; cardId: string; position: GridPosition }
  | { type: 'DISCARD_CARD'; cardId: string }
  | { type: 'START_GAME' }
  | { type: 'REQUEST_STATE' };
```

---

### `game/deck.ts`

Creates and shuffles the 80-card deck:

```ts
export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const species of ALL_SPECIES) {
    for (let value = 1; value <= 8; value++) {
      cards.push({ id: `${species}-${value}`, species, value });
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  // Fisher-Yates in-place shuffle on a copy
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

---

### `game/gameEngine.ts`

The state machine. All functions are pure — they return new state rather than mutating in place (`structuredClone` is used for deep copies).

**`initGame(playerIds, playerNames)`**

Shuffles the deck, deals starting hands based on player count (7/6/5 cards), and returns the initial `FullGameState` with `phase: 'drawing'`.

**`applyAction(state, playerId, action)`**

The central transition function. Guards check that the action is valid (correct phase, correct player's turn, action not already taken this turn). Returns the original state unchanged if the action is invalid. Valid transitions:

| Action | Valid in phase | Effect | Next phase |
|---|---|---|---|
| `DRAW_FROM_DECK` | `drawing` | Pop top card from deck, add to hand | `drawing` (or `playing` if drawCount reaches 2) |
| `DRAW_FROM_DISCARD` | `drawing` | Pop top of target player's discard pile | `drawing` (or `playing` if drawCount reaches 2) |
| `PLAY_CARD` | `playing` | Remove card from hand, add to arboretum at position (validated adjacent) | `discarding` |
| `DISCARD_CARD` | `discarding` | Remove card from hand, push to player's discard pile. If deck empty → `ended`, else advance turn | `drawing` (next player) or `ended` |

**`isValidPlacement(arboretum, position)`**

Returns `true` if `position` is either the first card (any position valid) or is orthogonally adjacent to any existing card and not already occupied.

**`getPublicState(state)`**

Strips the private `deck` and `hands` fields before broadcast. The resulting `PublicGameState` is safe to send to all players.

---

### `game/scoring.ts`

**`getRightToScore(state)`**

Iterates all 10 species. For each:
1. Sums hand values per player for that species.
2. Finds the maximum sum.
3. Filters to players with the max sum.
4. Applies the 8/1 exception: if a candidate holds the 8 of the species, checks whether any opponent holds the 1. If so, that candidate is excluded.
5. Returns a `Record<Species, string[]>` mapping each species to the list of player IDs who can score it.

**`calculateScores(state)`**

For each player, iterates species they have the right to score, finds the best path (via `findBestPath`), and assembles a `PlayerScoreResult` with a per-species `ScoreBreakdown`.

**`findBestPath(arboretum, species)`**

DFS from every card of the target species. At each step, moves to orthogonally adjacent cards with strictly higher values. Records valid paths (length > 1, ending on the target species) and scores each with `scorePath`. Returns the highest-scoring path found.

```ts
// Path scoring formula
function scorePath(path: PlacedCard[], species: Species): number {
  let score = path.length;                           // 1 pt per card
  if (path.length >= 4 && path.every(p => p.card.species === species)) {
    score += path.length;                            // same-species bonus
  }
  if (path[0].card.value === 1) score += 1;          // starts with 1
  if (path[path.length - 1].card.value === 8) score += 2; // ends with 8
  return score;
}
```

---

### `hooks/useWebSocket.ts`

A generic, reusable React hook:

```ts
export function useWebSocket(
  url: string | null,
  onMessage: (msg: WsMessage) => void,
  onConnect?: () => void,
  onDisconnect?: () => void,
): { send: (to: string, type: string, payload: unknown) => void }
```

- Accepts a nullable `url`. When null, no connection is opened. Set the URL to trigger the connection.
- Uses refs for callbacks to avoid stale closure problems when the handler re-renders.
- Returns a stable `send` function.
- Closes the WebSocket when the component unmounts or the URL changes.

---

### Components

| Component | Responsibility |
|---|---|
| `Lobby.tsx` | Create/join room flow. Calls `POST /api/rooms` or `POST /api/rooms/:id/join`, then calls the `onJoinRoom` callback with the resulting IDs. |
| `GameBoard.tsx` | Main in-game layout: left sidebar (players/discard/deck), centre (arboretum grid tabs), right sidebar (opponents' arboretums), bottom (hand). Translates UI interactions into `GameBoardAction` objects and calls `onAction`. |
| `ArboretumGrid.tsx` | Renders the 2D grid of placed cards. In interactive mode, shows valid placement positions as clickable targets. Uses CSS grid with dynamic row/column offsets. |
| `CardComponent.tsx` | Renders a single card with species colour and value. Also exports `CardBack` for the draw pile. Supports `small` and `highlight` props. |
| `HandComponent.tsx` | Renders the player's hand in a horizontal row. Highlights the selected card. |
| `ScoreScreen.tsx` | Displays the final score table with per-species breakdowns, path visualisation, and a "Play Again" button. |

---

## Message Protocol

The Arboretum game uses five message types. All are routed through the generic server.

### `GAME_STATE` — host to individual player (private)

Sent by the host to each player individually after every state change. Contains the player's current hand and a copy of the full public state.

```json
{
  "from": "<hostPlayerId>",
  "to": "<targetPlayerId>",
  "type": "GAME_STATE",
  "payload": {
    "hand": [
      { "id": "Maple-3", "species": "Maple", "value": 3 },
      { "id": "Oak-7",   "species": "Oak",   "value": 7 }
    ],
    "publicState": { "phase": "drawing", "deckCount": 54, "..." : "..." }
  }
}
```

Non-host players update both `myHand` and `publicState` state when this arrives.

### `PUBLIC_STATE` — host to all players (broadcast)

Broadcast after every state change. Contains everything except hands and the full deck.

```json
{
  "from": "<hostPlayerId>",
  "to": "all",
  "type": "PUBLIC_STATE",
  "payload": {
    "phase": "playing",
    "currentPlayerIndex": 1,
    "deckCount": 52,
    "drawCount": 2,
    "discardedThisTurn": false,
    "playedThisTurn": false,
    "players": [
      {
        "playerId": "A1B2C3D4",
        "name": "Alice",
        "arboretum": [
          { "card": { "id": "Willow-1", "species": "Willow", "value": 1 }, "position": { "row": 0, "col": 0 } }
        ],
        "discardPile": [
          { "id": "Cassia-5", "species": "Cassia", "value": 5 }
        ]
      }
    ]
  }
}
```

### `ACTION` — non-host player to host (direct)

Sent from a non-host player to the host player's ID. Contains the full action object.

```json
{
  "from": "<playerId>",
  "to": "<hostPlayerId>",
  "type": "ACTION",
  "payload": {
    "type": "PLAY_CARD",
    "cardId": "Maple-3",
    "position": { "row": 1, "col": 0 }
  }
}
```

The host processes the action through `applyAction`, then pushes new `PUBLIC_STATE` and `GAME_STATE` messages.

!!! note
    When the host takes an action, they apply it locally (no `ACTION` message to self) and push state immediately. Only non-host players send `ACTION` messages.

### `SCORE_RESULTS` — host to all players (broadcast)

Sent once when the game ends, after `calculateScores` runs.

```json
{
  "from": "<hostPlayerId>",
  "to": "all",
  "type": "SCORE_RESULTS",
  "payload": [
    {
      "playerId": "A1B2C3D4",
      "total": 23,
      "breakdown": [
        {
          "species": "Maple",
          "path": [ { "card": { "id": "Maple-1", "..." }, "position": { "..." } }, "..." ],
          "basePoints": 4,
          "sameSpeciesBonus": 4,
          "startsWithOne": 1,
          "endsWithEight": 0,
          "total": 9
        }
      ]
    }
  ]
}
```

### `PLAYER_CONNECTED` (application layer)

On WebSocket connect, each player broadcasts a `PLAYER_CONNECTED` message themselves (via the `handleConnect` callback in `App.tsx`). This augments the server's own `PLAYER_CONNECTED` event with the player's display name:

```json
{
  "from": "<playerId>",
  "to": "all",
  "type": "PLAYER_CONNECTED",
  "payload": {
    "playerId": "<playerId>",
    "playerName": "Alice"
  }
}
```

Other players use this to populate the waiting room list.

---

## Player Experience Walkthrough

### 1. Lobby

The player arrives at `http://host/arboretum/`. The Lobby component presents two options:

- **Create New Game** — prompts for a display name, calls `POST /api/rooms`, stores `roomId` and `hostPlayerId`, opens the WebSocket, and moves to the waiting room.
- **Join Game** — prompts for a display name and a room code (e.g. `A1B2C3D4`), calls `POST /api/rooms/:roomId/join`, stores the returned `playerId`, and connects.

### 2. Waiting Room

All players (including the host) see a list of who has joined. The list updates in real time as `PLAYER_CONNECTED` and `PLAYER_DISCONNECTED` messages arrive. The room code is displayed prominently for sharing.

Only the host sees a **Start Game** button, which is enabled once 2–4 players are present.

### 3. Starting the Game

The host clicks **Start Game**. `initGame` runs locally, dealing hands from the shuffled deck. The host immediately broadcasts `PUBLIC_STATE` and sends a private `GAME_STATE` to each player (including themselves). All players transition to the game view.

### 4. Gameplay

The game view has three panels:

- **Left sidebar** — player list with current-turn indicator, each player's discard pile top (clickable to draw during your draw phase), and the draw deck (clickable to draw from deck).
- **Centre** — tabbed arboretum view. Your arboretum is shown by default; click any tab to inspect an opponent's. When it's your play phase and you have a card selected, valid placement positions appear as highlighted cells.
- **Right sidebar** — compact view of all opponents' arboretums.
- **Bottom** — your hand. During the play phase, click a card to select it, then click a grid cell to place it. During the discard phase, click a card to discard it immediately.

A status bar at the top shows the current phase and whose turn it is.

### 5. End Game and Scoring

When the deck empties and the current player completes their discard, the game transitions to `'ended'`. The host calculates scores via `calculateScores` and broadcasts `SCORE_RESULTS`. All players see the score screen, which shows:

- Final scores ranked from highest to lowest
- Each player's per-species breakdown: path length, same-species bonus, starts-with-1 bonus, ends-with-8 bonus
- A **Play Again** button that resets the local state and returns everyone to the waiting room (the room and player IDs remain valid).
