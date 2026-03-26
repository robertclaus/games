# Nerts

A real-time simultaneous card game (also called Nertz, Pounce, or Racing Demon) for 2–4 players. Everyone plays at the same time — no turns, no waiting. Race to empty your Nerts pile and score points by building the shared foundations.

---

## Rules Summary

### Objective
Empty your **Nerts pile** (13 cards) first by playing cards to the shared foundations and your work piles. Score points for every card you contribute to foundations, minus a penalty for cards left in your Nerts pile when someone calls "Nerts!"

### Setup (per player)
Each player uses their own 52-card deck with a distinct back color so cards can be identified by owner.

| Pile | Cards | Description |
|------|-------|-------------|
| **Nerts pile** | 13 | Face-down stack, top card face-up. Your primary goal is to empty this. |
| **Work piles** | 4 × 1 | Four face-up cards forming your personal tableau |
| **Hand (stock)** | 35 | Face-down. Flip 1 card at a time to your waste pile. |

The **shared center** starts empty — foundations are built here by any player.

### Shared Foundations
- One foundation pile per suit (♥ ♦ ♣ ♠), built **Ace → 2 → 3 → ... → King**
- Any player can play to any foundation at any time
- When a foundation reaches King it is removed from play
- First player to place an Ace of a suit starts that foundation

### Movement Rules

**Work piles (private):** Built down in alternating colors — red on black, black on red. Cards or entire sequences can move between work piles. Empty work pile slots accept any card.

**Foundations (shared):** Must match suit and be exactly the next value.

**Playable cards:**
- Top card of your Nerts pile
- Top card (or a sequence from) any of your 4 work piles
- Top card of your waste pile

**Hand/Waste:** Click **FLIP** to turn one card from your hand onto your waste. When your hand is empty, flip the waste face-down to reuse it (unlimited).

### Winning a Round
When a player's Nerts pile reaches 0 cards, "Nerts!" is called automatically and the round ends immediately.

### Scoring
| Source | Points |
|--------|--------|
| Each card contributed to any foundation | +1 |
| Each card remaining in your Nerts pile | −2 |

The player who called Nerts has 0 remaining (no penalty).

**Game:** Play rounds until someone reaches **100 cumulative points**. Highest score wins.

---

## Technical Implementation

### Why Nerts Is Different

Unlike Arboretum and Spyouts (turn-based), Nerts is **real-time and simultaneous**. This requires a split architecture:

- **Private state** (Nerts pile, work piles, hand/waste) is managed **locally** on each player's client — no server roundtrip needed for private moves.
- **Shared foundations** are **arbitrated by the host** — plays are validated centrally to resolve conflicts when two players try to play to the same spot simultaneously.

### Directory Structure

```
games/nerts/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css
    ├── game/
    │   ├── types.ts         # All TypeScript types
    │   ├── deck.ts          # Card creation, shuffling, dealing
    │   └── validation.ts    # Move legality checks
    ├── hooks/
    │   └── useWebSocket.ts  # Generic WS hook
    └── components/
        ├── Lobby.tsx              # Create/join room
        ├── CardFace.tsx           # Card face/back renderer
        ├── NertsPileComponent.tsx # Nerts pile with 3D stack
        ├── WorkPileComponent.tsx  # Overlapping work pile
        ├── HandWasteComponent.tsx # Hand stock + waste + FLIP
        ├── FoundationsComponent.tsx # Shared foundation slots
        ├── OpponentView.tsx       # Compact opponent strip
        ├── GameBoard.tsx          # Full real-time game layout
        └── RoundResults.tsx       # Score overlay + next round
```

### Card Identity

Each card carries its owner's player ID so foundation contributions can be attributed for scoring:

```typescript
interface Card {
  id: string;       // e.g. "H-7-player42" — unique across all decks
  suit: Suit;       // 'H' | 'D' | 'C' | 'S'
  value: number;    // 1=Ace, 11=J, 12=Q, 13=K
  ownerId: string;  // which player's deck this card came from
  backColor: string;
}
```

