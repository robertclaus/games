import React from 'react';
import { PlayerPublicState, SPY_EMOJI, SpyCharacter, VaultSlot, CodeCard } from '../game/types';

interface ScoreScreenProps {
  winnerId: string;
  players: PlayerPublicState[];
  codes: Record<string, CodeCard>;
  vaults: Record<string, VaultSlot[]>;
  onPlayAgain: () => void;
}

export function ScoreScreen({ winnerId, players, codes, vaults, onPlayAgain }: ScoreScreenProps) {
  const winner = players.find(p => p.playerId === winnerId);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '2px solid var(--color-accent)',
        borderRadius: 16,
        padding: '40px 48px',
        maxWidth: 560,
        width: '100%',
        boxShadow: '0 0 40px rgba(0,255,136,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        alignItems: 'center',
        textAlign: 'center',
      }}>
        {/* Winner announcement */}
        <div>
          <div style={{ fontSize: 64, marginBottom: 8, animation: 'fadeIn 0.5s ease' }}>
            {winner ? SPY_EMOJI[winner.character as SpyCharacter] : '🕵️'}
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 900, color: 'var(--color-accent)',
            textShadow: '0 0 30px rgba(0,255,136,0.5)', letterSpacing: '-1px',
          }}>
            {winner?.name ?? 'Someone'}
          </h1>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>
            played SPYOUTS!
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-dim)', marginTop: 8 }}>
            All 3 vault slots filled — mission complete!
          </div>
        </div>

        {/* Player results */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            Agent Debrief
          </div>
          {players.map(p => {
            const code = codes[p.playerId];
            const vault = vaults[p.playerId] ?? [null, null, null];
            const filledCount = vault.filter(v => v !== null).length;
            const isWinner = p.playerId === winnerId;

            return (
              <div key={p.playerId} style={{
                background: isWinner ? 'rgba(0,255,136,0.08)' : 'var(--color-surface-raised)',
                border: isWinner ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
              }}>
                <span style={{ fontSize: 22 }}>{SPY_EMOJI[p.character as SpyCharacter]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: isWinner ? 'var(--color-accent)' : 'var(--color-text)' }}>
                    {p.name} {isWinner && '🏆'}
                  </div>
                  {code && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Code: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text)' }}>
                        {code.digits[0]}-{code.digits[1]}-{code.digits[2]}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: 4,
                      background: vault[i] !== null ? 'rgba(0,255,136,0.2)' : 'transparent',
                      border: vault[i] !== null ? '1px solid var(--color-accent)' : '1px dashed var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {vault[i] !== null ? '✓' : ''}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-dim)', minWidth: 40, textAlign: 'right' }}>
                  {filledCount}/3
                </div>
              </div>
            );
          })}
        </div>

        <button className="primary" style={{ padding: '14px 40px', fontSize: 16, letterSpacing: '0.5px' }} onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
