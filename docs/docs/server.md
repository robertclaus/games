# Server

The server is a single Node.js/TypeScript process built on [Express](https://expressjs.com/) and the [`ws`](https://github.com/websockets/ws) library. Its only job is to manage rooms, authenticate WebSocket connections, and route messages between players. It has no knowledge of any game's rules or state.

**Source files:**

- `server/src/index.ts` — Express app, WebSocket handler, message routing
- `server/src/rooms.ts` — In-memory room and player registry

---

## Overview

When the server starts it does three things:

1. Registers REST endpoints for room lifecycle (`/api/rooms`)
2. Mounts a WebSocket server at `/ws` for real-time message routing
3. Serves compiled game frontends as static files from `server/public/`

The server holds rooms in a `Map` in memory. Rooms are never persisted to disk. If the server restarts, all rooms and connections are gone.

---

## REST API

All endpoints accept and return JSON.

### Create a room

```
POST /api/rooms
```

Creates a new room. The caller becomes the host. No request body is required.

**Response `200 OK`:**

```json
{
  "roomId": "A1B2C3D4",
  "hostPlayerId": "E5F6G7H8"
}
```

Both IDs are 8-character uppercase alphanumeric strings derived from UUIDs. The host player is automatically added to the room's player list.

**Usage:**

```ts
const res = await fetch('/api/rooms', { method: 'POST' });
const { roomId, hostPlayerId } = await res.json();
```

---

### Join a room

```
POST /api/rooms/:roomId/join
```

Adds a new player to an existing room. No request body is required.

**Response `200 OK`:**

```json
{
  "playerId": "I9J0K1L2"
}
```

**Response `404 Not Found`:**

```json
{
  "error": "Room not found"
}
```

**Usage:**

```ts
const res = await fetch(`/api/rooms/${roomId}/join`, { method: 'POST' });
if (!res.ok) throw new Error('Room not found');
const { playerId } = await res.json();
```

---

### Get room info

```
GET /api/rooms/:roomId
```

Returns current room membership. Useful to poll before connecting via WebSocket, or to check whether a room still exists.

**Response `200 OK`:**

```json
{
  "roomId": "A1B2C3D4",
  "hostPlayerId": "E5F6G7H8",
  "players": ["E5F6G7H8", "I9J0K1L2", "M3N4O5P6"],
  "playerCount": 3
}
```

**Response `404 Not Found`:**

```json
{
  "error": "Room not found"
}
```

---

## WebSocket API

### Connecting

```
ws://<host>/ws?roomId=<roomId>&playerId=<playerId>
```

Both `roomId` and `playerId` must be provided as query parameters. The server validates that:

- The room exists
- The player ID belongs to that room

If either check fails the connection is closed immediately with code `4001` and reason `"Invalid room or player"`. You must call the REST API to obtain valid IDs before connecting.

**Example (browser):**

```ts
const ws = new WebSocket(
  `ws://${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}`
);
```

### Message format — client to server

```json
{
  "to": "all" | "<targetPlayerId>",
  "type": "<message_type>",
  "payload": {}
}
```

| Field | Type | Description |
|---|---|---|
| `to` | `string` | `"all"` to broadcast to the whole room, or a specific `playerId` for a direct message |
| `type` | `string` | Arbitrary string. The server does not interpret it. |
| `payload` | `object` | Arbitrary JSON. The server passes it through unchanged. |

### Message format — server to client

```json
{
  "from": "<senderId>",
  "to": "all" | "<targetPlayerId>",
  "type": "<message_type>",
  "payload": {}
}
```

The server adds the `from` field (the sending player's ID) before delivery. Everything else is forwarded verbatim.

### Routing rules

- `"to": "all"` — the message is delivered to **every connected player in the room**, including the sender.
- `"to": "<playerId>"` — the message is delivered only to that player. If the target player is not currently connected (their WebSocket is null or closed), the message is silently dropped.

### System messages

The server itself emits two message types. Both arrive with `"from": "server"` and `"to": "all"`.

#### `PLAYER_CONNECTED`

Sent when a player successfully completes the WebSocket handshake.

```json
{
  "from": "server",
  "to": "all",
  "type": "PLAYER_CONNECTED",
  "payload": { "playerId": "I9J0K1L2" }
}
```

!!! note
    The server's `PLAYER_CONNECTED` only carries the `playerId`. The Arboretum game augments this by having each player immediately broadcast their own `PLAYER_CONNECTED` message via application code, including their chosen display name in the payload. This is an application-layer convention, not a server feature.

#### `PLAYER_DISCONNECTED`

Sent when a player's WebSocket closes (browser tab closed, network drop, etc.). The player remains registered in the room and can reconnect.

```json
{
  "from": "server",
  "to": "all",
  "type": "PLAYER_DISCONNECTED",
  "payload": { "playerId": "I9J0K1L2" }
}
```

---

## Static File Serving

The server serves compiled game frontends from `server/public/` using Express's static middleware:

```ts
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
```

A game built to `server/public/arboretum/` is served at `http://host/arboretum/`. No configuration is required; adding a new folder to `public/` automatically makes it available.

For client-side routing (React Router, etc.), a catch-all handler serves each game's `index.html` for any sub-path within that game's directory:

```ts
app.get('/:game/*', (req, res) => {
  const gameDir = path.join(publicDir, req.params.game);
  const indexFile = path.join(gameDir, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) res.status(404).send('Game not found');
  });
});
```

If the game directory does not exist, or has no `index.html`, the server returns 404.

---

## Room Lifecycle

```
1. Host calls POST /api/rooms
   └─ Room created in memory
   └─ Host player ID returned

2. Other players call POST /api/rooms/:roomId/join
   └─ Each receives a unique player ID

3. Each player opens ws://.../ws?roomId=...&playerId=...
   └─ Server validates room + player ID
   └─ Broadcasts PLAYER_CONNECTED to room

4. Game runs: players exchange messages via the server's routing

5. Player disconnects (tab closes, etc.)
   └─ Server broadcasts PLAYER_DISCONNECTED
   └─ Player's WebSocket reference cleared (player remains in room)
   └─ Player can reconnect by opening a new WebSocket with same IDs

6. Server restart or container restart
   └─ All rooms and connections are lost (in-memory only)
```

There is no room cleanup, expiry, or persistence. This is intentional — rooms are ephemeral, tied to a single play session.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | The port the HTTP server listens on |
| `NODE_ENV` | _(unset)_ | Set to `production` by the Dockerfile |

```bash
# Run on a custom port
PORT=8080 node dist/index.js
```

---

## Building and Running

**Build:**

```bash
cd server
npm install
npm run build     # tsc → dist/
```

**Start (production):**

```bash
node dist/index.js
```

**Development (with hot reload):**

```bash
npm run dev       # ts-node-dev --respawn src/index.ts
```

**TypeScript config** is strict. The server uses `"strict": true` in `tsconfig.json`.