The host counts `card.ownerId` to compute each player's foundation score at round end.

### Validation (`game/validation.ts`)

```typescript
// Work pile: descending, alternating color
canPlayOnWorkPile(card, pile): boolean

// Foundation: matching suit, next sequential value
canPlayToFoundation(card, foundations): boolean

// Which work pile slots accept a given card
validWorkPileTargets(card, workPiles): number[]

// Can a sequence's bottom card land on a target pile
canMoveSequence(sequence, targetPile): boolean
```

### Message Protocol

| Message | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `PLAYER_LIST` | host → all | `{ players }` | Waiting room roster |
| `DEAL` | host → player | `PlayerDeal` | Shuffled deck layout for the round |
| `ROUND_START` | host → all | `{ players }` | Begin playing |
| `PLAY_TO_FOUNDATION` | player → host | `{ cardId, suit, value }` | Request a foundation play |
| `FOUNDATION_UPDATE` | host → all | `{ foundations, roundScores }` | Confirmed play; new foundation state |
| `FOUNDATION_REJECTED` | host → player | `{ cardId }` | Too slow — someone else played there first |
| `NERTS_PILE_COUNT` | player → all | `{ count }` | Broadcast on every Nerts pile change |
| `NERTS` | host → all | `{ winnerId }` | Round ending — stop playing |
| `FINAL_NERTS_COUNT` | player → host | `{ count }` | Report pile size at round end |
| `ROUND_RESULTS` | host → all | `{ roundScores, penalties, cumulativeScores }` | End-of-round scores |
| `NEXT_ROUND` | host → all | — | Start a new round |
| `GAME_OVER` | host → all | `{ winnerId }` | Someone reached 100 points |

### Foundation Play Flow

```
Non-host player                    Host
      │                              │
      │──PLAY_TO_FOUNDATION─────────►│
      │  { cardId, suit, value }     │  validate: value === foundations[suit].length + 1?
      │                              │
      │  ◄────FOUNDATION_UPDATE──────│  YES: update foundations, increment score
      │  { foundations, scores }     │       broadcast to all
      │                              │
      │  ◄──FOUNDATION_REJECTED──────│  NO: send rejection only to this player
      │  { cardId }                  │
```

The host processes their own foundation plays locally (no round-trip) then broadcasts `FOUNDATION_UPDATE`.

**Pending state (non-host):** While a card is awaiting confirmation, it is marked as "in flight" and rendered faded. On `FOUNDATION_UPDATE` the card is removed; on `FOUNDATION_REJECTED` the card returns to normal.

### Round End Flow

```
1. Player's Nerts pile hits 0
   → broadcast NERTS_PILE_COUNT { count: 0 }

2. Host sees count = 0
   → broadcast NERTS { winnerId }

3. All other players freeze local state
   → send FINAL_NERTS_COUNT { count } to host

4. Host waits 2 seconds (or until all counts received)
   → resolveRound():
       roundScore[p] = foundationCards[p] - 2 * nertsPileCount[p]
       cumulativeScore[p] += roundScore[p]
   → broadcast ROUND_RESULTS

5. Host clicks "Next Round" → new DEAL for everyone
   OR if someone ≥ 100 → broadcast GAME_OVER
```

### Interaction Model (GameBoard)

Selection state:
```typescript
type Selection =
  | { source: 'nerts' }
  | { source: 'waste' }
  | { source: 'workPile'; pileIndex: number; cardIndex: number }
  | null;
```

**Click-to-select, click-to-place:**
1. Click a card → it becomes selected (highlighted)
2. Valid destinations highlight green
3. Click a destination → card moves there
4. Click the same source again → deselect

Work pile sequences: clicking a card in a work pile selects that card **and all cards below it** (they move together).

### Vite Config

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/nerts/',
  build: { outDir: '../../server/public/nerts', emptyOutDir: true },
})
```

### Digital Variant Note

The physical game draws **3 cards at a time** from the hand stock. This digital implementation draws **1 card at a time** for a smoother, more accessible experience in the fast-paced real-time format.
