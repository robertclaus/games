import React, { useState } from 'react';
import { SpyCharacter, SPY_CHARACTERS, SPY_EMOJI } from '../game/types';

interface LobbyProps {
  onJoinRoom: (
    roomId: string,
    playerId: string,
    playerName: string,
    isHost: boolean,
    hostPlayerId: string,
    character: SpyCharacter
  ) => void;
}

export function Lobby({ onJoinRoom }: LobbyProps) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [roomId, setRoomId] = useState('');
  const [character, setCharacter] = useState<SpyCharacter>('Denis');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!playerName.trim()) { setError('Please enter your name'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || 'Failed to create room');
        setLoading(false);
        return;
      }

      const data = await res.json() as { roomId: string; hostPlayerId: string };
      setLoading(false);
      localStorage.setItem('playerName', playerName.trim());
      onJoinRoom(data.roomId, data.hostPlayerId, playerName.trim(), true, data.hostPlayerId, character);
    } catch {
      setError('Could not connect to server');
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) { setError('Please enter your name'); return; }
    if (!roomId.trim()) { setError('Please enter a room code'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${roomId.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || 'Failed to join room');
        setLoading(false);
        return;
      }

      const joinData = await res.json() as { playerId: string };
      const roomCode = roomId.trim().toUpperCase();
      const infoRes = await fetch(`/api/rooms/${roomCode}`);
      const infoData = infoRes.ok
        ? await infoRes.json() as { hostPlayerId: string }
        : { hostPlayerId: '' };

      setLoading(false);
      localStorage.setItem('playerName', playerName.trim());
      onJoinRoom(roomCode, joinData.playerId, playerName.trim(), false, infoData.hostPlayerId, character);
    } catch {
      setError('Could not connect to server');
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--color-surface)',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    padding: '40px 48px',
    minWidth: 360,
    maxWidth: 460,
    width: '100%',
    boxShadow: 'var(--shadow-elevated)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  };

  const CharacterPicker = () => (
    <div>
      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--color-text-dim)' }}>
        Choose Your Spy
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {SPY_CHARACTERS.map(c => (
          <button
            key={c}
            onClick={() => setCharacter(c)}
            style={{
              background: character === c ? 'rgba(0,255,136,0.15)' : 'var(--color-surface-raised)',
              border: character === c ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: character === c ? 'var(--color-accent)' : 'var(--color-text)',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 24 }}>{SPY_EMOJI[c]}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{c}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={card}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>🕵️</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', color: 'var(--color-accent)', textShadow: '0 0 20px rgba(0,255,136,0.4)' }}>
            SPYOUTS
          </h1>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 13, marginTop: 4 }}>
            The code-cracking card game
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
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                maxLength={24}
              />
            </div>
            <CharacterPicker />
            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: '8px', background: 'rgba(248,81,73,0.1)', borderRadius: 4 }}>
                {error}
              </div>
            )}
            <button className="primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button className="secondary" onClick={() => { setMode('home'); setError(''); }}>Back</button>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                autoFocus
                maxLength={24}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>Room Code</label>
              <input
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={e => setRoomId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                style={{ letterSpacing: '2px', fontWeight: 600 }}
                maxLength={8}
              />
            </div>
            <CharacterPicker />
            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: '8px', background: 'rgba(248,81,73,0.1)', borderRadius: 4 }}>
                {error}
              </div>
            )}
            <button className="primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button className="secondary" onClick={() => { setMode('home'); setError(''); }}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
