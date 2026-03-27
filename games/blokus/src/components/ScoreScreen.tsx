import React from 'react';
import { PlayerState } from '../game/types';
import { PLAYER_COLORS } from './GameBoard';

interface ScoreScreenProps {
  players: PlayerState[];
  isHost: boolean;
  onPlayAgain: () => void;
  onGoHome?: () => void;
}

export function ScoreScreen({ players, isHost, onPlayAgain, onGoHome }: ScoreScreenProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div style={{
      minHeight: '100vh', background: '#0F172A', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1E293B', border: '1px solid #334155', borderRadius: 12,
        padding: 40, width: 440, textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#E2E8F0', marginBottom: 4 }}>
          Game Over
        </div>
        <div style={{ fontSize: 14, color: PLAYER_COLORS[winner.color], marginBottom: 28, fontWeight: 600 }}>
          🏆 {winner.name} wins!
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {sorted.map((p, i) => (
            <div key={p.playerId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 8,
              background: i === 0 ? `${PLAYER_COLORS[p.color]}18` : '#0F172A',
              border: `1px solid ${i === 0 ? PLAYER_COLORS[p.color] + '44' : '#1E293B'}`,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, background: PLAYER_COLORS[p.color], flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: PLAYER_COLORS[p.color] }}>
                  {i === 0 ? '🏆 ' : `${i + 1}. `}{p.name}
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  {p.placedAll
                    ? p.lastPieceWasMono ? '+20 bonus (all pieces + monomino last!)' : '+15 bonus (all pieces placed!)'
                    : `${p.remainingPieceIds.length} pieces remaining`}
                </div>
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: p.score >= 0 ? '#4ADE80' : '#EF4444',
              }}>
                {p.score > 0 ? `+${p.score}` : p.score}
              </div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button onClick={onPlayAgain} style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: '#3B82F6', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          }}>
            Play Again
          </button>
        ) : (
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Waiting for host to start a new game…</p>
        )}
        {onGoHome && (
          <button onClick={onGoHome} style={{
            width: '100%', padding: '10px', borderRadius: 8,
            border: '1px solid #334155', background: 'transparent',
            color: '#94A3B8', fontSize: '0.9rem', cursor: 'pointer',
          }}>
            🏠 Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
}
