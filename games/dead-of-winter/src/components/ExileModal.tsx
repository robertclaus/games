import React from 'react';
import { ExileVote, PublicPlayerState } from '../game/types';

interface ExileModalProps {
  vote: ExileVote;
  myPlayerId: string;
  players: PublicPlayerState[];
  onVote: (v: boolean) => void;
}

export function ExileModal({ vote, myPlayerId, players, onVote }: ExileModalProps) {
  const targetName = players.find(p => p.playerId === vote.targetId)?.name ?? vote.targetId;
  const initiatorName = players.find(p => p.playerId === vote.initiatorId)?.name ?? vote.initiatorId;
  const myVote = vote.votes[myPlayerId];
  const hasVoted = myVote !== undefined;

  const yesCount = Object.values(vote.votes).filter(v => v).length;
  const noCount = Object.values(vote.votes).filter(v => !v).length;
  const totalVoters = players.filter(p => p.playerId !== vote.targetId).length;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.badge}>🗳️ Exile Vote</div>
        <div style={styles.title}>
          Exile <span style={{ color: '#e57373' }}>{targetName}</span>?
        </div>
        <p style={styles.desc}>
          <strong>{initiatorName}</strong> has called for {targetName}'s exile.
          A majority vote is required.
        </p>

        <div style={styles.tally}>
          <div style={styles.tallyItem}>
            <span style={styles.yes}>YES: {yesCount}</span>
          </div>
          <div style={styles.tallyItem}>
            <span style={styles.no}>NO: {noCount}</span>
          </div>
          <div style={styles.tallyItem}>
            <span style={styles.pending}>Pending: {totalVoters - yesCount - noCount}</span>
          </div>
        </div>

        {!hasVoted && vote.targetId !== myPlayerId && (
          <div style={styles.buttons}>
            <button style={styles.btnYes} onClick={() => onVote(true)}>Vote YES — Exile</button>
            <button style={styles.btnNo} onClick={() => onVote(false)}>Vote NO — Keep</button>
          </div>
        )}

        {vote.targetId === myPlayerId && (
          <p style={styles.target}>You are being voted on. You cannot vote.</p>
        )}

        {hasVoted && vote.targetId !== myPlayerId && (
          <p style={styles.waitMsg}>
            Voted <strong>{myVote ? 'YES' : 'NO'}</strong> — waiting for others...
          </p>
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
    border: '2px solid #8b1a1a',
    borderRadius: 12,
    padding: 32,
    maxWidth: 420,
    width: '90%',
  },
  badge: {
    display: 'inline-block',
    background: '#8b1a1a',
    color: '#fff',
    padding: '2px 10px',
    borderRadius: 4,
    fontSize: '0.75rem',
    marginBottom: 10,
    fontWeight: 700,
  },
  title: { fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 },
  desc: { color: '#aaa', fontSize: '0.9rem', marginBottom: 16 },
  tally: { display: 'flex', gap: 16, marginBottom: 20 },
  tallyItem: {},
  yes: { color: '#e57373', fontWeight: 700 },
  no: { color: '#81c784', fontWeight: 700 },
  pending: { color: '#888' },
  buttons: { display: 'flex', gap: 12 },
  btnYes: {
    flex: 1,
    padding: '10px',
    background: '#8b1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnNo: {
    flex: 1,
    padding: '10px',
    background: '#1a3a1a',
    color: '#81c784',
    border: '1px solid #388e3c',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  target: { color: '#e57373', fontSize: '0.9rem', fontStyle: 'italic' },
  waitMsg: { color: '#888', fontSize: '0.85rem', textAlign: 'center' },
};
