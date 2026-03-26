import React from 'react';
import { CardInstance } from '../game/types';
import { CardTile } from './CardTile';

interface CommonPileProps {
  topCard: CardInstance | null;
  remaining: number;
  lengthRequired: number;
}

export function CommonPile({ topCard, remaining, lengthRequired }: CommonPileProps) {
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
        Common Card
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Card display */}
        <div style={{ flexShrink: 0 }}>
          {topCard ? (
            <CardTile card={topCard} />
          ) : (
            <div style={{
              width: 64,
              height: 88,
              borderRadius: 6,
              border: '2px dashed #5C3D1A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5C3D1A',
              fontSize: 12,
            }}>
              Empty
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#8B6914', marginBottom: 2 }}>Remaining</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F5E6C8' }}>
              {remaining} / 6
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#8B6914', marginBottom: 4 }}>
              Word length to gain:
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[3, 4, 5, 6, 7, 8].map(len => (
                <div
                  key={len}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    background: len === lengthRequired
                      ? '#C5A028'
                      : len < lengthRequired
                        ? '#2C1A0E'
                        : '#3D2514',
                    color: len === lengthRequired
                      ? '#2C1A0E'
                      : len < lengthRequired
                        ? '#5C3D1A'
                        : '#F5E6C8',
                    border: `1px solid ${len === lengthRequired ? '#C5A028' : '#5C3D1A'}`,
                    textDecoration: len < lengthRequired ? 'line-through' : 'none',
                  }}
                >
                  {len}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#8B6914', marginTop: 4 }}>
              {remaining > 0
                ? `Spell a ${lengthRequired}+ letter word to gain this card`
                : 'No more common cards — game will end this turn!'}
            </div>
          </div>
        </div>
      </div>

      {topCard && (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: '#C5A028',
          fontStyle: 'italic',
        }}>
          This card can be used as any vowel (A/E/I/O/U) in your word
        </div>
      )}
    </div>
  );
}
