import React from 'react';
import { PlayerState } from '../game/types';

interface ScoreScreenProps {
  players: PlayerState[];
  isHost: boolean;
  onPlayAgain: () => void;
}

export function ScoreScreen({ players, isHost, onPlayAgain }: ScoreScreenProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const winners = sorted.filter(p => p.score === topScore);

  const winnerText = winners.length === 1
    ? `🏆 ${winners[0].name} wins with ${topScore} card${topScore !== 1 ? 's' : ''}!`
    : `🏆 It's a tie! ${winners.map(w => w.name).join(' & ')} win with ${topScore} card${topScore !== 1 ? 's' : ''}!`;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>👻 Game Over!</div>
        <div style={styles.winnerBanner}>{winnerText}</div>
        <div style={styles.scoreList}>
          {sorted.map((player, i) => {
            const isTopPlayer = player.score === topScore;
            return (
              <div
                key={player.playerId}
                style={{
                  ...styles.scoreRow,
                  border: isTopPlayer ? '2px solid #f59e0b' : '1px solid #4c1d95',
                  background: isTopPlayer ? 'rgba(245,158,11,0.12)' : '#1a0a2e',
                }}
              >
                <span style={styles.rank}>#{i + 1}</span>
                <span style={styles.playerName}>{player.name}</span>
                <span style={styles.playerScore}>
                  🃏 × {player.score}
                </span>
              </div>
            );
          })}
        </div>
        {isHost ? (
          <button style={styles.btnPrimary} onClick={onPlayAgain}>
            Play Again
          </button>
        ) : (
          <p style={styles.waiting}>Waiting for host to start a new game...</p>
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
    width: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#c4b5fd',
  },
  winnerBanner: {
    background: 'rgba(245,158,11,0.15)',
    border: '1px solid #f59e0b',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#fcd34d',
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  scoreList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderRadius: 8,
  },
  rank: {
    color: '#a78bfa',
    fontWeight: 700,
    fontSize: '0.9rem',
    minWidth: 28,
    textAlign: 'left',
  },
  playerName: {
    flex: 1,
    color: '#e0d7ff',
    fontWeight: 600,
    fontSize: '1rem',
    textAlign: 'left',
  },
  playerScore: {
    color: '#c4b5fd',
    fontWeight: 700,
    fontSize: '1rem',
  },
  btnPrimary: {
    padding: '14px',
    borderRadius: 6,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
  waiting: {
    color: '#a78bfa',
    fontSize: '0.9rem',
    marginTop: 8,
  },
};
