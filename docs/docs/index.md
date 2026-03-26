# Board Games Platform

A self-contained multiplayer board games platform that runs in a single Docker container. It consists of a generic Node.js/TypeScript/Express WebSocket server that manages rooms and routes messages, paired with game frontends written in React/TypeScript/Vite that compile to static files served by the same server.

The design goal is minimal infrastructure: one container, no external database, no dedicated game servers. Adding a new game means building a new React app and dropping it into the existing container.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Docker Container                   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           Express + WebSocket Server          │   │
│  │                                              │   │
│  │  REST API          WebSocket (/ws)           │   │
│  │  /api/rooms   ←──  ws?roomId&playerId        │   │
│  │                                              │   │
│  │  Static files      Message routing           │   │
│  │  /arboretum/  ──→  broadcast / direct        │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  /public/arboretum/   (built React app)             │
│  /public/<game-name>/ (future games)                │
└─────────────────────────────────────────────────────┘
```

The server is entirely **game-agnostic**. It knows nothing about rules, turns, or card games. It only:

- Creates rooms and assigns player IDs via REST
- Authenticates WebSocket connections against the room/player registry
- Routes messages: either broadcast to all players in a room, or deliver directly to a named player
- Emits system events when players connect or disconnect

All game logic runs on the **host player's browser**. The host holds the authoritative game state, processes actions from other players, and pushes state updates back out. Non-host players send action messages to the host and receive state updates in return.

---

## Quick Start

### Run with Docker Compose

```bash
# Build and start
docker compose up --build

# Visit a game
open http://localhost:3000/arboretum/
```

### Run with Docker directly

```bash
# Build the image
docker build -t games-platform .

# Run it
docker run -p 3000:3000 games-platform
```

### Local development (without Docker)

You need two terminal sessions.

**Terminal 1 — Server:**

```bash
cd server
npm install
npm run dev
```

**Terminal 2 — Game (Arboretum example):**

```bash
cd games/arboretum
npm install
npm run dev
```

The Vite dev server proxies WebSocket connections to the Express server. The game is available at `http://localhost:5173/arboretum/`.

---

## WebSocket Communication

Every game communicates through the server using a single unified message format. The server acts as a message bus.

**Client to server:**

```json
{
  "to": "all",
  "type": "PUBLIC_STATE",
  "payload": { "phase": "drawing", "deckCount": 72 }
}
```

**Server to client:**

```json
{
  "from": "A1B2C3D4",
  "to": "all",
  "type": "PUBLIC_STATE",
  "payload": { "phase": "drawing", "deckCount": 72 }
}
```

Setting `"to": "all"` broadcasts to every connected player in the room. Setting `"to": "<playerId>"` delivers only to that player. The server adds the `from` field automatically before delivery.

See the [Server documentation](server.md) for the full WebSocket and REST API reference.

---

## Directory Structure

```
games/                         # Repository root
├── Dockerfile                 # Multi-stage build: games → server → runtime
├── docker-compose.yml
├── CLAUDE.md                  # AI assistant context file
│
├── server/                    # Generic multiplayer server
│   ├── src/
│   │   ├── index.ts           # Express app, WebSocket handler, routing
│   │   └── rooms.ts           # Room and player management
│   ├── public/                # Built game static files (git-ignored)
│   │   └── arboretum/         # Output of `games/arboretum` Vite build
│   ├── dist/                  # Compiled server TypeScript (git-ignored)
│   └── package.json
│
├── games/                     # One subdirectory per game
│   └── arboretum/             # Arboretum card game
│       ├── src/
│       │   ├── App.tsx        # Root component, room/WS orchestration
│       │   ├── main.tsx       # React entry point
│       │   ├── game/
│       │   │   ├── types.ts   # All shared TypeScript types
│       │   │   ├── deck.ts    # Card creation and shuffling
│       │   │   ├── gameEngine.ts  # State machine and action handlers
│       │   │   └── scoring.ts # Path finding and score calculation
│       │   ├── hooks/
│       │   │   └── useWebSocket.ts  # Reusable WebSocket React hook
│       │   └── components/
│       │       ├── Lobby.tsx
│       │       ├── GameBoard.tsx
│       │       ├── ArboretumGrid.tsx
│       │       ├── CardComponent.tsx
│       │       ├── HandComponent.tsx
│       │       └── ScoreScreen.tsx
│       ├── index.html
│       ├── vite.config.ts     # base: '/arboretum/', outDir: ../../server/public/arboretum
│       └── package.json
│
└── docs/                      # This documentation (MkDocs)
    ├── mkdocs.yml
    └── docs/
        ├── index.md
        ├── server.md
        └── games/
            ├── index.md
            └── arboretum.md
```

