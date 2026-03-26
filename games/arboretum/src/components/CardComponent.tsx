import React from 'react';
import { Card, SPECIES_COLORS, SPECIES_DISPLAY } from '../game/types';

interface CardProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  dimmed?: boolean;
  highlight?: boolean;
}

function getTextColor(bgColor: string): string {
  // Parse hex color to determine brightness
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1a1a1a' : '#ffffff';
}

export function CardComponent({ card, selected, onClick, small, dimmed, highlight }: CardProps) {
  const bgColor = SPECIES_COLORS[card.species];
  const textColor = getTextColor(bgColor);
  const shortName = SPECIES_DISPLAY[card.species].split(' ').map(w => w[0]).join('');

  const width = small ? 44 : 64;
  const height = small ? 60 : 88;
  const fontSize = small ? 16 : 22;
  const labelFontSize = small ? 8 : 10;

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: 6,
        border: selected
          ? '3px solid #fff'
          : highlight
          ? '3px solid #f0ad4e'
          : '2px solid rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.4 : 1,
        boxShadow: selected
          ? '0 0 12px rgba(255,255,255,0.6)'
          : highlight
          ? '0 0 12px rgba(240,173,78,0.6)'
          : '0 2px 6px rgba(0,0,0,0.4)',
        transform: selected ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.1s, box-shadow 0.1s',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Value - top left */}
      <span
        style={{
          position: 'absolute',
          top: small ? 2 : 4,
          left: small ? 4 : 6,
          fontSize: small ? 11 : 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {card.value}
      </span>

      {/* Species abbreviation - center */}
      <span
        style={{
          fontSize,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-1px',
        }}
      >
        {shortName}
      </span>

      {/* Value - bottom right (upside down) */}
      <span
        style={{
          position: 'absolute',
          bottom: small ? 2 : 4,
          right: small ? 4 : 6,
          fontSize: small ? 11 : 14,
          fontWeight: 700,
          lineHeight: 1,
          transform: 'rotate(180deg)',
        }}
      >
        {card.value}
      </span>

      {/* Species label at very bottom */}
      {!small && (
        <span
          style={{
            position: 'absolute',
            bottom: 16,
            fontSize: labelFontSize,
            fontWeight: 600,
            opacity: 0.75,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1,
            padding: '0 4px',
            maxWidth: '100%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {SPECIES_DISPLAY[card.species]}
        </span>
      )}
    </div>
  );
}

// A face-down card
export function CardBack({ small }: { small?: boolean }) {
  const width = small ? 44 : 64;
  const height = small ? 60 : 88;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#1a5c2a',
        borderRadius: 6,
        border: '2px solid #2d8a45',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        flexShrink: 0,
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)',
      }}
    />
  );
}
