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
    setLoading(true);
    setError('');
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
    setError('');
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
        <div style={styles.title}>🦦 Otter</div>
        <p style={styles.subtitle}>A card game for 2–4 players</p>
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
  onGoHome?: () => void;
}

export function WaitingRoom({ roomId, players, isHost, myPlayerId, onStart, onGoHome }: WaitingRoomProps) {
  const canStart = players.length >= 2 && players.length <= 4;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>🦦 Otter</div>
        <p style={styles.subtitle}>Waiting Room</p>
        <div style={styles.roomCode}>
          <span style={styles.roomCodeLabel}>Room Code:</span>
          <span style={styles.roomCodeValue}>{roomId}</span>
        </div>
        <p style={{ color: '#90caf9', fontSize: '0.8rem', textAlign: 'center' }}>
          Share this code with friends (2–4 players)
        </p>
        <div style={styles.playerList}>
          {players.map((p, i) => (
            <div key={p.playerId} style={styles.playerRow}>
              <span>🦦 {p.name}</span>
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
          {players.length < 2 && (
            <div style={{ ...styles.playerRow, justifyContent: 'center', color: '#888', fontStyle: 'italic' }}>
              Waiting for more players...
            </div>
          )}
        </div>
        {isHost ? (
          <button
            style={{ ...styles.btnPrimary, marginTop: 8, opacity: canStart ? 1 : 0.5 }}
            onClick={onStart}
            disabled={!canStart}
          >
            {canStart ? `Start Game (${players.length} players)` : `Need at least 2 players`}
          </button>
        ) : (
          <p style={styles.waiting}>Waiting for host to start the game...</p>
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
    background: '#0a1628',
  },
  card: {
    background: '#0d2137',
    border: '1px solid #1a3a5c',
    borderRadius: 12,
    padding: 40,
    width: 380,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,172,193,0.15)',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#00acc1',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#78909c',
    fontSize: '0.9rem',
    marginBottom: 8,
  },
  input: {
    padding: '11px 14px',
    borderRadius: 6,
    border: '1px solid #1a3a5c',
    background: '#0a1628',
    color: '#e0f2f1',
    fontSize: '1rem',
    outline: 'none',
  },
  btnPrimary: {
    padding: '12px',
    borderRadius: 6,
    border: 'none',
    background: '#00acc1',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '12px',
    borderRadius: 6,
    border: '1px solid #1a3a5c',
    background: 'transparent',
    color: '#e0f2f1',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  divider: {
    color: '#455a64',
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
    color: '#78909c',
    fontSize: '0.9rem',
  },
  roomCodeValue: {
    fontFamily: 'monospace',
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '4px',
    color: '#00acc1',
    background: 'rgba(0,172,193,0.1)',
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid #1a3a5c',
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
    background: '#0a1628',
    borderRadius: 6,
    border: '1px solid #1a3a5c',
    color: '#e0f2f1',
  },
  badge: {
    background: '#1a3a5c',
    color: '#90caf9',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
  },
  badgeHost: {
    background: '#00acc1',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  waiting: {
    color: '#78909c',
    fontSize: '0.9rem',
    marginTop: 8,
  },
};
