import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebSocket, WsMessage } from './hooks/useWebSocket';

type LobbyView = 'home' | 'waiting';

interface RoomInfo {
  roomId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  hostPlayerId: string;
}

interface WaitingPlayer {
  playerId: string;
  name: string;
}

interface HistoryEntry {
  date: string;
  roomId: string;
  game: string;
  playerName: string;
}

const GAMES = [
  { id: 'blokus',       name: 'Blokus',        emoji: '🟦', desc: '2–4 players · Tile placement' },
  { id: 'geistesblitz', name: 'Geistesblitz',   emoji: '👻', desc: '1–8 players · Reaction' },
  { id: 'arboretum',    name: 'Arboretum',      emoji: '🌳', desc: '' },
  { id: 'nerts',        name: 'Nerts',          emoji: '🃏', desc: '' },
  { id: 'spyouts',      name: 'Spyouts',        emoji: '🕵️', desc: '' },
  { id: 'dead-of-winter', name: 'Dead of Winter', emoji: '☠️', desc: '' },
  { id: 'otter',        name: 'Otter',          emoji: '🦦', desc: '' },
  { id: 'paperback',    name: 'Paperback',      emoji: '📖', desc: '' },
  { id: 'word-slam',    name: 'Word Slam',      emoji: '💬', desc: '' },
  { id: 'telestrations', name: 'Telestrations', emoji: '✏️', desc: '' },
];

function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('gameHistory') ?? '[]') as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entry: HistoryEntry) {
  const updated = [entry, ...getHistory()].slice(0, 10);
  localStorage.setItem('gameHistory', JSON.stringify(updated));
}

function getUrlParams(): RoomInfo | null {
  const p = new URLSearchParams(window.location.search);
  const roomId = p.get('roomId');
  const playerId = p.get('playerId');
  const playerName = p.get('playerName');
  const hostPlayerId = p.get('hostPlayerId');
  if (!roomId || !playerId || !playerName || !hostPlayerId) return null;
  return { roomId, playerId, playerName, isHost: playerId === hostPlayerId, hostPlayerId };
}

function launchGame(game: string, info: RoomInfo) {
  saveHistory({ date: new Date().toISOString(), roomId: info.roomId, game, playerName: info.playerName });
  const params = new URLSearchParams({
    roomId: info.roomId,
    playerId: info.playerId,
    playerName: info.playerName,
    hostPlayerId: info.hostPlayerId,
  });
  window.location.href = `/${game}/?${params.toString()}`;
}

