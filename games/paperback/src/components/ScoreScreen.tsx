import React from 'react';
import { PublicPlayerState } from '../game/types';

interface ScoreScreenProps {
  players: PublicPlayerState[];
  isHost: boolean;
  onPlayAgain: () => void;
  onGoHome?: () => void;
}

const PLAYER_COLORS = ['#C5A028', '#4A90D9', '#E74C3C', '#27AE60'];

export function ScoreScreen({ players, isHost, onPlayAgain, onGoHome }: ScoreScreenProps) {
  // Sort by fame points descending; tiebreak by common cards gained
  const sorted = [...players].sort((a, b) => {
    if (b.famePoints !== a.famePoints) return b.famePoints - a.famePoints;
    return b.commonCardsGained - a.commonCardsGained;
  });
  const winner = sorted[0];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#2C1A0E',
    }}>
      <div style={{
        background: '#3D2514',
        border: '2px solid #C5A028',
        borderRadius: 12,
        padding: '40px 48px',
        minWidth: 380,
        maxWidth: 520,
        width: '100%',
        boxShadow: '0 8px 32px rgba(197,160,40,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        textAlign: 'center',
      }}>
        <div>
          <div style={{
            fontSize: '2.5rem',
            fontFamily: 'Georgia, serif',
            color: '#C5A028',
            fontWeight: 900,
            marginBottom: 8,
          }}>
            📖 Game Over!
          </div>
          {winner && (
            <div style={{ fontSize: 18, color: '#F5E6C8' }}>
              <span style={{ color: '#C5A028', fontWeight: 700 }}>{winner.name}</span>
              {' wins with '}
              <span style={{ color: '#FFD700', fontWeight: 700 }}>{winner.famePoints} fame points</span>
              {'!'}
            </div>
          )}
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 12,
            color: '#8B6914',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Final Standings
          </div>
          {sorted.map((player, rank) => (
            <div
              key={player.playerId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: rank === 0 ? 'rgba(197,160,40,0.15)' : '#2C1A0E',
                borderRadius: 8,
                border: `1px solid ${rank === 0 ? '#C5A028' : '#5C3D1A'}`,
              }}
            >
              {/* Rank */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: rank === 0 ? '#C5A028' : '#5C3D1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 900,
                color: rank === 0 ? '#2C1A0E' : '#F5E6C8',
                flexShrink: 0,
              }}>
                {rank + 1}
              </div>

              {/* Avatar */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: PLAYER_COLORS[players.indexOf(player) % PLAYER_COLORS.length],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}>
                {player.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div style={{
                flex: 1,
                textAlign: 'left',
                fontWeight: rank === 0 ? 700 : 500,
                color: rank === 0 ? '#C5A028' : '#F5E6C8',
              }}>
                {player.name}
              </div>

              {/* Fame points */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: rank === 0 ? '#FFD700' : '#F5E6C8',
                  fontFamily: 'Georgia, serif',
                }}>
                  {player.famePoints}
                </div>
                <div style={{ fontSize: 10, color: '#8B6914' }}>fame pts</div>
              </div>

              {/* Stars */}
              <div style={{ fontSize: 14, color: '#C5A028', minWidth: 40 }}>
                {'★'.repeat(Math.min(player.famePoints, 8))}
                {player.famePoints > 8 ? '...' : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Play Again */}
        {isHost ? (
          <button
            onClick={onPlayAgain}
            style={{
              padding: '12px 32px',
              borderRadius: 6,
              border: 'none',
              background: '#C5A028',
              color: '#2C1A0E',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
        ) : (
          <div style={{ color: '#8B6914', fontSize: 14 }}>
            Waiting for host to start a new game...
          </div>
        )}
        {onGoHome && (
          <button onClick={onGoHome} style={{
            padding: '10px 32px', borderRadius: 6,
            border: '1px solid #8B6914', background: 'transparent',
            color: '#8B6914', fontSize: '0.9rem', cursor: 'pointer',
          }}>
            🏠 Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
}
