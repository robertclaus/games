import React from 'react';
import { VaultSlot, Card, CodeCard } from '../game/types';
import { CardComponent } from './CardComponent';

interface VaultProps {
  vault: [boolean, boolean, boolean] | VaultSlot[]; // public = booleans, private = actual cards
  code?: CodeCard;         // only provided for own vault
  isOwner: boolean;
  handCards?: Card[];      // to highlight which slots can be filled
  onSlotClick?: (slot: number) => void;
  size?: 'sm' | 'md';
}

export function VaultComponent({ vault, code, isOwner, handCards, onSlotClick, size = 'md' }: VaultProps) {
  const slotSize = size === 'sm' ? 60 : 80;
  const labelSize = size === 'sm' ? 11 : 13;

  function canPlaceInSlot(slotIndex: number): boolean {
    if (!isOwner || !handCards || !code) return false;
    // Check if slot is empty
    const slotFilled = isOwner
      ? (vault as VaultSlot[])[slotIndex] !== null
      : (vault as boolean[])[slotIndex];
    if (slotFilled) return false;

    const requiredDigit = code.digits[slotIndex];
    return handCards.some(c =>
      (c.kind === 'number' && (c as import('../game/types').NumberCard).value === requiredDigit) ||
      (c.kind === 'action' && (c as import('../game/types').ActionCard).action === 'MasterOfForgery')
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      {[0, 1, 2].map(i => {
        const isFilledBool = isOwner
          ? (vault as VaultSlot[])[i] !== null
          : (vault as boolean[])[i];
        const actualCard = isOwner ? (vault as VaultSlot[])[i] : null;
        const canPlace = canPlaceInSlot(i);

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* Code digit label (owner only) */}
            {isOwner && code && (
              <div style={{
                fontSize: labelSize - 1,
                color: 'var(--color-text-muted)',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}>
                ={code.digits[i]}
              </div>
            )}
            {/* Slot label */}
            <div style={{ fontSize: labelSize - 2, color: 'var(--color-text-muted)' }}>
              Slot {i + 1}
            </div>

            {/* Slot itself */}
            <div
              className={`vault-slot${isFilledBool ? ' filled' : ''}${canPlace ? ' can-place' : ''}`}
              style={{
                width: slotSize,
                height: slotSize * 1.4,
                cursor: canPlace && onSlotClick ? 'pointer' : 'default',
                overflow: 'hidden',
              }}
              onClick={canPlace && onSlotClick ? () => onSlotClick(i) : undefined}
            >
              {isFilledBool ? (
                isOwner && actualCard ? (
                  // Owner sees actual card at smaller size
                  <div style={{ transform: size === 'sm' ? 'scale(0.75)' : 'scale(0.85)', transformOrigin: 'center' }}>
                    <CardComponent card={actualCard} size="sm" />
                  </div>
                ) : (
                  // Others see only a check
                  <span style={{ fontSize: size === 'sm' ? 20 : 26, color: 'var(--color-accent)' }}>✓</span>
                )
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: size === 'sm' ? 18 : 22, opacity: 0.3 }}>?</div>
                  {canPlace && (
                    <div style={{ fontSize: 9, color: 'var(--color-accent)', marginTop: 2 }}>TAP</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
