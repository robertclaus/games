# Games Architecture

Every game on the platform is an independent React/TypeScript/Vite application. Games communicate with each other's players exclusively through the generic WebSocket server — there is no shared game framework or SDK. The only contract a game must honour is the server's message format.

---

## Structure of a Game

Each game lives in `games/<game-name>/` and follows standard Vite project conventions:

```
games/arboretum/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component: lobby, WebSocket, game state
│   ├── game/                 # Pure game logic (no React)
│   │   ├── types.ts
│   │   ├── deck.ts
│   │   ├── gameEngine.ts
│   │   └── scoring.ts
│   ├── hooks/
│   │   └── useWebSocket.ts   # Reusable WS hook
│   └── components/           # UI components
├── index.html
├── vite.config.ts
└── package.json
```

Keeping game logic in a `game/` subdirectory with no React dependencies is strongly recommended. It keeps the logic testable and makes the separation between state management and rendering explicit.

---

## Using the WebSocket API

Games use the `useWebSocket` hook:

```ts
import { useWebSocket, WsMessage } from './hooks/useWebSocket';

const { send } = useWebSocket(
  wsUrl,          // null until the player has a roomId + playerId
  handleMessage,  // (msg: WsMessage) => void
  handleConnect,  // called once when the WebSocket opens
  handleDisconnect
);

// Send a broadcast
send('all', 'PUBLIC_STATE', myPublicState);

// Send a direct message to a specific player
send(targetPlayerId, 'GAME_STATE', { hand: [...] });
```

The hook manages WebSocket lifecycle (open, message parse, close) and returns a stable `send` function. It accepts a nullable URL so that the connection is deferred until IDs are available.

The full type for incoming messages is:

```ts
interface WsMessage {
  from: string;    // The sender's playerId, or "server" for system messages
  to: string;      // "all" or the target playerId
  type: string;    // Application-defined message type string
  payload: unknown;
}
```

---

## The Host-Client Model

No game server processes game logic. Instead, one player — the **host** — is the authoritative source of truth for all game state. The host is always the player who created the room (called `POST /api/rooms`).

```
Host Browser                           Non-Host Browser
──────────────────                     ─────────────────
Holds FullGameState                    Holds only PublicGameState + own hand
        │                                       │
        │  ◄── ACTION ─────────────────────────┤
        │                                       │
  applyAction()                                 │
        │                                       │
        ├── PUBLIC_STATE (to: "all") ──────────►│
        │                                       │
        └── GAME_STATE (to: playerId) ─────────►│
                                           update hand
```

**Host responsibilities:**

- Initialise game state when the host clicks "Start Game"
- Apply actions from non-host players using the local game engine
- Broadcast public state to all players after every state change
- Send each player their private state (e.g. hand) individually via direct messages
- Calculate final scores and broadcast them at game end

**Non-host responsibilities:**

- Send `ACTION` messages to the host for every game action
- Receive and render `PUBLIC_STATE` and their own private `GAME_STATE`
- Request a full state resync on reconnect

This model means the host's browser is trusted. It is appropriate for small groups of friends playing together, not a competitive or anti-cheat context.

---

## Private vs Public State

Games typically split state into two layers:

**Public state** — information all players can see. Broadcast with `"to": "all"`:

```ts
send('all', 'PUBLIC_STATE', {
  phase: 'drawing',
  currentPlayerIndex: 1,
  deckCount: 54,
  players: [
    { playerId: 'A1B2', name: 'Alice', arboretum: [...], discardPile: [...] },
    { playerId: 'C3D4', name: 'Bob',   arboretum: [...], discardPile: [...] },
  ],
});
```

**Private state** — information only one player should see (their hand). Sent directly with `"to": playerId`:

```ts
for (const player of gameState.players) {
  send(player.playerId, 'GAME_STATE', {
    hand: gameState.hands[player.playerId],
    publicState: getPublicState(gameState),
  });
}
```

The private message is sent per-player. Even though the payload also includes a copy of the public state, delivering both together in one message lets the client apply them atomically — it never renders a hand that doesn't correspond to the current turn.

---

## Creating a New Game: Detailed Walkthrough

### 1. Scaffold the project

```bash
cd games/
npm create vite@latest mygame -- --template react-ts
cd mygame && npm install
```

### 2. Set up Vite config

```ts
// games/mygame/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mygame/',
  build: {
    outDir: '../../server/public/mygame',
    emptyOutDir: true,
  },
})
```

`base` must match the folder name in `server/public/`. This ensures all asset URLs in the built bundle are prefixed correctly.

### 3. Copy the WebSocket hook

```bash
cp ../arboretum/src/hooks/useWebSocket.ts src/hooks/useWebSocket.ts
```

The hook is generic — no changes needed.

### 4. Define your types

Create `src/game/types.ts`. At minimum you need:

```ts
export interface PublicGameState {
  phase: 'lobby' | 'playing' | 'ended';
  players: PlayerState[];
  currentPlayerIndex: number;
  // ...game-specific fields
}

export interface PlayerState {
  playerId: string;
  name: string;
  // ...public per-player fields
}

export interface FullGameState extends PublicGameState {
  // Private fields only the host holds
  hands: Record<string, Card[]>;
  hostPlayerId: string;
}

export interface PrivatePlayerState {
  hand: Card[];
}

export type GameAction =
  | { type: 'SOME_ACTION'; /* action fields */ }
  | { type: 'OTHER_ACTION'; /* action fields */ };
```

### 5. Implement game logic

Create `src/game/gameEngine.ts`:

```ts
export function initGame(playerIds: string[], playerNames: Record<string, string>): FullGameState {
  // Deal cards, set up initial state
}

export function applyAction(state: FullGameState, playerId: string, action: GameAction): FullGameState {
  // Validate and apply the action
  // Return a new state (use structuredClone for immutability)
  const s = structuredClone(state) as FullGameState;
  // ...
  return s;
}

export function getPublicState(state: FullGameState): PublicGameState {
  // Strip private fields (hands, deck) before broadcasting
  return { phase: state.phase, players: state.players, /* ... */ };
}
```

### 6. Wire up App.tsx

The root component manages the full session lifecycle. Here is the skeleton:

```tsx
export default function App() {
  const [view, setView] = useState<'lobby' | 'waiting' | 'game' | 'scores'>('lobby');
  const [roomInfo, setRoomInfo] = useState<{ roomId: string; playerId: string; isHost: boolean } | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const fullStateRef = useRef<FullGameState | null>(null); // Host only
  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);

  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfo) return;

    if (msg.type === 'PLAYER_CONNECTED') {
      // Add player to waiting room list
    }

    if (msg.type === 'PLAYER_DISCONNECTED') {
      // Remove player from waiting room list
    }

    if (msg.type === 'PUBLIC_STATE') {
      setPublicState(msg.payload as PublicGameState);
      setView('game');
    }

    if (msg.type === 'GAME_STATE') {
      const p = msg.payload as { hand: Card[]; publicState: PublicGameState };
      setMyHand(p.hand);
      setPublicState(p.publicState);
      setView('game');
    }

    if (msg.type === 'ACTION' && roomInfo.isHost) {
      const newState = applyAction(fullStateRef.current!, msg.from, msg.payload as GameAction);
      fullStateRef.current = newState;
      send('all', 'PUBLIC_STATE', getPublicState(newState));
      for (const player of newState.players) {
        send(player.playerId, 'GAME_STATE', {
          hand: newState.hands[player.playerId],
          publicState: getPublicState(newState),
        });
      }
    }
  }, [roomInfo]);

  const { send: wsSend } = useWebSocket(wsUrl, handleMessage, handleConnect);

  useEffect(() => { sendRef.current = wsSend; }, [wsSend]);

  // ... render lobby, waiting room, game board, score screen
}
```

### 7. Add to Dockerfile

```dockerfile
FROM node:20-alpine AS mygame-builder
WORKDIR /app/games/mygame

RUN mkdir -p /app/server/public/mygame

COPY games/mygame/package*.json ./
RUN npm install

COPY games/mygame/ ./
RUN npm run build
```

In the `production` stage:

```dockerfile
COPY --from=mygame-builder /app/server/public/mygame ./public/mygame
```

### 8. Add to mkdocs.yml

```yaml
nav:
  - Games:
    - Overview: games/index.md
    - Arboretum: games/arboretum.md
    - My Game: games/mygame.md
```

---

## Vite Config Requirements

| Setting | Required value | Reason |
|---|---|---|
| `base` | `/<game-name>/` | Ensures built asset URLs are relative to the game's sub-path |
| `build.outDir` | `../../server/public/<game-name>` | Puts the build where Express can find it |
| `build.emptyOutDir` | `true` | Prevents stale files from accumulating between builds |

If `base` is wrong, the built `index.html` will reference assets at `/assets/...` instead of `/<game-name>/assets/...`, causing 404s when served from the Express static middleware.

---

## Reconnection Pattern

Because the server does not persist state, reconnection requires the game to handle it explicitly. The Arboretum approach:

1. On WebSocket connect, a non-host player sends an `ACTION` message of type `REQUEST_STATE` to the host.
2. The host, on receiving `REQUEST_STATE`, calls `sendStateToPlayer(fromPlayerId, currentState, send)` — resending the current public and private state to that player.
3. The host also handles the server's `PLAYER_CONNECTED` system message to catch reconnections that happen mid-game.

```ts
if (msg.type === 'ACTION' && isHost) {
  const action = msg.payload as GameAction;
  if (action.type === 'REQUEST_STATE') {
    sendStateToPlayer(msg.from, fullStateRef.current!, send);
    return;
  }
  // ...handle other actions
}
```
