import React from 'react';
import { PublicGameState, PrivatePlayerState } from '../game/types';
import { OBJECTIVES } from '../game/content';

interface ScoreScreenProps {
  publicState: PublicGameState;
  privateState: PrivatePlayerState | null;
  myPlayerId: string;
  isHost: boolean;
  onPlayAgain: () => void;
}

export function ScoreScreen({ publicState, privateState, myPlayerId, isHost, onPlayAgain }: ScoreScreenProps) {
  // Colony survived if morale > 0 when the game ended (either time ran out or morale held)
  const colonyWon = publicState.morale > 0;
  const colonyLost = !colonyWon;

  const myObjective = privateState?.secretObjectiveId
    ? OBJECTIVES.find(o => o.id === privateState.secretObjectiveId)
    : null;

  const iWon = publicState.winners.includes(myPlayerId);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Colony result */}
        <div style={{
          ...styles.result,
          color: colonyWon ? '#81c784' : '#e57373',
        }}>
          {colonyWon ? '🏆 Colony Survived!' : '💀 Colony Fell'}
        </div>

        {publicState.gameOverReason && (
          <p style={styles.reason}>{publicState.gameOverReason}</p>
        )}

        {/* Personal result */}
        <div style={{
          ...styles.personalResult,
          borderColor: iWon ? '#81c784' : '#e57373',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {iWon ? '✓ Your objective: COMPLETE' : '✗ Your objective: FAILED'}
          </div>
          {myObjective && (
            <>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{myObjective.title}</div>
              <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 2 }}>{myObjective.description}</div>
              <div style={{
                display: 'inline-block',
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 4,
                background: myObjective.type === 'betrayer' ? '#8b1a1a' : '#0f3460',
                color: '#fff',
                fontSize: '0.75rem',
              }}>
                {myObjective.type}
              </div>
            </>
          )}
        </div>

        {/* Players summary */}
        <div style={styles.players}>
          {publicState.players.map(p => (
            <div key={p.playerId} style={styles.playerRow}>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={styles.tags}>
                {publicState.winners.includes(p.playerId) && (
                  <span style={{ ...styles.tag, background: '#1a3a1a', color: '#81c784' }}>Won</span>
                )}
                {publicState.losers.includes(p.playerId) && (
                  <span style={{ ...styles.tag, background: '#4a1010', color: '#e57373' }}>Lost</span>
                )}
                {p.isExiled && (
                  <span style={{ ...styles.tag, background: '#333', color: '#aaa' }}>Exiled</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={styles.stats}>
          <StatRow label="Final Morale" value={String(publicState.morale)} />
          <StatRow label="Food Remaining" value={String(publicState.food)} />
          <StatRow label="Rounds Survived" value={`${publicState.round - 1} / ${publicState.maxRounds}`} />
        </div>

        {isHost && (
          <button style={styles.btn} onClick={onPlayAgain}>
            Play Again
          </button>
        )}
        {!isHost && (
          <p style={styles.waiting}>Waiting for host to start a new game...</p>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #0f3460' }}>
      <span style={{ color: '#888', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 12,
    padding: 40,
    maxWidth: 480,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  result: {
    fontSize: '2rem',
    fontWeight: 700,
    textAlign: 'center',
  },
  reason: {
    color: '#aaa',
    fontSize: '0.9rem',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  personalResult: {
    border: '2px solid',
    borderRadius: 8,
    padding: '12px 16px',
  },
  players: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    background: '#0d1117',
    borderRadius: 4,
  },
  tags: { display: 'flex', gap: 4 },
  tag: {
    padding: '1px 6px',
    borderRadius: 3,
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  stats: { display: 'flex', flexDirection: 'column' },
  btn: {
    padding: '12px',
    background: '#8b1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '1rem',
    marginTop: 8,
  },
  waiting: {
    color: '#888',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginTop: 8,
  },
};
