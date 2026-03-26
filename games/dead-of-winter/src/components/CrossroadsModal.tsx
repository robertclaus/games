import React from 'react';
import { ActiveCrossroads } from '../game/types';

interface CrossroadsModalProps {
  activeCrossroads: ActiveCrossroads;
  myPlayerId: string;
  onVote: (optionIndex: 0 | 1) => void;
}

export function CrossroadsModal({ activeCrossroads, myPlayerId, onVote }: CrossroadsModalProps) {
  const { card, votes } = activeCrossroads;
  const myVote = votes[myPlayerId];
  const hasVoted = myVote !== undefined;

  const voteCounts = [0, 1].map(i =>
    Object.values(votes).filter(v => v === i).length
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.badge}>⚡ Crossroads Event</div>
        <div style={styles.title}>{card.title}</div>
        <p style={styles.flavour}>{card.flavourText}</p>

        <div style={styles.options}>
          {card.options.map((opt, i) => (
            <div
              key={i}
              style={{
                ...styles.optionCard,
                borderColor: myVote === i ? '#f57c00' : '#0f3460',
                background: myVote === i ? '#2a1a0e' : '#0d1117',
              }}
            >
              <div style={styles.optionLabel}>{opt.label}</div>
              <div style={styles.optionDesc}>{opt.description}</div>
              <div style={styles.voteCount}>
                {voteCounts[i]} vote{voteCounts[i] !== 1 ? 's' : ''}
              </div>
              {!hasVoted && (
                <button style={styles.voteBtn} onClick={() => onVote(i as 0 | 1)}>
                  Vote
                </button>
              )}
            </div>
          ))}
        </div>

        {hasVoted && (
          <p style={styles.waitMsg}>Voted — waiting for all players...</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: '#16213e',
    border: '2px solid #f57c00',
    borderRadius: 12,
    padding: 32,
    maxWidth: 540,
    width: '90%',
  },
  badge: {
    display: 'inline-block',
    background: '#f57c00',
    color: '#fff',
    padding: '2px 10px',
    borderRadius: 4,
    fontSize: '0.75rem',
    marginBottom: 10,
    fontWeight: 700,
  },
  title: { fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 },
  flavour: { color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: 20 },
  options: { display: 'flex', gap: 12 },
  optionCard: {
    flex: 1,
    border: '2px solid',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  optionLabel: { fontWeight: 700, fontSize: '1rem' },
  optionDesc: { color: '#aaa', fontSize: '0.85rem', flex: 1 },
  voteCount: { color: '#888', fontSize: '0.8rem' },
  voteBtn: {
    padding: '6px 12px',
    background: '#f57c00',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    marginTop: 4,
  },
  waitMsg: { color: '#888', fontSize: '0.85rem', textAlign: 'center', marginTop: 16 },
};
