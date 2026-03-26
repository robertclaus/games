# Telestrations

The telephone game meets Pictionary — a drawing and guessing party game for 4–8 players.

## Overview

Each player starts by writing a secret word. Booklets then pass around the table: the next player draws the word, the next player guesses the drawing, the next draws the guess, and so on. After every booklet has made a full circuit, everyone views the hilarious chain of drawings and guesses to see how far from the original things went.

## Players

- **Minimum**: 4 players
- **Maximum**: 8 players
- **Rounds**: equals the number of players (so every booklet visits every player)

## How to Play

### Lobby

1. One player creates a room and shares the room code
2. Others join (4–8 players required)
3. The host starts the game

### Round 0 — Write

Each player writes a secret word or short phrase in their own booklet. Keep it to 1–3 words. No one else sees this yet.

### Odd Rounds — Draw

Each player receives a booklet from the player before them. They see the **word or guess** from the previous round and must **draw it** without using any letters or numbers.

- 600×400 pixel canvas with color palette, brush sizes, eraser, and undo
- Submit when done — everyone works simultaneously

### Even Rounds — Guess

Each player receives a booklet and sees the **drawing** from the previous round. They write their best guess of what it depicts.

### Results

Once all rounds complete, every player can freely browse all booklets. Each booklet is shown as a full chain:
- Original word → drawing → guess → drawing → guess → …

The fun comes from watching the original word transform through misinterpretations.

## Scoring

Telestrations has no formal scoring — it is played for laughs. A summary at the bottom of each booklet notes whether the final guess matched the original word.

## Force Advance

The host can click **Force Advance** at any time to skip players who haven't submitted yet. Skipped players receive an empty entry (shown as "skipped" or blank drawing in results).

## WebSocket Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `PUBLIC_STATE` | Host → All | Game phase, round, submission count, booklets (results phase only) |
| `BOOKLET_PROMPT` | Host → Player | Private: the previous entry this player should respond to |
| `GAME_ACTION` | Client → Host | `SUBMIT_ENTRY` or `FORCE_ADVANCE` |
| `PLAYER_CONNECTED` | Server → All | Player joined/reconnected |
| `PLAYER_LIST` | Host → All | Full roster (lobby) |
| `REQUEST_STATE` | Client → Host | Reconnecting client requests state + prompt |
| `PLAY_AGAIN` | Host → All | Reset to waiting room |

## Game Actions

```typescript
type GameAction =
  | { type: 'SUBMIT_ENTRY'; content: string; entryType: 'word' | 'drawing' }
  | { type: 'FORCE_ADVANCE' };
```

`content` is plain text for word entries and a JPEG dataURL for drawings.

## Booklet Rotation

With `N` players, in round `r`, player `i` holds booklet `(i + r) % N`. After `N` rounds, every booklet is back with its owner and every player has contributed exactly once to every booklet.
