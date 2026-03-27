# Games Platform - CLAUDE.md

## Project Overview
A web platform hosting multiplayer board games online. Single Docker container: a generic Node.js/WebSocket server hosts static React game frontends.

## Architecture

### Server (`/server`)
- **Node.js + TypeScript + Express + ws**
- Game-agnostic: creates rooms, manages player connections, routes messages
- REST API for room management
- WebSocket for real-time message routing (broadcast or direct)
- Serves compiled game frontends as static files from `/server/public/`

### Games (`/games/<game-name>`)
- Each game is a **React + TypeScript + Vite** app
- Builds to `/server/public/<game-name>/`
- Communicates with server via WebSocket
- Game logic lives entirely on the client (host player holds authoritative state)
- Must use the generic server WebSocket API — server knows nothing about individual games

### Documentation (`/docs`)
- **MkDocs** with Material theme
- Developer-focused docs: system design, WebSocket API, how to add new games
- Each game has its own docs page

## Server WebSocket API

### Connect
```
ws://host/ws?roomId=<roomId>&playerId=<playerId>
```

### Message Format (client → server)
```json
{
  "to": "all" | "<targetPlayerId>",
  "type": "<message_type>",
  "payload": { }
}
```

### Message Format (server → client)
```json
{
  "from": "<senderId>",
  "to": "all" | "<targetPlayerId>",
  "type": "<message_type>",
  "payload": { }
}
```

- `"to": "all"` → broadcast to all players in the room
- `"to": "<playerId>"` → send only to that specific player

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a room, returns `{ roomId, hostPlayerId }` |
| POST | `/api/rooms/:roomId/join` | Join a room, returns `{ playerId }` |
| GET | `/api/rooms/:roomId` | Get room info, returns `{ roomId, players, playerCount }` |

## Rules for Adding a New Game
1. Create `/games/<game-name>/` with a Vite React app
2. Set Vite `base` to `/<game-name>/` and `outDir` to `../../server/public/<game-name>`
3. Use the WebSocket hook from the game to connect and exchange messages
4. Add build step to Dockerfile
5. Add a docs page at `/docs/docs/games/<game-name>.md`
6. Update `mkdocs.yml` navigation

## Docker
Single container builds everything:
1. Build server TypeScript
2. Build each game with Vite
3. Run the server (which serves static game files)

## Key Conventions
- TypeScript everywhere (strict mode)
- Server is completely game-agnostic — no game logic
- Game state is managed by the "host" player client and broadcast to others
- No tests required, but code should be solid and well-documented
- Keep the server simple — it's a message router, not a game engine
