import React, { useState } from 'react';

interface WaitingPlayer {
  playerId: string;
  name: string;
}

interface LobbyProps {
  onJoin: (roomId: string, playerName: string, isHost: boolean, playerId: string, hostPlayerId: string) => void;
}

interface WaitingRoomProps {
  roomId: string;
  players: WaitingPlayer[];
  isHost: boolean;
  myPlayerId: string;
  onStart: () => void;
  onGoHome?: () => void;
}

export function Lobby({ onJoin }: LobbyProps) {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json() as { roomId: string; hostPlayerId: string };
      localStorage.setItem('playerName', playerName.trim());
      onJoin(data.roomId, playerName.trim(), true, data.hostPlayerId, data.hostPlayerId);
    } catch {
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    if (!roomIdInput.trim()) { setError('Enter a room code'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomIdInput.trim()}/join`, { method: 'POST' });
      if (!res.ok) { setError('Room not found'); setLoading(false); return; }
      const data = await res.json() as { playerId: string; hostPlayerId: string };
      localStorage.setItem('playerName', playerName.trim());
      onJoin(roomIdInput.trim(), playerName.trim(), false, data.playerId, data.hostPlayerId);
    } catch {
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>☠️ Dead of Winter</div>
        <p style={styles.subtitle}>A cooperative survival game for 2–4 players</p>
        <input
          style={styles.input}
          placeholder="Your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
        />
        <button style={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
          Create Room
        </button>
        <div style={styles.divider}>— or join existing —</div>
        <input
          style={styles.input}
          placeholder="Room code"
          value={roomIdInput}
          onChange={e => setRoomIdInput(e.target.value)}
        />
        <button style={styles.btnSecondary} onClick={handleJoin} disabled={loading}>
          Join Room
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export function WaitingRoom({ roomId, players, isHost, myPlayerId, onStart, onGoHome }: WaitingRoomProps) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>Waiting Room</div>
        <p style={styles.subtitle}>Room: <strong>{roomId}</strong></p>
        <div style={styles.playerList}>
          {players.map(p => (
            <div key={p.playerId} style={styles.playerRow}>
              <span>{p.name}</span>
              {p.playerId === myPlayerId && <span style={styles.badge}>You</span>}
              {isHost && p.playerId === myPlayerId && <span style={styles.badgeHost}>Host</span>}
            </div>
          ))}
        </div>
        {isHost ? (
          <button style={{ ...styles.btnPrimary, marginTop: 24 }} onClick={onStart} disabled={players.length < 2}>
            {players.length < 2 ? 'Waiting for players...' : 'Start Game'}
          </button>
        ) : (
          <p style={styles.waiting}>Waiting for host to start...</p>
        )}
        {onGoHome && (
          <button onClick={onGoHome} style={{ ...styles.btnSecondary, marginTop: 4, fontSize: '0.9rem' }}>
            🏠 Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
  },
  card: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 12,
    padding: 40,
    width: 360,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    textAlign: 'center',
  },
  title: { fontSize: '2rem', fontWeight: 700, color: '#e0e0e0' },
  subtitle: { color: '#888', fontSize: '0.9rem' },
  input: {
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid #0f3460',
    background: '#0d1117',
    color: '#e0e0e0',
    fontSize: '1rem',
  },
  btnPrimary: {
    padding: '12px',
    borderRadius: 6,
    border: 'none',
    background: '#8b1a1a',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '12px',
    borderRadius: 6,
    border: '1px solid #0f3460',
    background: 'transparent',
    color: '#e0e0e0',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  divider: { color: '#555', fontSize: '0.85rem', margin: '4px 0' },
  error: { color: '#e57373', fontSize: '0.9rem' },
  playerList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#0d1117',
    borderRadius: 6,
    border: '1px solid #0f3460',
  },
  badge: {
    background: '#0f3460',
    color: '#90caf9',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
  },
  badgeHost: {
    background: '#8b1a1a',
    color: '#ffcdd2',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    marginLeft: 4,
  },
  waiting: { color: '#888', fontSize: '0.9rem', marginTop: 16 },
};
