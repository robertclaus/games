# Word Slam

A fast-paced, team-based word guessing game for 4–10 players.

## Overview

Two teams race simultaneously to guess the same secret word. Each team has a **storyteller** who arranges word cards from a shared library to create clues — without speaking. Everyone can see all guesses from both teams, but each team only sees their own storyteller's arrangement.

## Players

- **Minimum**: 4 players (2 per team)
- **Maximum**: ~10 players (game supports more, but performance may vary)
- Teams are assigned automatically by join order (odd-index → Red, even-index → Blue)

## How to Play

### Lobby

1. One player creates a room and shares the room code
2. Others join with the room code
3. The host starts the game once 4+ players have joined

### Each Round

1. A secret word is shown **only to the two storytellers** (one per team)
2. Both storytellers simultaneously arrange word cards from the **Word Library** to give their team a clue
3. Teammates see their team's arrangement in real-time and type guesses
4. The **first team to guess correctly** wins the round and scores 1 point
5. All guesses from **both teams are visible to everyone** — you can learn from what the other team guesses!
6. If the **2-minute timer** expires before either team guesses, no one scores

### After Each Round

The answer is revealed, scores are updated, and the next round begins automatically (3-second pause).

### Winning

After all 10 rounds, the team with the most points wins.

## Word Library

Storytellers arrange words from a shared library of **119 words** across 4 categories:

| Category | Examples | Color |
|----------|----------|-------|
| **Nouns** | person, water, fire, city, time | Blue |
| **Verbs** | is, make, go, swim, fight | Green |
| **Adjectives** | big, hot, dangerous, alive | Yellow |
| **Connectors** | in, not, very, above, together | Purple |

Clicking a word **adds** it to your arrangement; clicking again **removes** it. Use the ▲ ▼ arrows to reorder words, or × to remove them individually.

## Rules for Storytellers

- **Cannot speak** or make any sounds
- **Cannot gesture** or give hints outside of the word arrangement
- Can **add, remove, and reorder** words at any time during the round
- Cannot submit guesses (only their team members can guess)

## Technical Details

- **Rounds**: 10 rounds per game (default)
- **Timer**: 120 seconds per round
- **Scoring**: 1 point per round won; highest total wins
- **Team assignment**: Automatic by join order (1st, 3rd, 5th player → Red; 2nd, 4th, 6th → Blue)
- **Storyteller rotation**: Rotates through team members each round

## WebSocket Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `PUBLIC_STATE` | Host → All | Full public game state (no secret answer) |
| `ROUND_ANSWER` | Host → Storytellers | Secret answer for the current round |
| `GAME_ACTION` | Client → Host | Player actions (UPDATE_ARRANGEMENT, SUBMIT_GUESS) |
| `PLAYER_CONNECTED` | Client → All | Player joined/reconnected |
| `PLAYER_LIST` | Host → All | Full player roster (lobby phase) |
| `REQUEST_STATE` | Client → Host | Reconnecting client requests current state |
| `PLAY_AGAIN` | Host → All | Reset to waiting room |

## Game Actions

```typescript
type GameAction =
  | { type: 'UPDATE_ARRANGEMENT'; wordIds: string[] }
  | { type: 'SUBMIT_GUESS'; guess: string };
```
