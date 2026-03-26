import React from 'react';
import { OtterState, TummyCard } from '../game/types';
import { SUIT_ICONS, RULE_ICONS } from '../game/deck';

interface OtterComponentProps {
  otter: OtterState;
  isValidTarget: boolean;
  isActive: boolean;
  onClick: () => void;
  selectedCard: TummyCard | null;
}

export function OtterComponent({ otter, isValidTarget, isActive, onClick, selectedCard }: OtterComponentProps) {
  const topCard = otter.tummy.length > 0 ? otter.tummy[otter.tummy.length - 1] : null;
  const headRule = otter.head.showing === 'A' ? otter.head.sideA : otter.head.sideB;
  const tailRule = otter.tail.showing === 'A' ? otter.tail.sideA : otter.tail.sideB;

  const borderColor = isActive
    ? '#00e5ff'
    : isValidTarget && selectedCard
      ? '#00acc1'
      : '#1a3a5c';

  const glowStyle = isActive
    ? '0 0 20px rgba(0,229,255,0.5), 0 0 40px rgba(0,229,255,0.2)'
    : isValidTarget && selectedCard
      ? '0 0 12px rgba(0,172,193,0.4)'
      : 'none';

  return (
    <div
      onClick={isValidTarget || isActive ? onClick : undefined}
      style={{
        background: '#0d2137',
        border: `2px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: (isValidTarget || isActive) ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: glowStyle,
        minWidth: 140,
        flex: 1,
        position: 'relative',
      }}
    >
      {/* Head card */}
      <div style={{
        background: '#112240',
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        border: '1px solid #1a3a5c',
      }}>
        <div style={{ fontSize: '0.65rem', color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          HEAD
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#00acc1' }}>
          {otter.head.name}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e0f2f1' }}>
          {RULE_ICONS[headRule]} {headRule}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#455a64' }}>
          Side {otter.head.showing}
        </div>
      </div>

      {/* Tummy pile */}
      <div style={{
        background: '#0a1628',
        borderRadius: 8,
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        border: '1px solid #1a3a5c',
        minHeight: 90,
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: '0.65rem', color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          TUMMY
        </div>
        {topCard ? (
          <>
            <div style={{
              background: '#0d2137',
              border: '2px solid #1a3a5c',
              borderRadius: 8,
              width: 56,
              height: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e0f2f1' }}>
                {topCard.value}
              </div>
              <div style={{ fontSize: '1.1rem' }}>
                {SUIT_ICONS[topCard.suit]}
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#78909c' }}>
              {otter.tummy.length} card{otter.tummy.length !== 1 ? 's' : ''}
            </div>
          </>
        ) : (
          <div style={{ color: '#455a64', fontSize: '0.8rem' }}>Empty</div>
        )}
      </div>

      {/* Tail card */}
      <div style={{
        background: '#112240',
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        border: '1px solid #1a3a5c',
      }}>
        <div style={{ fontSize: '0.65rem', color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          TAIL
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b0bec5' }}>
          {RULE_ICONS[tailRule]} {tailRule}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#455a64' }}>
          Side {otter.tail.showing}
        </div>
      </div>

      {/* Valid target indicator */}
      {isValidTarget && selectedCard && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#00acc1',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 10,
          whiteSpace: 'nowrap',
        }}>
          PLAY HERE
        </div>
      )}
    </div>
  );
}
