import React from 'react';
import { PlayerScoreResult, PlayerState, SPECIES_DISPLAY, SPECIES_COLORS } from '../game/types';

interface ScoreScreenProps {
  results: PlayerScoreResult[];
  players: PlayerState[];
  onPlayAgain?: () => void;
  onGoHome?: () => void;
}

function getPlayerName(players: PlayerState[], playerId: string): string {
  return players.find(p => p.playerId === playerId)?.name ?? playerId;
}

export function ScoreScreen({ results, players, onPlayAgain, onGoHome }: ScoreScreenProps) {
  const sorted = [...results].sort((a, b) => b.total - a.total);
  const winner = sorted[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px',
        gap: 24,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f5c842' }}>
          Game Over!
        </h1>
        <p style={{ color: 'var(--color-text-dim)', marginTop: 4 }}>
          {getPlayerName(players, winner.playerId)} wins with {winner.total} points!
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {sorted.map((result, rank) => (
          <div
            key={result.playerId}
            style={{
              background: rank === 0 ? 'rgba(245,200,66,0.15)' : 'var(--color-surface)',
              border: rank === 0 ? '2px solid #f5c842' : '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '16px 24px',
              minWidth: 160,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>
              {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {getPlayerName(players, result.playerId)}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: rank === 0 ? '#f5c842' : 'var(--color-accent)' }}>
              {result.total}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>points</div>
          </div>
        ))}
      </div>

      {/* Detailed breakdown */}
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ textAlign: 'center', fontSize: 18, color: 'var(--color-text-dim)' }}>Score Breakdown</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {sorted.map(result => (
            <div
              key={result.playerId}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 16,
                minWidth: 260,
                flex: 1,
                maxWidth: 380,
              }}
            >
              <h3 style={{ marginBottom: 12, fontSize: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                {getPlayerName(players, result.playerId)}
                <span style={{ float: 'right', color: 'var(--color-accent)', fontWeight: 800 }}>
                  {result.total} pts
                </span>
              </h3>

              {result.breakdown.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No scoring paths</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.breakdown.map(bd => {
                    const color = SPECIES_COLORS[bd.species];
                    return (
                      <div
                        key={bd.species}
                        style={{
                          background: 'var(--color-surface-raised)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color }}>
                            {SPECIES_DISPLAY[bd.species]}
                          </span>
                          <span style={{ fontWeight: 700 }}>{bd.total} pts</span>
                        </div>

                        {/* Path display */}
                        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 4 }}>
                          Path: {bd.path.map(p => `${p.card.value}${p.card.species === bd.species ? '' : '*'}`).join(' → ')}
                        </div>

                        {/* Breakdown */}
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <span>{bd.basePoints} base</span>
                          {bd.sameSpeciesBonus > 0 && <span style={{ color: '#f5c842' }}>+{bd.sameSpeciesBonus} same</span>}
                          {bd.startsWithOne > 0 && <span style={{ color: '#5bc0de' }}>+{bd.startsWithOne} starts w/1</span>}
                          {bd.endsWithEight > 0 && <span style={{ color: '#f0ad4e' }}>+{bd.endsWithEight} ends w/8</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {onPlayAgain && (
        <button className="primary" onClick={onPlayAgain} style={{ padding: '12px 32px', fontSize: 16 }}>
          Play Again
        </button>
      )}
      {onGoHome && (
        <button onClick={onGoHome} style={{
          padding: '10px 32px', borderRadius: 6,
          border: '1px solid var(--color-border)', background: 'transparent',
          color: 'var(--color-text-muted)', fontSize: 14, cursor: 'pointer',
        }}>
          🏠 Back to Lobby
        </button>
      )}
    </div>
  );
}
