# Blokus

A strategy tile-placement game for 2–4 players.

## Overview

Players take turns placing polyomino pieces on a 20×20 grid. Each piece must touch at least one corner of your own previously placed pieces, but cannot touch your pieces on the sides. The player who places the most squares wins.

## Players

- **Minimum**: 2 players
- **Maximum**: 4 players
- Colors: Blue (top-left), Yellow (top-right), Red (bottom-right), Green (bottom-left)

## How to Play

### Setup

1. One player creates a room and shares the room code
2. Others join (2–4 players total)
3. The host starts the game
4. Each player receives all 21 pieces in their color

### Each Turn

1. Select a piece from your tray on the right
2. Optionally rotate (R key or ↻ button) or flip (F key or ⇔ button)
3. Hover over the board to preview placement (green = valid, red = invalid)
4. Click to place the piece

### Placement Rules

- **First piece**: must cover your starting corner (marked on the board)
- **Subsequent pieces**: must touch at least one corner of your own pieces
- Your pieces **cannot** touch your other pieces on the sides (only corners allowed)
- Pieces of different colors **may** touch on sides

### Passing

If you have no valid moves, click "Pass". If all players pass consecutively, the game ends.

### Scoring

- **All pieces placed**: +15 points (or +20 if the last piece was the monomino)
- **Pieces remaining**: −1 point per square in unplaced pieces

## The 21 Pieces

Each player has these pieces (total 89 squares):

| Size | Count | Pieces |
|------|-------|--------|
| 1 | 1 | Monomino |
| 2 | 1 | Domino |
| 3 | 2 | I-Tromino, L-Tromino |
| 4 | 5 | I, L, T, S, O Tetrominoes |
| 5 | 12 | F, I, L, N, P, T, U, V, W, X, Y, Z Pentominoes |

## WebSocket Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `PUBLIC_STATE` | Host → All | Full game state broadcast after each action |
| `GAME_ACTION` | Client → Host | Player actions (PLACE_PIECE, PASS) |
| `PLAYER_CONNECTED` | Server → All | Player joined/reconnected |
| `PLAYER_LIST` | Host → All | Full player roster (lobby) |
| `REQUEST_STATE` | Client → Host | Reconnecting client requests current state |
| `PLAY_AGAIN` | Host → All | Reset to waiting room |

## Game Actions

```typescript
type GameAction =
  | { type: 'PLACE_PIECE'; pieceId: string; cells: Cell[] }
  | { type: 'PASS' };
```

`cells` contains the absolute board coordinates (row 0–19, col 0–19) of each square of the placed piece.
