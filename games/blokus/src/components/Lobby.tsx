import React, { useState } from 'react';

interface LobbyProps {
  onJoin: (roomId: string, playerName: string, isHost: boolean, playerId: string, hostPlayerId: string) => void;
}

export function Lobby({ onJoin }: LobbyProps) {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    localStorage.setItem('playerName', playerName.trim());
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json() as { roomId: string; hostPlayerId: string };
      onJoin(data.roomId, playerName.trim(), true, data.hostPlayerId, data.hostPlayerId);
    } catch { setError('Failed to create room'); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    if (!roomIdInput.trim()) { setError('Enter a room code'); return; }
    localStorage.setItem('playerName', playerName.trim());
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/rooms/${roomIdInput.trim()}/join`, { method: 'POST' });
      if (!res.ok) { setError('Room not found'); setLoading(false); return; }
      const data = await res.json() as { playerId: string; hostPlayerId: string };
      onJoin(roomIdInput.trim(), playerName.trim(), false, data.playerId, data.hostPlayerId);
    } catch { setError('Failed to join room'); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>🟦 Blokus</div>
        <p style={s.subtitle}>A strategy tile-placement game for 2–4 players</p>
        <input style={s.input} placeholder="Your name" value={playerName}
          onChange={e => setPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        <button style={s.btnPrimary} onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : 'Create Room'}
        </button>
        <div style={s.divider}>— or join existing —</div>
        <input style={s.input} placeholder="Room code" value={roomIdInput}
          onChange={e => setRoomIdInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJoin()} />
        <button style={s.btnSecondary} onClick={handleJoin} disabled={loading}>
          {loading ? 'Joining…' : 'Join Room'}
        </button>
        {error && <p style={s.error}>{error}</p>}
      </div>
    </div>
  );
}

interface WaitingRoomProps {
  roomId: string;
  players: Array<{ playerId: string; name: string }>;
  isHost: boolean;
  myPlayerId: string;
  onStart: () => void;
}

const COLOR_LABELS = ['🟦 Blue', '🟨 Yellow', '🟥 Red', '🟩 Green'];

export function WaitingRoom({ roomId, players, isHost, myPlayerId, onStart }: WaitingRoomProps) {
  const canStart = players.length >= 2 && players.length <= 4;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>🟦 Blokus</div>
        <p style={s.subtitle}>Waiting Room</p>
        <div style={s.roomCode}>
          <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Room Code:</span>
          <span style={s.roomCodeValue}>{roomId}</span>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.8rem', textAlign: 'center' }}>
          2–4 players · each gets a unique color
        </p>
        <div style={s.playerList}>
          {players.map((p, i) => (
            <div key={p.playerId} style={s.playerRow}>
              <span>{COLOR_LABELS[i] ?? '⬜'} {p.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {p.playerId === myPlayerId && <span style={s.badge}>You</span>}
                {i === 0 && <span style={s.badgeHost}>Host</span>}
              </div>
            </div>
          ))}
          {players.length < 2 && (
            <div style={{ ...s.playerRow, justifyContent: 'center', color: '#64748B', fontStyle: 'italic' }}>
              Waiting for more players…
            </div>
          )}
        </div>
        {isHost ? (
          <button style={{ ...s.btnPrimary, marginTop: 8, opacity: canStart ? 1 : 0.5 }}
            onClick={onStart} disabled={!canStart}>
            {canStart ? `Start Game (${players.length} players)` : players.length < 2 ? 'Need 2–4 players' : 'Maximum 4 players'}
          </button>
        ) : (
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: 8, textAlign: 'center' }}>
            Waiting for host to start…
          </p>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' },
  card:        { background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 40, width: 400, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  title:       { fontSize: '2.2rem', fontWeight: 800, color: '#E2E8F0', letterSpacing: '-0.5px' },
  subtitle:    { color: '#94A3B8', fontSize: '0.9rem', marginBottom: 4 },
  input:       { padding: '11px 14px', borderRadius: 6, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: '1rem', outline: 'none' },
  btnPrimary:  { padding: '12px', borderRadius: 6, border: 'none', background: '#3B82F6', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  btnSecondary:{ padding: '12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#E2E8F0', fontSize: '1rem', cursor: 'pointer' },
  divider:     { color: '#475569', fontSize: '0.85rem', margin: '4px 0' },
  error:       { color: '#EF4444', fontSize: '0.9rem' },
  roomCode:    { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '4px 0' },
  roomCodeValue: { fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '4px', color: '#E2E8F0', background: 'rgba(59,130,246,0.15)', padding: '4px 12px', borderRadius: 6, border: '1px solid #3B82F6' },
  playerList:  { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
  playerRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#0F172A', borderRadius: 6, border: '1px solid #334155', color: '#E2E8F0' },
  badge:       { background: '#1D4ED8', color: '#BFDBFE', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' },
  badgeHost:   { background: '#3B82F6', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 },
};
