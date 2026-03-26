import React from 'react';
import { FamePile, TurnState, GameAction } from '../game/types';

interface FamePilesProps {
  famePiles: FamePile[];
  turnState: TurnState | null;
  myPlayerId: string;
  onAction: (action: GameAction) => void;
}

export function FamePiles({ famePiles, turnState, myPlayerId, onAction }: FamePilesProps) {
  const isMyTurn = turnState?.currentPlayerId === myPlayerId;
  const isBuying = isMyTurn && turnState?.phase === 'buying';
  const budget = turnState?.budgetRemaining ?? 0;

  return (
    <div style={{
      background: '#3D2514',
      border: '1px solid #5C3D1A',
      borderRadius: 8,
      padding: '12px 16px',
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#C5A028',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        Fame Cards
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {famePiles.map(pile => {
          const canAfford = isBuying && budget >= pile.cost && pile.count > 0;
          const empty = pile.count === 0;

          return (
            <div
              key={pile.rank}
              onClick={canAfford ? () => onAction({ type: 'BUY_FAME', rank: pile.rank }) : undefined}
              style={{
                background: empty ? '#2C1A0E' : '#FFF3B0',
                border: `2px solid ${canAfford ? '#C5A028' : empty ? '#3D2514' : '#B0905A'}`,
                borderRadius: 8,
                padding: '8px 12px',
                cursor: canAfford ? 'pointer' : 'default',
                opacity: empty ? 0.4 : (isBuying && !canAfford) ? 0.5 : 1,
                filter: (isBuying && !canAfford) ? 'grayscale(40%)' : undefined,
                minWidth: 80,
                textAlign: 'center',
                transition: 'box-shadow 0.1s',
                boxShadow: canAfford ? '0 0 8px rgba(197,160,40,0.6)' : undefined,
              }}
            >
              {/* Stars */}
              <div style={{
                fontSize: 16,
                color: empty ? '#5C3D1A' : '#C5A028',
                marginBottom: 2,
              }}>
                {'★'.repeat(pile.famePoints)}
              </div>

              {/* Fame points */}
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: empty ? '#5C3D1A' : '#2C1A0E',
                fontFamily: 'Georgia, serif',
              }}>
                {pile.famePoints} pt{pile.famePoints !== 1 ? 's' : ''}
              </div>

              {/* Cost */}
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: empty ? '#5C3D1A' : '#8B6914',
                marginTop: 2,
              }}>
                {pile.cost}¢
              </div>

              {/* Count */}
              <div style={{
                fontSize: 11,
                color: empty ? '#5C3D1A' : '#8B6914',
                marginTop: 2,
              }}>
                {pile.count} left
              </div>

              {/* Buy label */}
              {canAfford && (
                <div style={{
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#2C1A0E',
                  background: '#C5A028',
                  borderRadius: 3,
                  padding: '1px 4px',
                }}>
                  BUY
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
