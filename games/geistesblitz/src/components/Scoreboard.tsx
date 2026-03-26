import React from 'react';
import { PlayerState, RoundResult } from '../game/types';

interface ScoreboardProps {
  players: PlayerState[];
  myPlayerId: string;
  roundResult?: RoundResult | null;
}

export function Scoreboard({ players, myPlayerId, roundResult }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Scores</div>
      <div style={styles.list}>
        {sorted.map(player => {
          const isWinner = roundResult?.winnerId === player.playerId;
          const isWrongGuesser = roundResult?.wrongGuessers.includes(player.playerId) ?? false;
          const isMe = player.playerId === myPlayerId;

          let border = '1px solid #4c1d95';
          if (isWinner) border = '2px solid #f59e0b';
          else if (isMe) border = '1px solid #7c3aed';

          return (
            <div
              key={player.playerId}
              style={{
                ...styles.row,
                border,
                background: isWinner
                  ? 'rgba(245,158,11,0.12)'
                  : isMe
                  ? 'rgba(124,58,237,0.15)'
                  : '#1a0a2e',
              }}
            >
              <div style={styles.nameCol}>
                <span style={styles.name}>{player.name}</span>
                {isMe && <span style={styles.youBadge}>You</span>}
                {isWinner && <span style={styles.winnerBadge}>Won!</span>}
                {isWrongGuesser && !isWinner && (
                  <span style={styles.wrongBadge}>-1</span>
                )}
              </div>
              <div style={styles.scoreCol}>
                <span style={styles.scoreEmoji}>🃏</span>
                <span style={styles.score}>× {player.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#2d1254',
    border: '1px solid #7c3aed',
    borderRadius: 12,
    padding: '16px',
    minWidth: 220,
  },
  title: {
    color: '#c4b5fd',
    fontWeight: 700,
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 10,
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'background 0.3s, border 0.3s',
  },
  nameCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    color: '#e0d7ff',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  youBadge: {
    background: '#4c1d95',
    color: '#c4b5fd',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: '0.7rem',
  },
  winnerBadge: {
    background: '#f59e0b',
    color: '#1a0a2e',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  wrongBadge: {
    background: '#dc2626',
    color: '#fff',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  scoreCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  scoreEmoji: {
    fontSize: '1rem',
  },
  score: {
    color: '#c4b5fd',
    fontWeight: 700,
    fontSize: '1rem',
    minWidth: 32,
    textAlign: 'right',
  },
};
