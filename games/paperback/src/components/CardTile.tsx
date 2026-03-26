import React from 'react';
import { CardInstance } from '../game/types';

interface CardTileProps {
  card: CardInstance;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'small' | 'normal' | 'large';
}

export function CardTile({ card, selected = false, disabled = false, onClick, size = 'normal' }: CardTileProps) {
  const dims = {
    small:  { w: 52,  h: 72,  letterSize: 20, infoSize: 9,  padding: 4 },
    normal: { w: 64,  h: 88,  letterSize: 26, infoSize: 10, padding: 6 },
    large:  { w: 80,  h: 110, letterSize: 34, infoSize: 11, padding: 8 },
  }[size];

  // Background color by card type
  let bg = '#F5E6C8';
  if (card.cardType === 'wild' || card.famePoints > 0) bg = '#FFF3B0';
  if (card.cardType === 'common') bg = '#E8F5E9';

  const textColor = '#2C1A0E';

  const letterDisplay = card.cardType === 'wild'
    ? (card.famePoints > 0 ? '★' : '?')
    : card.cardType === 'common'
      ? '*'
      : card.letters.join('-');

  const filter = disabled ? 'grayscale(100%)' : undefined;
  const opacity = disabled ? 0.4 : 1;

  const borderColor = selected ? '#C5A028' : '#B0905A';
  const borderWidth = selected ? 3 : 1;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative',
        width: dims.w,
        height: dims.h,
        background: bg,
        borderRadius: 6,
        border: `${borderWidth}px solid ${borderColor}`,
        padding: dims.padding,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        userSelect: 'none',
        filter,
        opacity,
        boxShadow: selected ? `0 0 8px rgba(197,160,40,0.8)` : '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.1s, border-color 0.1s',
        flexShrink: 0,
        color: textColor,
        boxSizing: 'border-box',
      }}
    >
      {/* Score (top right) */}
      <div style={{
        position: 'absolute',
        top: 3,
        right: 4,
        fontSize: dims.infoSize,
        fontWeight: 700,
        color: '#5C3D1A',
      }}>
        {card.score > 0 ? card.score : ''}
      </div>

      {/* Fame points (top left) */}
      {card.famePoints > 0 && (
        <div style={{
          position: 'absolute',
          top: 3,
          left: 4,
          fontSize: dims.infoSize,
          fontWeight: 700,
          color: '#C5A028',
        }}>
          {'★'.repeat(card.famePoints)}
        </div>
      )}

      {/* Main letter display */}
      <div style={{
        fontSize: dims.letterSize,
        fontWeight: 900,
        fontFamily: 'Georgia, serif',
        lineHeight: 1,
        letterSpacing: card.letters.length > 1 ? '-2px' : '0',
        textAlign: 'center',
        color: card.cardType === 'common' ? '#2E7D32' : textColor,
      }}>
        {letterDisplay}
      </div>

      {/* Card type label for wilds */}
      {card.cardType === 'wild' && card.famePoints === 0 && (
        <div style={{ fontSize: dims.infoSize - 1, color: '#8B6914', marginTop: 2 }}>
          Wild
        </div>
      )}

      {/* Fame label */}
      {card.famePoints > 0 && (
        <div style={{ fontSize: dims.infoSize - 1, color: '#8B6914', marginTop: 2 }}>
          Fame
        </div>
      )}

      {/* Ability text (bottom) */}
      {card.abilityText && (
        <div style={{
          position: 'absolute',
          bottom: 3,
          left: 2,
          right: 2,
          fontSize: 7,
          color: '#5C3D1A',
          textAlign: 'center',
          lineHeight: 1.1,
          overflow: 'hidden',
        }}>
          {card.abilityText}
        </div>
      )}

      {/* Cost (bottom right, only for offer cards) */}
      {card.cost > 0 && card.cardType !== 'wild' && card.famePoints === 0 && (
        <div style={{
          position: 'absolute',
          bottom: 3,
          right: 3,
          fontSize: dims.infoSize,
          color: '#8B6914',
          fontWeight: 700,
        }}>
          {card.cost}¢
        </div>
      )}
    </div>
  );
}
