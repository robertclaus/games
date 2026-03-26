import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

export interface Player {
  playerId: string;
  ws: WebSocket | null;
}

export interface Room {
  roomId: string;
  hostPlayerId: string;
  players: Map<string, Player>;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

export function createRoom(): { roomId: string; hostPlayerId: string } {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
  const roomId = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const hostPlayerId = uuidv4().slice(0, 8).toUpperCase();
  rooms.set(roomId, {
    roomId,
    hostPlayerId,
    players: new Map([[hostPlayerId, { playerId: hostPlayerId, ws: null }]]),
    createdAt: new Date(),
  });
  return { roomId, hostPlayerId };
}

export function joinRoom(roomId: string): { playerId: string; hostPlayerId: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const playerId = uuidv4().slice(0, 8).toUpperCase();
  room.players.set(playerId, { playerId, ws: null });
  return { playerId, hostPlayerId: room.hostPlayerId };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomInfo(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId: room.roomId,
    hostPlayerId: room.hostPlayerId,
    players: Array.from(room.players.keys()),
    playerCount: room.players.size,
  };
}

export function setPlayerWs(roomId: string, playerId: string, ws: WebSocket): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  player.ws = ws;
  return true;
}

export function removePlayerWs(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  const player = room.players.get(playerId);
  if (player) player.ws = null;
}

export function playerExists(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  return room ? room.players.has(playerId) : false;
}