---

## How to Add a New Game

This is the core workflow for extending the platform. Follow these steps to add a game called `mygame` as a working example.

### Step 1: Scaffold the React app

```bash
cd games/
npm create vite@latest mygame -- --template react-ts
cd mygame
npm install
```

### Step 2: Configure Vite

Edit `games/mygame/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mygame/',          // Must match the URL path the server will serve it at
  build: {
    outDir: '../../server/public/mygame',  // Server picks this up automatically
    emptyOutDir: true,
  },
})
```

The `base` URL and the `outDir` folder name must match. The server uses `app.use(express.static(publicDir))` which serves anything in `server/public/` at the corresponding path automatically — no server changes needed.

### Step 3: Copy the WebSocket hook

Copy `games/arboretum/src/hooks/useWebSocket.ts` into `games/mygame/src/hooks/useWebSocket.ts`. This hook is game-agnostic and works for any game.

### Step 4: Implement the game

Your `App.tsx` needs to handle the full lifecycle:

1. **Lobby** — call `POST /api/rooms` to create a room, or `POST /api/rooms/:roomId/join` to join. Store the `roomId` and `playerId`.
2. **Connect WebSocket** — open `ws://host/ws?roomId=<roomId>&playerId=<playerId>`.
3. **Waiting room** — listen for `PLAYER_CONNECTED` / `PLAYER_DISCONNECTED` system messages to show who is present.
4. **Start game** — the host initialises game state locally and pushes initial state to all players.
5. **Gameplay loop** — host processes actions and broadcasts state; non-host players send actions and receive state.

A minimal message handler skeleton:

```tsx
const handleMessage = useCallback((msg: WsMessage) => {
  if (msg.type === 'PLAYER_CONNECTED') {
    // A new player arrived — update the waiting room list
  }

  if (msg.type === 'PUBLIC_STATE') {
    // Host broadcast new state to everyone
    setGameState(msg.payload as MyGameState);
  }

  if (msg.type === 'PRIVATE_STATE') {
    // Host sent private data to this player only (e.g. hand cards)
    setMyPrivateData(msg.payload as MyPrivateData);
  }

  if (msg.type === 'ACTION' && isHost) {
    // Another player sent an action — process it and push updated state
    const newState = applyAction(currentState, msg.from, msg.payload as MyAction);
    send('all', 'PUBLIC_STATE', getPublicState(newState));
    // Send private state individually to each player
    for (const player of newState.players) {
      send(player.playerId, 'PRIVATE_STATE', getPrivateState(newState, player.playerId));
    }
  }
}, [isHost, currentState]);
```

### Step 5: Add a Docker build stage

In `Dockerfile`, add a new build stage before the `production` stage:

```dockerfile
FROM node:20-alpine AS mygame-builder
WORKDIR /app/games/mygame

RUN mkdir -p /app/server/public/mygame

COPY games/mygame/package*.json ./
RUN npm install

COPY games/mygame/ ./
RUN npm run build
```

Then copy the output in the `production` stage:

```dockerfile
COPY --from=mygame-builder /app/server/public/mygame ./public/mygame
```

### Step 6: Add documentation

Create `docs/docs/games/mygame.md` and add an entry to `docs/mkdocs.yml`:

```yaml
nav:
  - Games:
    - Overview: games/index.md
    - Arboretum: games/arboretum.md
    - My Game: games/mygame.md
```

### Step 7: Test it

```bash
docker compose up --build
open http://localhost:3000/mygame/
```
