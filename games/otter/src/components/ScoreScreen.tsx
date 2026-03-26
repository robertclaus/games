import React from 'react';

interface PlayerInfo {
  playerId: string;
  name: string;
  handCount: number;
  luckyStones: number;
}

interface ScoreScreenProps {
  winnerId: string;
  players: PlayerInfo[];
  isHost: boolean;
  onPlayAgain: () => void;
}

export function ScoreScreen({ winnerId, players, isHost, onPlayAgain }: ScoreScreenProps) {
  const winner = players.find(p => p.playerId === winnerId);
  const sorted = [...players].sort((a, b) => b.luckyStones - a.luckyStones);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: '3rem', marginBottom: 4 }}>🦦</div>
        <div style={styles.title}>Game Over!</div>
        {winner && (
          <div style={styles.winnerBanner}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <span style={{ fontWeight: 800, color: '#00acc1', fontSize: '1.2rem' }}>{winner.name}</span>
            <span style={{ color: '#b0bec5' }}>wins!</span>
          </div>
        )}

        <div style={styles.scoreList}>
          <div style={styles.scoreHeader}>
            <span>Player</span>
            <span>Lucky Stones</span>
          </div>
          {sorted.map((p, i) => (
            <div
              key={p.playerId}
              style={{
                ...styles.scoreRow,
                background: p.playerId === winnerId ? 'rgba(0,172,193,0.15)' : '#0a1628',
                border: p.playerId === winnerId ? '1px solid #00acc1' : '1px solid #1a3a5c',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#455a64', fontSize: '0.85rem' }}>#{i + 1}</span>
                <span style={{ fontWeight: p.playerId === winnerId ? 700 : 400 }}>
                  {p.name}
                </span>
                {p.playerId === winnerId && (
                  <span style={{ fontSize: '0.75rem', color: '#00acc1', fontWeight: 700 }}>WINNER</span>
                )}
              </span>
              <span style={{ fontWeight: 700, color: '#00acc1' }}>
                {'🪨'.repeat(p.luckyStones) || '—'}
                <span style={{ color: '#78909c', fontWeight: 400, fontSize: '0.85rem', marginLeft: 4 }}>
                  ({p.luckyStones})
                </span>
              </span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button style={styles.btn} onClick={onPlayAgain}>
            Play Again
          </button>
        ) : (
          <p style={{ color: '#78909c', fontSize: '0.9rem', textAlign: 'center' }}>
            Waiting for host to start a new game...
          </p>
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
    borderRadius: 16,
    padding: '40px 48px',
    minWidth: 380,
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 8px 32px rgba(0,172,193,0.2)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#e0f2f1',
  },
  winnerBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,172,193,0.1)',
    border: '1px solid #00acc1',
    borderRadius: 10,
    padding: '10px 20px',
  },
  scoreList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  scoreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: '0.75rem',
    color: '#455a64',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 8,
    color: '#e0f2f1',
  },
  btn: {
    marginTop: 8,
    padding: '12px 40px',
    background: '#00acc1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
