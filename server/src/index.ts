import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createRoom, joinRoom, getRoomInfo, getRoom, setPlayerWs, removePlayerWs } from './rooms';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Serve static game files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// REST API
app.post('/api/rooms', (req, res) => {
  const result = createRoom();
  res.json(result);
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const result = joinRoom(req.params.roomId.toUpperCase());
  if (!result) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(result);
});

app.get('/api/rooms/:roomId', (req, res) => {
  const info = getRoomInfo(req.params.roomId.toUpperCase());
  if (!info) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(info);
});

// Serve index.html for SPA routes (game frontends)
// Match both /:game and /:game/* so direct navigation and deep links both work
app.get('/:game', (req, res) => {
  const gameDir = path.join(publicDir, req.params.game);
  const indexFile = path.join(gameDir, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) res.status(404).send('Game not found');
  });
});

app.get('/:game/*', (req, res) => {
  const gameDir = path.join(publicDir, req.params.game);
  const indexFile = path.join(gameDir, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) res.status(404).send('Game not found');
  });
});

// WebSocket
interface WsMessage {
  to: string; // 'all' or a playerId
  type: string;
  payload: unknown;
}

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://localhost`);
  const roomId = (url.searchParams.get('roomId') || '').toUpperCase();
  const playerId = url.searchParams.get('playerId') || '';

  const room = getRoom(roomId);
  if (!room || !room.players.has(playerId)) {
    ws.close(4001, 'Invalid room or player');
    return;
  }

  setPlayerWs(roomId, playerId, ws);
  console.log(`Player ${playerId} connected to room ${roomId}`);

  // Notify others that this player connected (include playerName if provided in URL)
  const playerName = url.searchParams.get('playerName') || undefined;
  broadcastToRoom(roomId, playerId, {
    from: 'server',
    to: 'all',
    type: 'PLAYER_CONNECTED',
    payload: playerName ? { playerId, playerName } : { playerId },
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString()) as WsMessage;
      const outgoing = { from: playerId, to: msg.to, type: msg.type, payload: msg.payload };

      if (msg.to === 'all') {
        broadcastToRoom(roomId, playerId, outgoing);
      } else {
        sendToPlayer(roomId, msg.to, outgoing);
      }
    } catch (e) {
      console.error('Invalid message', e);
    }
  });

  ws.on('close', () => {
    removePlayerWs(roomId, playerId);
    console.log(`Player ${playerId} disconnected from room ${roomId}`);
    broadcastToRoom(roomId, playerId, {
      from: 'server',
      to: 'all',
      type: 'PLAYER_DISCONNECTED',
      payload: { playerId },
    });
  });
});

function broadcastToRoom(roomId: string, fromPlayerId: string, message: object): void {
  const room = getRoom(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const [, player] of room.players) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function sendToPlayer(roomId: string, targetPlayerId: string, message: object): void {
  const room = getRoom(roomId);
  if (!room) return;
  const player = room.players.get(targetPlayerId);
  if (player?.ws && player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(message));
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
