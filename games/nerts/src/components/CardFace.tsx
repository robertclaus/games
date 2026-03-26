import React from 'react';
import { Card, SUIT_SYMBOL, SUIT_COLOR } from '../game/types';

interface CardFaceProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  size?: 'normal' | 'small' | 'tiny';
  pending?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

function valueLabel(v: number): string {
  if (v === 1) return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

export function CardFace({ card, faceDown = false, selected = false, size = 'normal', pending = false, onClick, style }: CardFaceProps) {
  const sizeClass = `card--${size}`;
  const colorClass = SUIT_COLOR[card.suit] === 'red' ? 'suit-red' : 'suit-black';
  const symbol = SUIT_SYMBOL[card.suit];
  const label = valueLabel(card.value);

  const cornerFontSize = size === 'normal' ? 13 : size === 'small' ? 10 : 8;
  const symbolFontSize = size === 'normal' ? 11 : size === 'small' ? 8 : 6;

  if (faceDown) {
    return (
      <div
        className={`card-back card-back--${size}`}
        style={{ background: card.backColor, cursor: onClick ? 'pointer' : 'default', ...style }}
        onClick={onClick}
      >
        <div className="card-back-inner">
          <div className="card-back-pattern" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card ${sizeClass}${selected ? ' selected' : ''}${pending ? ' pending' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
    >
      {/* Top-left corner */}
      <div className={`card-corner top-left ${colorClass}`} style={{ fontSize: cornerFontSize }}>
        <span>{label}</span>
        <span style={{ fontSize: symbolFontSize }}>{symbol}</span>
      </div>

      {/* Center symbol */}
      <span className={`card-center ${colorClass}`}>{symbol}</span>

      {/* Bottom-right corner (rotated) */}
      <div className={`card-corner bottom-right ${colorClass}`} style={{ fontSize: cornerFontSize }}>
        <span>{label}</span>
        <span style={{ fontSize: symbolFontSize }}>{symbol}</span>
      </div>
    </div>
  );
}
