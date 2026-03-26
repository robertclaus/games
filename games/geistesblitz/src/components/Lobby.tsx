import React, { useState } from 'react';

interface LobbyProps {
  onJoin: (
    roomId: string,
    playerName: string,
    isHost: boolean,
    playerId: string,
    hostPlayerId: string
  ) => void;
}

export function Lobby({ onJoin }: LobbyProps) {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    localStorage.setItem('playerName', playerName.trim());
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json() as { roomId: string; hostPlayerId: string };
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
    localStorage.setItem('playerName', playerName.trim());
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${roomIdInput.trim()}/join`, { method: 'POST' });
      if (!res.ok) { setError('Room not found'); setLoading(false); return; }
      const data = await res.json() as { playerId: string; hostPlayerId: string };
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
        <div style={styles.title}>👻 Geistesblitz</div>
        <p style={styles.subtitle}>A real-time reaction game for 1–8 players</p>
        <input
          style={styles.input}
          placeholder="Your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button style={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create Room'}
        </button>
        <div style={styles.divider}>— or join existing —</div>
        <input
          style={styles.input}
          placeholder="Room code"
          value={roomIdInput}
          onChange={e => setRoomIdInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button style={styles.btnSecondary} onClick={handleJoin} disabled={loading}>
          {loading ? 'Joining...' : 'Join Room'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
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

export function WaitingRoom({ roomId, players, isHost, myPlayerId, onStart }: WaitingRoomProps) {
  const canStart = players.length >= 1;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>👻 Geistesblitz</div>
        <p style={styles.subtitle}>Waiting Room</p>
        <div style={styles.roomCode}>
          <span style={styles.roomCodeLabel}>Room Code:</span>
          <span style={styles.roomCodeValue}>{roomId}</span>
        </div>
        <p style={{ color: '#c4b5fd', fontSize: '0.8rem', textAlign: 'center' }}>
          Play solo or share this code with friends
        </p>
        <div style={styles.playerList}>
          {players.map((p, i) => (
            <div key={p.playerId} style={styles.playerRow}>
              <span>👻 {p.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {p.playerId === myPlayerId && (
                  <span style={styles.badge}>You</span>
                )}
                {i === 0 && (
                  <span style={styles.badgeHost}>Host</span>
                )}
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <div style={{ ...styles.playerRow, justifyContent: 'center', color: '#888', fontStyle: 'italic' }}>
              Waiting for players...
            </div>
          )}
        </div>
        {isHost ? (
          <button
            style={{ ...styles.btnPrimary, marginTop: 8, opacity: canStart ? 1 : 0.5 }}
            onClick={onStart}
            disabled={!canStart}
          >
            {canStart
              ? players.length === 1
                ? 'Start Solo Game'
                : `Start Game (${players.length} players)`
              : 'Waiting for players...'}
          </button>
        ) : (
          <p style={styles.waiting}>Waiting for host to start the game...</p>
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
    background: '#1a0a2e',
  },
  card: {
    background: '#2d1254',
    border: '1px solid #7c3aed',
    borderRadius: 12,
    padding: 40,
    width: 380,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#c4b5fd',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#a78bfa',
    fontSize: '0.9rem',
    marginBottom: 8,
  },
  input: {
    padding: '11px 14px',
    borderRadius: 6,
    border: '1px solid #7c3aed',
    background: '#1a0a2e',
    color: '#e0d7ff',
    fontSize: '1rem',
    outline: 'none',
  },
  btnPrimary: {
    padding: '12px',
    borderRadius: 6,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '12px',
    borderRadius: 6,
    border: '1px solid #7c3aed',
    background: 'transparent',
    color: '#e0d7ff',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  divider: {
    color: '#6d28d9',
    fontSize: '0.85rem',
    margin: '4px 0',
  },
  error: {
    color: '#ef5350',
    fontSize: '0.9rem',
  },
  roomCode: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: '4px 0',
  },
  roomCodeLabel: {
    color: '#a78bfa',
    fontSize: '0.9rem',
  },
  roomCodeValue: {
    fontFamily: 'monospace',
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '4px',
    color: '#c4b5fd',
    background: 'rgba(124,58,237,0.2)',
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid #7c3aed',
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
    background: '#1a0a2e',
    borderRadius: 6,
    border: '1px solid #7c3aed',
    color: '#e0d7ff',
  },
  badge: {
    background: '#4c1d95',
    color: '#c4b5fd',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
  },
  badgeHost: {
    background: '#7c3aed',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  waiting: {
    color: '#a78bfa',
    fontSize: '0.9rem',
    marginTop: 8,
  },
};
