import React from 'react';
import { Card } from '../game/types';
import { CardComponent } from './CardComponent';

interface BoxProps {
  box: (Card | null)[];
  deckCount: number;
  discardTop: Card | null;
  canDraw: boolean;       // true during draw phase
  canSwap: boolean;       // true during play phase
  selectedHandCardId?: string; // if a card is selected in hand for swapping
  onDrawFromBox?: (index: number) => void;
  onSwapWithBox?: (index: number) => void;
}

export function BoxComponent({
  box,
  deckCount,
  discardTop,
  canDraw,
  canSwap,
  selectedHandCardId,
  onDrawFromBox,
  onSwapWithBox,
}: BoxProps) {
  function handleSlotClick(index: number) {
    if (canDraw && onDrawFromBox) {
      onDrawFromBox(index);
    } else if (canSwap && selectedHandCardId && onSwapWithBox) {
      onSwapWithBox(index);
    }
  }

  const isClickable = canDraw || (canSwap && !!selectedHandCardId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
        The Box
      </div>

      {/* Box cards */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {box.map((card, i) => (
          <div key={i} style={{ position: 'relative' }}>
            {card ? (
              <CardComponent
                card={card}
                size="md"
                playable={isClickable}
                onClick={isClickable ? () => handleSlotClick(i) : undefined}
                style={{
                  outline: isClickable ? '2px solid rgba(0,255,136,0.3)' : undefined,
                }}
              />
            ) : (
              <div style={{
                width: 72, height: 100, borderRadius: 8,
                border: '2px dashed var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-muted)', fontSize: 24,
              }}>
                —
              </div>
            )}
            {isClickable && card && (
              <div style={{
                position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
                fontSize: 9, color: 'var(--color-accent)', fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                {canDraw ? 'TAKE' : 'SWAP'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Draw pile & discard */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 8 }}>
        {/* Draw pile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 60, height: 84, borderRadius: 8,
            background: 'repeating-linear-gradient(45deg, var(--color-surface), var(--color-surface) 4px, var(--color-surface-raised) 4px, var(--color-surface-raised) 8px)',
            border: canDraw ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--color-accent)',
            cursor: 'default',
            boxShadow: deckCount > 0 ? '2px 2px 0 var(--color-border)' : undefined,
          }}>
            {deckCount}
          </div>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>DECK</span>
        </div>

        {/* Discard pile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {discardTop ? (
            <CardComponent card={discardTop} size="sm" style={{ opacity: 0.6 }} />
          ) : (
            <div style={{
              width: 52, height: 72, borderRadius: 8,
              border: '2px dashed var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--color-text-muted)', opacity: 0.4,
            }}>
              —
            </div>
          )}
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>DISCARD</span>
        </div>
      </div>
    </div>
  );
}
