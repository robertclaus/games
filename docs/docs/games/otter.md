# Otter

A fast, strategic card game for 2–4 players. Race to empty your hand three times to collect Lucky Stones while navigating a shared set of otter rules that change each round.

---

## Rules Summary

### Objective

Be the first player to empty your hand while already holding enough Lucky Stones: **2 Lucky Stones** (2 players) or **3 Lucky Stones** (3–4 players).

### Components

- **55 tummy cards** — values 1–11 across 5 suits: Shelldon 🦦, Fintin 🐠, Stardon ⭐, Clawson 🦀, Todd 🐸
- **5 head cards** — one per otter character, double-sided (each side shows a different rule)
- **3 tail cards** — double-sided (each side shows a different rule)
- **Lucky Stones** — counters earned by emptying your hand

### Setup

1. Pick **3 head cards** at random from the 5; assign one to each otter. Reveal a random side.
2. Assign all **3 tail cards**, one per otter. Reveal a random side.
3. Shuffle the 55 tummy cards. Deal **1 card face-up** to each otter's tummy pile.
4. Deal **10 cards** to each player's hand.
5. Remaining cards form the draw deck.

### Your Turn

**1. High Tide (optional)** — choose ONE action before playing cards:
- Draw 1 card from the deck
- Draw 2 cards from the deck
- Flip a head or tail card on any otter (toggles to its other rule)
- Swap the head cards of two otters
- Swap the tail cards of two otters

**2. Low Tide (mandatory)** — play at least 1 card from your hand onto an otter's tummy pile.

#### Playing a card

- Your card must follow **at least one** of the otter's rules (head rule *or* tail rule).
- Playing a card that follows **neither** rule is **illegal**.
- If your card follows **both** rules → your turn continues; you may play another card on the **same otter**.
- If your card follows **only one** rule → your turn ends automatically.
- You may voluntarily end your turn after playing at least 1 card (even if you could continue).

### Otter Rules

Rules are shown on head and tail cards. An otter's **head rule** and **tail rule** are both in effect simultaneously.

#### Simple Rules (compare to the top card of **this otter's** tummy)

| Rule | Icon | Condition |
|------|------|-----------|
| Higher | ↑ | Played value > top value |
| Lower | ↓ | Played value < top value |
| Near | ↔ | \|Played − top\| ≤ 2 |
| Far | ↔↔ | \|Played − top\| ≥ 3 |
| Odd | ⚡ | Played value is odd |
| Even | ◎ | Played value is even |

#### Advanced Rules (compare to the **other two otters'** top tummy cards)

| Rule | Icon | Condition |
|------|------|-----------|
| Inside | ⊂ | Played value is strictly between the other two top values |
| Outside | ⊃ | Played value is strictly outside both other top values |
| Shallow | 〰 | Played + other top 1 + other top 2 < 20 |
| Deep | 🌊 | Played + other top 1 + other top 2 > 20 |

> Advanced rules only apply to **head cards** (Clawson and Todd). Tail rules are always simple (own tummy).

### Running Out of Cards

When your hand reaches 0:

- **If you already have ≥ win threshold Lucky Stones** → you win immediately.
- **Otherwise** → receive +1 Lucky Stone, then all players refill their hands back to 10 cards. The game continues.

Win threshold: **2** (2 players), **3** (3–4 players).

---

## Technical Implementation

### Directory Structure

```
games/otter/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                  # Host/client WebSocket logic
    ├── game/
    │   ├── types.ts             # All TypeScript types
    │   ├── deck.ts              # Card creation, suit/rule constants
    │   └── engine.ts           # initGame, applyAction, checkRule, getPublicState
    ├── hooks/
    │   └── useWebSocket.ts      # Generic WS hook
    └── components/
        ├── Lobby.tsx            # Create/join room + waiting room
        ├── OtterComponent.tsx   # Single otter (head + tummy + tail)
        ├── HandComponent.tsx    # Player hand with validity highlights
        ├── GameBoard.tsx        # Full game layout
        └── ScoreScreen.tsx      # Winner display + play again
```

### Key Types

```typescript
type Suit = 'shelldon' | 'fintin' | 'stardon' | 'clawson' | 'todd';
type OtterRule = 'higher' | 'lower' | 'near' | 'far' | 'odd' | 'even'
               | 'inside' | 'outside' | 'shallow' | 'deep';

interface TummyCard { id: string; value: number; suit: Suit; }

interface RuleCard {
  id: string; name: string;
  sideA: OtterRule; sideB: OtterRule;
  showing: 'A' | 'B';  // which side is currently face-up
}

interface OtterState {
  index: number;
  head: RuleCard;
  tail: RuleCard;
  tummy: TummyCard[];  // last element = top card
}
```

### Core Rule Check

```typescript
export function checkRule(
  rule: OtterRule,
  card: TummyCard,
  otter: OtterState,
  allOtters: OtterState[],
): boolean
```

Simple rules inspect `otter.tummy`'s top card. Advanced rules (inside/outside/shallow/deep) inspect the top cards of the **other two otters**. If either other otter's tummy is empty, advanced rules return `false`.

### Turn Decision Logic

```
PLAY_CARD(cardId, otterIndex)
  headFollows = checkRule(head.rule, card, otter, allOtters)
  tailFollows = checkRule(tail.rule, card, otter, allOtters)

  if !headFollows && !tailFollows → reject (illegal play)

  canContinueTurn = headFollows && tailFollows
  activeOtterIndex = otterIndex   // subsequent plays must target same otter

  if hand.length === 0:
    if luckyStones >= winThreshold → GAME OVER (win)
    else → luckyStones++, refill all hands to 10, advance turn

  if !canContinueTurn → advance turn automatically
```

### Message Protocol

| Message | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `PLAYER_LIST` | host → all | `{ players }` | Waiting room roster |
| `PUBLIC_STATE` | host → all | `PublicGameState` | Full public game state |
| `PRIVATE_STATE` | host → player | `{ hand }` | Player's hand |
| `GAME_ACTION` | player → host | `GameAction` | Any player action |
| `REQUEST_STATE` | player → host | — | Resync after reconnect |
| `GAME_OVER` | host → all | `{ winnerId }` | Game ended |
| `PLAY_AGAIN` | host → all | — | Reset for new game |

### Vite Config

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/otter/',
  build: { outDir: '../../server/public/otter', emptyOutDir: true },
})
```