export default function App() {
  const initialRoom = useMemo(getUrlParams, []);

  const [view, setView] = useState<LobbyView>(initialRoom ? 'waiting' : 'home');
  const [playerName, setPlayerName] = useState(() => initialRoom?.playerName ?? localStorage.getItem('playerName') ?? '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(initialRoom);
  const [wsUrl, setWsUrl] = useState<string | null>(() => {
    if (!initialRoom) return null;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws?roomId=${initialRoom.roomId}&playerId=${initialRoom.playerId}`;
  });
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>(
    initialRoom ? [{ playerId: initialRoom.playerId, name: initialRoom.playerName }] : []
  );
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [history] = useState<HistoryEntry[]>(getHistory);

  const roomInfoRef = useRef<RoomInfo | null>(initialRoom);
  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);

  const playerNamesRef = useRef<Record<string, string>>(
    initialRoom ? { [initialRoom.playerId]: initialRoom.playerName } : {}
  );

  const sendRef = useRef<((to: string, type: string, payload: unknown) => void) | null>(null);
  function send(to: string, type: string, payload: unknown) {
    sendRef.current?.(to, type, payload);
  }

  const handleMessage = useCallback((msg: WsMessage) => {
    if (!roomInfoRef.current) return;
    const { isHost } = roomInfoRef.current;

    if (msg.type === 'PLAYER_CONNECTED') {
      const payload = msg.payload as { playerId: string; playerName?: string };
      const newPid = payload.playerId;
      const newName = payload.playerName ?? playerNamesRef.current[newPid] ?? newPid;
      playerNamesRef.current[newPid] = newName;
      setWaitingPlayers(prev => {
        const existing = prev.find(p => p.playerId === newPid);
        if (existing) return existing.name !== newName ? prev.map(p => p.playerId === newPid ? { ...p, name: newName } : p) : prev;
        return [...prev, { playerId: newPid, name: newName }];
      });
      // Re-announce fix: non-host re-announces when it sees the host connect
      if (!isHost && newPid === roomInfoRef.current?.hostPlayerId) {
        const info = roomInfoRef.current;
        sendRef.current?.('all', 'PLAYER_CONNECTED', { playerId: info.playerId, playerName: info.playerName });
      }
      if (isHost) {
        const roster = Object.entries(playerNamesRef.current).map(([pid, name]) => ({ playerId: pid, name }));
        send('all', 'PLAYER_LIST', { players: roster });
      }
    }

    if (msg.type === 'PLAYER_LIST') {
      const payload = msg.payload as { players: WaitingPlayer[] };
      setWaitingPlayers(payload.players);
      for (const p of payload.players) playerNamesRef.current[p.playerId] = p.name;
    }

    if (msg.type === 'PLAYER_DISCONNECTED') {
      const payload = msg.payload as { playerId: string };
      setWaitingPlayers(prev => prev.filter(p => p.playerId !== payload.playerId));
    }

    if (msg.type === 'LAUNCH_GAME') {
      const payload = msg.payload as { game: string };
      const info = roomInfoRef.current;
      if (info) launchGame(payload.game, info);
    }
  }, []);

  const handleConnect = useCallback(() => {
    if (!roomInfoRef.current) return;
    const info = roomInfoRef.current;
    sendRef.current?.('all', 'PLAYER_CONNECTED', { playerId: info.playerId, playerName: info.playerName });
    setWaitingPlayers(prev => {
      if (prev.some(p => p.playerId === info.playerId)) return prev;
      return [...prev, { playerId: info.playerId, name: info.playerName }];
    });
    playerNamesRef.current[info.playerId] = info.playerName;
  }, []);

  const { send: wsSend } = useWebSocket(wsUrl, handleMessage, handleConnect);
  useEffect(() => { sendRef.current = wsSend; }, [wsSend]);

  function connectToRoom(info: RoomInfo) {
    setRoomInfo(info);
    roomInfoRef.current = info;
    playerNamesRef.current[info.playerId] = info.playerName;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    setWsUrl(`${proto}//${window.location.host}/ws?roomId=${info.roomId}&playerId=${info.playerId}`);
    setView('waiting');
  }

  async function handleCreate() {
    const name = playerName.trim();
    if (!name) { setError('Enter your name'); return; }
    localStorage.setItem('playerName', name);
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json() as { roomId: string; hostPlayerId: string };
      connectToRoom({ roomId: data.roomId, playerId: data.hostPlayerId, playerName: name, isHost: true, hostPlayerId: data.hostPlayerId });
    } catch {
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const name = playerName.trim();
    const code = roomIdInput.trim().toUpperCase();
    if (!name) { setError('Enter your name'); return; }
    if (!code) { setError('Enter a room code'); return; }
    localStorage.setItem('playerName', name);
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/rooms/${code}/join`, { method: 'POST' });
      if (!res.ok) { setError('Room not found'); setLoading(false); return; }
      const data = await res.json() as { playerId: string; hostPlayerId: string };
      connectToRoom({ roomId: code, playerId: data.playerId, playerName: name, isHost: false, hostPlayerId: data.hostPlayerId });
    } catch {
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  }

  function handleLaunch() {
    if (!selectedGame || !roomInfo?.isHost) return;
    send('all', 'LAUNCH_GAME', { game: selectedGame });
    launchGame(selectedGame, roomInfo);
  }

  // ── Home view ────────────────────────────────────────────────────────────────

  if (view === 'home') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.title}>🎲 Board Games</div>

          <input
            style={s.input}
            placeholder="Your name"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button style={s.btnPrimary} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create Room'}
          </button>

          <div style={s.divider}>— or join existing —</div>

          <input
            style={s.input}
            placeholder="Room code"
            value={roomIdInput}
            onChange={e => setRoomIdInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button style={s.btnSecondary} onClick={handleJoin} disabled={loading}>
            {loading ? 'Joining…' : 'Join Room'}
          </button>

          {error && <p style={s.error}>{error}</p>}

          {history.length > 0 && (
            <div style={s.historySection}>
              <div style={s.historyTitle}>Recent Games</div>
              {history.slice(0, 5).map((h, i) => {
                const game = GAMES.find(g => g.id === h.game);
                return (
                  <div key={i} style={s.historyRow}>
                    <span style={s.historyGame}>{game?.emoji ?? '🎲'} {game?.name ?? h.game}</span>
                    <span style={s.historyMeta}>{h.roomId} · {new Date(h.date).toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Waiting / game picker view ───────────────────────────────────────────────

  if (view === 'waiting' && roomInfo) {
    const selectedGameInfo = GAMES.find(g => g.id === selectedGame);
    return (
      <div style={s.page}>
        <div style={{ ...s.card, width: 500 }}>
          <div style={s.title}>🎲 Board Games</div>

          <div style={s.roomCodeRow}>
            <span style={s.roomLabel}>Room Code:</span>
            <span style={s.roomCode}>{roomInfo.roomId}</span>
          </div>

          <div style={s.playerList}>
            {waitingPlayers.map((p, i) => (
              <div key={p.playerId} style={s.playerRow}>
                <span style={{ color: '#E2E8F0' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {p.playerId === roomInfo.playerId && <span style={s.badge}>You</span>}
                  {i === 0 && <span style={s.badgeHost}>Host</span>}
                </div>
              </div>
            ))}
            {waitingPlayers.length === 0 && (
              <div style={{ ...s.playerRow, justifyContent: 'center', color: '#64748B', fontStyle: 'italic' }}>
                Connecting…
              </div>
            )}
          </div>

          {roomInfo.isHost ? (
            <>
              <div style={s.sectionLabel}>Pick a game:</div>
              <div style={s.gameGrid}>
                {GAMES.map(g => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGame(g.id)}
                    style={{
                      ...s.gameCard,
                      border: `2px solid ${selectedGame === g.id ? '#3B82F6' : '#334155'}`,
                      background: selectedGame === g.id ? 'rgba(59,130,246,0.15)' : '#0F172A',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{g.emoji}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E2E8F0' }}>{g.name}</span>
                    {g.desc && <span style={{ fontSize: '0.65rem', color: '#64748B' }}>{g.desc}</span>}
                  </div>
                ))}
              </div>
              <button
                style={{ ...s.btnPrimary, opacity: selectedGame ? 1 : 0.5 }}
                onClick={handleLaunch}
                disabled={!selectedGame}
              >
                {selectedGame ? `Launch ${selectedGameInfo?.name ?? selectedGame}` : 'Select a game first'}
              </button>
            </>
          ) : (
            <div style={{ color: '#94A3B8', fontSize: '0.9rem', textAlign: 'center', marginTop: 8 }}>
              Waiting for the host to pick a game…
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0F172A',
    padding: 16,
  },
  card: {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 40,
    width: 400,
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#E2E8F0',
    letterSpacing: '-0.5px',
    marginBottom: 4,
  },
  input: {
    padding: '11px 14px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#0F172A',
    color: '#E2E8F0',
    fontSize: '1rem',
    outline: 'none',
  },
  btnPrimary: {
    padding: '12px',
    borderRadius: 6,
    border: 'none',
    background: '#3B82F6',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '12px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#E2E8F0',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  divider: {
    color: '#475569',
    fontSize: '0.85rem',
    margin: '4px 0',
  },
  error: {
    color: '#EF4444',
    fontSize: '0.9rem',
  },
  roomCodeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: '4px 0',
  },
  roomLabel: {
    color: '#94A3B8',
    fontSize: '0.9rem',
  },
  roomCode: {
    fontFamily: 'monospace',
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '4px',
    color: '#E2E8F0',
    background: 'rgba(59,130,246,0.15)',
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid #3B82F6',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#0F172A',
    borderRadius: 6,
    border: '1px solid #334155',
    color: '#E2E8F0',
  },
  badge: {
    background: '#1D4ED8',
    color: '#BFDBFE',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
  },
  badgeHost: {
    background: '#3B82F6',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  sectionLabel: {
    fontSize: '0.85rem',
    color: '#94A3B8',
    textAlign: 'left',
    fontWeight: 600,
    marginTop: 4,
  },
  gameGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  gameCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 8px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  historySection: {
    borderTop: '1px solid #334155',
    paddingTop: 12,
    textAlign: 'left',
  },
  historyTitle: {
    fontSize: '0.75rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 8,
    fontWeight: 700,
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '0.85rem',
    gap: 8,
  },
  historyGame: {
    color: '#E2E8F0',
  },
  historyMeta: {
    color: '#64748B',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
  },
};
