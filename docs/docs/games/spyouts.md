# Spyouts

A fast-paced spy-themed card game for 2–4 players. Race to collect the three digits of your secret code before your opponents collect theirs — and use Action cards to steal, peek, and counter along the way.

---

## Rules Summary

### Objective
Be the first to fill all three slots of your secret **Code card** with matching Number cards.

### Components
- **Number cards**: digits 0–9, four copies each (40 total)
- **Action cards** (18 total):
  | Card | Count | Effect |
  |------|-------|--------|
  | Sneak Peak | 3 | Look at top 3 of draw pile, keep 1 |
  | Ambush | 3 | Take a random card from an opponent's hand |
  | Fast Frenzy | 2 | Play 2 Number cards this turn |
  | Espie-NAH! | 4 | Cancel another player's Action card |
  | Snatched | 3 | Name a digit; target opponent must give it to you if they have it |
  | Master of Forgery | 3 | Wild — counts as any digit in your vault |
- **Code cards**: 20 pre-defined three-digit codes (e.g. `235`, `304`)
- **Spy characters** (cosmetic): Denis, Barry, Count, Miki, Mobel, Libby

### Setup
1. Each player picks a spy character
2. Deal one Code card face-down to each player — only they can see it
3. Shuffle all 58 Number + Action cards; deal 3 to each player (kept secret)
4. Place 3 cards face-up in the center **box** (replace any Action card in the box with a draw)
5. Remaining cards form the face-down **draw pile**

### Turn Structure
On your turn, do **both** in order:

1. **Draw** — take 1 card from the draw pile **or** take 1 card from the box (the taken box slot is immediately refilled from the draw pile)
2. **Play** — choose one:
   - Place a Number card from your hand into a matching vault slot
   - Play an Action card
   - Swap: put a card from your hand into the box, take a different box card

**Hand limit:** 5 cards at the end of your turn. Discard excess to the discard pile.

### The Vault
Each player has three visible vault slots (one per code digit). Filling a slot requires either:
- A Number card whose value **equals** the digit for that slot, or
- A **Master of Forgery** (wild)

Other players can see **which slots are filled** but not the digit values.

### Winning
When all three of your vault slots are filled, declare **"Spyouts!"** — you win.

### Snap! — The Espie-NAH! Window
When any Action card is played, there is a **5-second reaction window** before it resolves. Any other player may play an **Espie-NAH!** from their hand during this window to cancel the action entirely. The first Espie-NAH! played wins; the cancelled action has no effect.

---

## Technical Implementation

### Directory Structure
```
games/spyouts/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css
    ├── game/
    │   ├── types.ts        # All TypeScript types
    │   ├── deck.ts         # Card creation, code generation, shuffle
    │   └── gameEngine.ts   # State machine: initGame, applyAction, resolveAction
    ├── hooks/
    │   └── useWebSocket.ts # Generic WS hook (shared with Arboretum)
    └── components/
        ├── Lobby.tsx           # Create/join room + character selection
        ├── CardComponent.tsx   # Number, Action, and card-back renders
        ├── VaultComponent.tsx  # 3-slot vault (owner vs spectator views)
        ├── BoxComponent.tsx    # Center box + deck/discard display
        ├── HandComponent.tsx   # Player hand with playability hints
        ├── GameBoard.tsx       # Full game layout
        └── ScoreScreen.tsx     # Winner announcement + code reveal
```

### Key Types (`game/types.ts`)

```typescript
type ActionType = 'SneakPeak' | 'Ambush' | 'FastFrenzy' | 'EspieNAH' | 'Snatched' | 'MasterOfForgery';

type TurnPhase = 'draw' | 'play' | 'fastFrenzy2' | 'pendingAction' | 'sneakPeakChoose';

interface PendingAction {
  playerId: string;         // who played the action
  action: ActionType;
  payload: unknown;         // action-specific data (e.g. targetPlayerId)
  countdown: number;        // seconds remaining for Espie-NAH! response
  affectedPlayerIds: string[];
}

interface PublicGameState {
  players: PlayerPublicState[];   // vault fill booleans, hand count
  box: (Card | null)[];           // 3 face-up cards
  turnPhase: TurnPhase;
  pendingAction: PendingAction | null;
  winnerId: string | null;
  // ...
}
```

### Game Engine (`game/gameEngine.ts`)

Three main exports:

| Function | Description |
|----------|-------------|
| `initGame(playerIds, names, characters)` | Shuffles deck, deals cards, fills box, returns `FullGameState` |
| `applyAction(state, playerId, action)` | Validates and applies a `GameAction`; returns new state |
| `resolveAction(state)` | Called by host after the 5-second countdown; applies the pending action's effect |

**Turn phase transitions:**

```
draw ──(DRAW_FROM_PILE / DRAW_FROM_BOX)──► play
play ──(PLAY_ACTION)──────────────────────► pendingAction
pendingAction ──(countdown=0)─────────────► play  (or fastFrenzy2 for Fast Frenzy)
pendingAction ──(COUNTER_ACTION)──────────► play  (action cancelled)
play ──(PLAY_ACTION: SneakPeak resolves)──► sneakPeakChoose
sneakPeakChoose ──(SNEAK_PEAK_CHOOSE)─────► next player's draw
play ──(PLAY_NUMBER / SWAP / win)─────────► next player's draw
```

### Action Card Implementations

**Sneak Peak**: On resolve, top-3 deck cards are sent privately (`SNEAK_PEAK_OPTIONS`) to the player; game enters `sneakPeakChoose` phase. Player sends `SNEAK_PEAK_CHOOSE { keepCardId }` — kept card goes to hand, the other two return to top of deck.

**Ambush**: On resolve, a random card is removed from the target's hand and added to the actor's hand. Both players receive updated `PRIVATE_STATE`.

**Fast Frenzy**: On resolve, `turnPhase` becomes `fastFrenzy2` — the player may place one more Number card before the turn ends.

**Snatched**: On resolve, if the target has a card matching `targetDigit`, it transfers to the actor's hand.

**Master of Forgery**: Played via `PLAY_NUMBER { cardId, vaultSlot }` — the engine accepts it for any slot regardless of the code digit.

**Espie-NAH!**: Sent as `COUNTER_ACTION` during the 5-second window; cancels the pending action, discards the Espie-NAH! card, returns to `play` phase.

### Message Protocol

| Message | Direction | Payload |
|---------|-----------|---------|
| `ACTION` | player → host | `GameAction` |
| `PUBLIC_STATE` | host → all | `PublicGameState` |
| `PRIVATE_STATE` | host → player | `{ hand, code, vault }` |
| `SNEAK_PEAK_OPTIONS` | host → player | `{ cards: Card[] }` |
| `SCORE_RESULTS` | host → all | `{ winnerId, playerCodes }` |
| `PLAYER_LIST` | host → all | `{ players: WaitingPlayer[] }` |

### Multiplayer Architecture

Spyouts uses the same host/client pattern as Arboretum:

- The **host** holds the full `FullGameState` (all hands, all codes)
- The host runs the 5-second Espie-NAH! countdown timer using `setTimeout` / `setInterval`
- Non-host players only know their own hand and code — they infer others' progress from vault fill status
- Actions travel: `non-host → ACTION → host → applies → PUBLIC_STATE (all) + PRIVATE_STATE (affected players)`

### Vite Config

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/spyouts/',
  build: { outDir: '../../server/public/spyouts', emptyOutDir: true },
})
```

The `base: '/spyouts/'` ensures all asset URLs are prefixed correctly when served from the game's sub-path.
