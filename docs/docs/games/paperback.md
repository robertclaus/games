# Paperback

Paperback is a deck-building word game for 2–4 players. Players spell words using letter cards from their hand to earn money, buy better cards from The Offer, and accumulate fame points. The player with the most fame points at game end wins.

## How to Play

### Lobby
Create a room or join an existing one with a room code. The host can start the game once 2–4 players have joined.

### On Your Turn

1. **Spell a Word** — Select cards from your hand and type a word they can spell. You may optionally use the Common Card as any vowel.
2. **Word Validation** — The word is checked against the Free Dictionary API.
3. **Gain Common Card** — If your word is long enough (word length ≥ current required length), you gain the face-up Common Card.
4. **Resolve Abilities** — Card abilities trigger automatically: draw bonuses queue for your next hand, `gain_wild` adds a free Wild card to your discard, `trash` requires you to remove one card from your remaining hand.
5. **Buy Phase** — Spend your word score (in cents) to buy cards from The Offer or Fame Cards.
6. **End Turn** — Discard everything, draw 5 new cards (plus any draw bonuses).

### Winning

The game ends when any Fame pile is emptied or the last Common Card is gained — but the triggering player finishes their turn first. Final score = total fame points on all cards in your deck.

## Game Components

### Starting Deck (per player)
Each player starts with: **T, R, S, I, N** (1¢ score each) and **5 Wild cards** (2¢ cost, 0 score). Ten cards total; 5 are dealt to hand.

### The Offer (7 piles)
Cards sorted by price from cheap to expensive. Only the top 2 cards of each pile are visible. Card types include:
- Single letter cards (B, C, D, F, G, H, J, K, L, M, P, Q, V, W, X, Y, Z)
- Two-letter cards (ER, TH, IN, RE, HE, ST, CH, NG, SH, LY)

Many offer cards have abilities: draw bonuses, score bonuses, trash, or gain a free Wild.

### Fame Cards (4 ranks)
Fame cards are Wilds (any letter) that give fame points at game end.

| Rank | Cost | Fame Points | Count (2P / 3P / 4P) |
|------|------|-------------|----------------------|
| 1    | 5¢   | 1 pt        | 4 / 5 / 8            |
| 2    | 8¢   | 2 pts       | 4 / 5 / 8            |
| 3    | 11¢  | 3 pts       | 2 / 3 / 4            |
| 4    | 17¢  | 4 pts       | 1 / 1 / 2            |

### Common Card
One face-up card anyone can use as a vowel in their word. If you meet the current length requirement, you gain it and the requirement increases by 1 (starting at 3). There are 6 Common Cards total; gaining the last one triggers game end.

### Card Abilities

| Ability | Effect |
|---------|--------|
| `draw N` | Draw N extra cards at the start of your next hand |
| `score N` | Add N to your word's score |
| `trash` | Immediately remove 1 card from your remaining hand |
| `gain_wild` | Add a free 2¢ Wild card to your discard pile |

## Technical Architecture

### Host/Client Model
Paperback follows the platform's host-authority pattern:

- The **host player** holds the full `FullGameState` in a React ref (`fullStateRef`)
- All other players only receive `PublicGameState` (no hidden hand information) plus their own private hand via `PRIVATE_HAND` messages
- Non-host players send `GAME_ACTION` messages to the host, who processes them and broadcasts updates

### WebSocket Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `PUBLIC_STATE` | Host → All | Full public game state (no private hands) |
| `PRIVATE_HAND` | Host → Player | That player's current hand cards |
| `GAME_ACTION` | Player → Host | A game action (submit word, buy card, etc.) |
| `REQUEST_STATE` | Player → Host | Request current state (on reconnect) |
| `PLAYER_CONNECTED` | Any → All | Announce joining |
| `PLAYER_LIST` | Host → All | Current lobby roster |
| `PLAY_AGAIN` | Host → All | Reset to waiting room |

### Async Word Validation
The `SUBMIT_WORD` action is handled asynchronously by the host because it requires a network call to `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`. The flow:

1. Host receives `SUBMIT_WORD`
2. Immediately sets turn phase to `'validating'` and broadcasts
3. Checks card coverage (can the selected cards spell the word?)
4. Awaits dictionary API response
5. Either accepts (calls `acceptWord`) or rejects (calls `rejectWord`) and broadcasts result

### Game State Architecture

```
FullGameState (host only)
├── players: PrivatePlayerState[]  ← includes hand, drawPile, discardPile
├── offerPiles: OfferPileHidden[]  ← all cards visible to host
├── famePiles: FamePile[]
├── commonPile: CardInstance[]
├── turnState: TurnState | null
└── turnPlayedCardIds: string[]    ← cards played this turn (for UI)

PublicGameState (broadcast to all)
├── players: PublicPlayerState[]   ← only counts, no card contents
├── offerPiles: PublicOfferPile[]  ← top 2 cards visible, rest hidden
├── famePiles: FamePile[]
├── commonPile: { topCard, remaining, lengthRequired }
└── turnState: TurnState | null
```

### Key Files

| File | Purpose |
|------|---------|
| `src/game/types.ts` | All TypeScript type definitions |
| `src/game/cards.ts` | Card data, deck builders, shuffle |
| `src/game/words.ts` | Dictionary API validation |
| `src/game/engine.ts` | Game logic: init, spell, buy, end turn |
| `src/App.tsx` | WebSocket wiring, host logic, state management |
| `src/components/GameBoard.tsx` | Main layout |
| `src/components/HandArea.tsx` | Hand display, word input, buying UI |
| `src/components/OfferArea.tsx` | The Offer display and buying |
| `src/components/FamePiles.tsx` | Fame card display and buying |
| `src/components/CommonPile.tsx` | Common card and length tracker |
| `src/components/PlayerStatus.tsx` | Compact player info panels |
| `src/components/ScoreScreen.tsx` | Final scores |
