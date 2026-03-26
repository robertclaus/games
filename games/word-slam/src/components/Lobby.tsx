import React, { useState } from 'react';

// ── Theme helpers ──────────────────────────────────────────────────────────────

const BG       = '#0F172A';
const PANEL    = '#1E293B';
const BORDER   = '#334155';
const TEXT     = '#E2E8F0';
const MUTED    = '#94A3B8';
const RED_CLR  = '#EF4444';
const BLUE_CLR = '#3B82F6';
const ACCENT   = '#F59E0B';

interface LobbyProps {
  onJoin: (
    roomId: string,
    playerName: string,
    isHost: boolean,
    playerId: string,
    hostPlayerId: string,
  ) => void;
}

export function Lobby({ onJoin }: LobbyProps) {
  const [playerName, setPlayerName]   = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  async function handleCreate() {
    const name = playerName.trim();
    if (!name) { setError('Enter your name first'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json() as { roomId: string; hostPlayerId: string };
      onJoin(data.roomId, name, true, data.hostPlayerId, data.hostPlayerId);
    } catch {
      setError('Failed to create room');
      setLoading(false);
    }
  }

  async function handleJoin() {
    const name = playerName.trim();
    const rid  = roomIdInput.trim().toUpperCase();
    if (!name) { setError('Enter your name first'); return; }
    if (!rid)  { setError('Enter a room code'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/rooms/${rid}/join`, { method: 'POST' });
      if (!res.ok) { setError('Room not found'); setLoading(false); return; }
      const data = await res.json() as { playerId: string; hostPlayerId: string };
      onJoin(rid, name, false, data.playerId, data.hostPlayerId);
    } catch {
      setError('Failed to join room');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: PANEL,
        border: `2px solid ${BORDER}`,
        borderRadius: 16,
        padding: '40px 48px',
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: ACCENT, marginBottom: 4 }}>
            Word Slam
          </div>
          <div style={{ fontSize: 13, color: MUTED }}>
            Race your team to guess the word!
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10 }}>
            <span style={{ color: RED_CLR, fontWeight: 700, fontSize: 13 }}>🔴 Red Team</span>
            <span style={{ color: MUTED }}>vs</span>
            <span style={{ color: BLUE_CLR, fontWeight: 700, fontSize: 13 }}>🔵 Blue Team</span>
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Name
          </label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Enter your name"
            style={{
              display: 'block', width: '100%', marginTop: 4,
              padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${BORDER}`, background: BG,
              color: TEXT, fontSize: 15, outline: 'none',
            }}
          />
        </div>

        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            padding: '12px 0', borderRadius: 8, border: 'none',
            background: ACCENT, color: '#0F172A',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Create New Room
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
          <span style={{ color: MUTED, fontSize: 12 }}>or join existing</span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
        </div>

        {/* Join */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={roomIdInput}
            onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Room code"
            maxLength={6}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${BORDER}`, background: BG,
              color: TEXT, fontSize: 15, outline: 'none',
              textTransform: 'uppercase', letterSpacing: '2px',
            }}
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            style={{
              padding: '10px 16px', borderRadius: 8, border: `1px solid ${BORDER}`,
              background: PANEL, color: TEXT, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            Join
          </button>
        </div>

        {error && (
          <div style={{ color: '#F87171', fontSize: 13, textAlign: 'center' }}>{error}</div>
        )}
      </div>
    </div>
  );
}

// ── WaitingRoom ────────────────────────────────────────────────────────────────

interface WaitingPlayer {
  playerId: string;
  name: string;
}

interface WaitingRoomProps {
  roomId: string;
  players: WaitingPlayer[];
  isHost: boolean;
  myPlayerId: string;
  onStart: () => void;
}

export function WaitingRoom({ roomId, players, isHost, myPlayerId, onStart }: WaitingRoomProps) {
  const canStart = players.length >= 4;

  // Preview team split: even → red, odd → blue
  const redPlayers  = players.filter((_, i) => i % 2 === 0);
  const bluePlayers = players.filter((_, i) => i % 2 === 1);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: PANEL,
        border: `2px solid ${BORDER}`,
        borderRadius: 16,
        padding: '32px 40px',
        width: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: ACCENT }}>Word Slam</div>
          <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
            Room Code:
            <span style={{
              marginLeft: 8, fontFamily: 'monospace', fontSize: 18,
              fontWeight: 900, color: TEXT, letterSpacing: '4px',
            }}>
              {roomId}
            </span>
          </div>
        </div>

        {/* Team Preview */}
        <div style={{ display: 'flex', gap: 12 }}>
          <TeamPreview color={RED_CLR} label="🔴 Red Team" players={redPlayers} myPlayerId={myPlayerId} />
          <TeamPreview color={BLUE_CLR} label="🔵 Blue Team" players={bluePlayers} myPlayerId={myPlayerId} />
        </div>

        {/* Player count hint */}
        <div style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>
          {players.length} / 4+ players • Teams are assigned automatically by join order
        </div>

        {!canStart && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5', fontSize: 13, textAlign: 'center',
          }}>
            Need at least 4 players to start (2 per team)
          </div>
        )}

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            style={{
              padding: '13px 0', borderRadius: 8, border: 'none',
              background: canStart ? ACCENT : '#374151',
              color: canStart ? '#0F172A' : MUTED,
              fontSize: 16, fontWeight: 700,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            Start Game
          </button>
        ) : (
          <div style={{ textAlign: 'center', color: MUTED, fontSize: 14 }}>
            Waiting for host to start…
          </div>
        )}
      </div>
    </div>
  );
}

function TeamPreview({
  color, label, players, myPlayerId,
}: {
  color: string;
  label: string;
  players: WaitingPlayer[];
  myPlayerId: string;
}) {
  return (
    <div style={{
      flex: 1,
      background: BG,
      border: `1px solid ${color}44`,
      borderRadius: 10,
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
      {players.length === 0 ? (
        <div style={{ fontSize: 12, color: MUTED, fontStyle: 'italic' }}>No players yet</div>
      ) : (
        players.map(p => (
          <div key={p.playerId} style={{
            fontSize: 13, color: p.playerId === myPlayerId ? color : TEXT,
            fontWeight: p.playerId === myPlayerId ? 700 : 400,
            padding: '2px 0',
          }}>
            {p.name}{p.playerId === myPlayerId ? ' (you)' : ''}
          </div>
        ))
      )}
    </div>
  );
}
