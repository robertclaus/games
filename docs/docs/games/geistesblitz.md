# Geistesblitz

A real-time reaction card game for 2–6 players. Flip a card and race to grab the one correct item before everyone else.

---

## Rules Summary

### Objective

Score the most cards by the time the 60-card deck runs out.

### Components

- **60 cards** — each card depicts exactly **2 items** (possibly in the wrong color)
- **5 items**: 👻 Ghost (white), 🪑 Chair (red), 🍾 Bottle (green), 📕 Book (blue), 🐭 Mouse (gray)

Each item has a canonical color. The card tells you which item to "grab" by following the rule below.

### Finding the Correct Item

When a card is revealed, scan for the answer using this two-step rule:

1. **Match rule**: Is either depicted item shown in its own original color?
   - Ghost shown white → grab the Ghost
   - Chair shown red → grab the Chair
   - etc.
2. **No-match rule** (if neither item is in its original color): Find the item that…
   - is **not depicted** on the card, **and**
   - whose **original color does not appear** anywhere on the card

There is always exactly one correct answer.

### Scoring

- **Correct grab**: Gain 1 card from the deck **+1 card for each wrong guesser** this round
- **Wrong grab**: Lose 1 card from your pile (minimum 0)
- **Timeout** (10 seconds, nobody guesses): No scoring, advance to next card

The game ends when all 60 cards have been played. The player with the most cards wins.

---

## Technical Implementation

### Directory Structure

```
games/geistesblitz/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                  # Host/client WebSocket logic + timer management
    ├── game/
    │   ├── types.ts             # All TypeScript types
    │   ├── cards.ts             # 60-card deck generation + getCorrectAnswer
    │   └── engine.ts            # initGame, applyAction, getPublicState
    ├── hooks/
    │   └── useWebSocket.ts      # Generic WS hook
    └── components/
        ├── Lobby.tsx            # Create/join room + waiting room
        ├── CardDisplay.tsx      # Current card with item illustrations
        ├── ItemButtons.tsx      # Clickable item grab buttons
        ├── Scoreboard.tsx       # Live player scores
        ├── GameBoard.tsx        # Full game layout
        └── ScoreScreen.tsx      # Final results
```

### Key Types

```typescript
type ItemType  = 'ghost' | 'chair' | 'bottle' | 'book' | 'mouse';
type ItemColor = 'white' | 'red' | 'green' | 'blue' | 'gray';
type GamePhase = 'lobby' | 'revealing' | 'result' | 'game_over';

interface GameCard {
  id: string;
  item1: ItemType; color1: ItemColor;
  item2: ItemType; color2: ItemColor;
}

// Public state = full state (no private info in this game)
type PublicGameState = Omit<FullGameState, 'deck'> & { deckCount: number };
```

### Card Generation Algorithm

The 60 cards are generated deterministically at runtime using a Type-B structure:

```
For each answer item (5 items):
  For each pair of the other 4 items C(4,2) = 6 pairs:
    The 2 remaining items become color providers
    Assignment 1: showA → color of provider[0], showB → color of provider[1]
    Assignment 2: showA → color of provider[1], showB → color of provider[0]

Total: 5 × 6 × 2 = 60 cards
```

Each generated card is verified against `getCorrectAnswer()` at build time. If the assertion fails, `buildDeck()` throws immediately.

### Correct Answer Logic

```typescript
export function getCorrectAnswer(card: GameCard): ItemType {
  // Match rule
  if (ORIGINAL_COLORS[card.item1] === card.color1) return card.item1;
  if (ORIGINAL_COLORS[card.item2] === card.color2) return card.item2;

  // No-match rule: item not depicted whose original color is also absent
  const depictedItems = new Set([card.item1, card.item2]);
  const shownColors   = new Set([card.color1, card.color2]);
  for (const item of ALL_ITEMS) {
    if (!depictedItems.has(item) && !shownColors.has(ORIGINAL_COLORS[item])) {
      return item;
    }
  }
  throw new Error('Invalid card: no answer found');
}
```

**Why this always has exactly one answer:** With 2 colors shown, 3 items are not depicted. Of those 3, the 2 shown colors each disqualify exactly one of those items, leaving precisely 1 eligible item.

### Game Phase Flow

```
revealing (10s timeout)
    │ correct GUESS received
    ▼
  result (2.5s auto-advance)
    │ ADVANCE
    ▼
revealing (next card) ──▶ game_over (deck empty)
```

The **host** manages both timers:
- **Reveal timer** (10 s): fires `ADVANCE` action if no correct guess
- **Result timer** (2.5 s): fires `ADVANCE` to draw next card automatically

Timers are cleared via `clearTimers()` before any state transition to prevent double-fires.

### Scoring Detail

```
GUESS(item, fromPlayerId)
  correct = getCorrectAnswer(currentCard) === item

  if correct:
    wrongGuessers = players who guessed wrong before this guess
    score += 1 + wrongGuessers.length
    phase = 'result'

  if wrong:
    score = max(0, score - 1)
    if allPlayersGuessed → phase = 'result', winnerId = null

ADVANCE  (host-only):
  if deck empty → phase = 'game_over'
  else → draw next card, phase = 'revealing'
```

### Message Protocol

All game state is public — no `PRIVATE_STATE` messages.

| Message | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `PLAYER_LIST` | host → all | `{ players }` | Waiting room roster |
| `PUBLIC_STATE` | host → all | `PublicGameState` | Full game state |
| `GAME_ACTION` | player → host | `GameAction` | GUESS or ADVANCE |
| `REQUEST_STATE` | player → host | — | Resync after reconnect |
| `GAME_OVER` | host → all | — | Game ended (embedded in PUBLIC_STATE phase) |
| `PLAY_AGAIN` | host → all | — | Reset for new game |

### Vite Config

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/geistesblitz/',
  build: { outDir: '../../server/public/geistesblitz', emptyOutDir: true },
})
```
