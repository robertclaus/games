import React from 'react';
import { CrisisCard } from '../game/types';

interface CrisisPanelProps {
  crisis: CrisisCard | null;
  poolCount: number;
}

export function CrisisPanel({ crisis, poolCount }: CrisisPanelProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.label}>Crisis</div>
      {crisis ? (
        <>
          <div style={styles.title}>{crisis.title}</div>
          <div style={styles.desc}>{crisis.description}</div>
          <div style={styles.req}>
            Required: <strong>{crisis.requiredType}</strong>
          </div>
          <div style={styles.failEffect}>
            Fail: {crisis.failEffect}
          </div>
          <div style={styles.poolBar}>
            <span style={styles.poolLabel}>Contributions:</span>
            {[...Array(poolCount)].map((_, i) => (
              <span key={i} style={styles.poolDot} />
            ))}
            {poolCount === 0 && <span style={styles.noneYet}>none yet</span>}
          </div>
        </>
      ) : (
        <div style={styles.noCrisis}>No active crisis</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#2a0a0a',
    border: '1px solid #8b1a1a',
    borderRadius: 8,
    padding: '10px 12px',
  },
  label: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#e57373',
    marginBottom: 4,
  },
  title: { fontWeight: 700, fontSize: '0.95rem', color: '#ffcdd2', marginBottom: 4 },
  desc: { color: '#aaa', fontSize: '0.8rem', marginBottom: 6 },
  req: { color: '#ffb74d', fontSize: '0.8rem', marginBottom: 4 },
  failEffect: { color: '#e57373', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: 6 },
  poolBar: { display: 'flex', alignItems: 'center', gap: 4 },
  poolLabel: { color: '#888', fontSize: '0.75rem' },
  poolDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#8b1a1a',
    display: 'inline-block',
  },
  noneYet: { color: '#555', fontSize: '0.75rem' },
  noCrisis: { color: '#555', fontSize: '0.85rem', fontStyle: 'italic' },
};
