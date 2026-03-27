import React, { useState } from 'react';

interface LobbyProps {
  onJoinRoom: (roomId: string, playerId: string, playerName: string, isHost: boolean, hostPlayerId: string) => void;
}

export function Lobby({ onJoinRoom }: LobbyProps) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create room');
        setLoading(false);
        return;
      }

      const data = await res.json() as { roomId: string; hostPlayerId: string };
      setLoading(false);
      localStorage.setItem('playerName', playerName.trim());
      onJoinRoom(data.roomId, data.hostPlayerId, playerName.trim(), true, data.hostPlayerId);
    } catch {
      setError('Could not connect to server');
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomId.trim()) {
      setError('Please enter a room code');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${roomId.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to join room');
        setLoading(false);
        return;
      }

      const joinData = await res.json() as { playerId: string };

      // Fetch room info to get the host player ID
      const roomCode = roomId.trim().toUpperCase();
      const infoRes = await fetch(`/api/rooms/${roomCode}`);
      const infoData = infoRes.ok
        ? await infoRes.json() as { hostPlayerId: string }
        : { hostPlayerId: '' };

      setLoading(false);
      localStorage.setItem('playerName', playerName.trim());
      onJoinRoom(roomCode, joinData.playerId, playerName.trim(), false, infoData.hostPlayerId);
    } catch {
      setError('Could not connect to server');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          padding: '40px 48px',
          minWidth: 360,
          maxWidth: 440,
          width: '100%',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>🌳</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: '#8fce8f' }}>
            Arboretum
          </h1>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 13, marginTop: 4 }}>
            The card game of beautiful trees
          </p>
        </div>

        {mode === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="primary" style={{ padding: '14px', fontSize: 16 }} onClick={() => setMode('create')}>
              Create New Game
            </button>
            <button className="secondary" style={{ padding: '14px', fontSize: 16 }} onClick={() => setMode('join')}>
              Join Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                style={{ width: '100%' }}
                maxLength={24}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: '8px', background: 'rgba(217,83,79,0.1)', borderRadius: 4 }}>
                {error}
              </div>
            )}

            <button className="primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button className="secondary" onClick={() => { setMode('home'); setError(''); }}>
              Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                autoFocus
                style={{ width: '100%' }}
                maxLength={24}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>
                Room Code
              </label>
              <input
                type="text"
                placeholder="Enter room code (e.g. AB12C)"
                value={roomId}
                onChange={e => setRoomId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                style={{ width: '100%', letterSpacing: '2px', fontWeight: 600 }}
                maxLength={8}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: '8px', background: 'rgba(217,83,79,0.1)', borderRadius: 4 }}>
                {error}
              </div>
            )}

            <button className="primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button className="secondary" onClick={() => { setMode('home'); setError(''); }}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
