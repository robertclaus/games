import React from 'react';
import { Card, ActionType } from '../game/types';

const ACTION_COLORS: Record<ActionType, string> = {
  SneakPeak: 'var(--action-sneak)',
  Ambush: 'var(--action-ambush)',
  FastFrenzy: 'var(--action-frenzy)',
  EspieNAH: 'var(--action-espie)',
  Snatched: 'var(--action-snatched)',
  MasterOfForgery: 'var(--action-forgery)',
};

const ACTION_ICONS: Record<ActionType, string> = {
  SneakPeak: '👁️',
  Ambush: '🎯',
  FastFrenzy: '⚡',
  EspieNAH: '🚫',
  Snatched: '🫴',
  MasterOfForgery: '✒️',
};

const ACTION_LABELS: Record<ActionType, string> = {
  SneakPeak: 'SNEAK PEAK',
  Ambush: 'AMBUSH',
  FastFrenzy: 'FAST FRENZY',
  EspieNAH: 'ESPIE-NAH!',
  Snatched: 'SNATCHED',
  MasterOfForgery: 'FORGERY',
};

interface CardProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const SIZES = {
  sm: { width: 52, height: 72, digitSize: 26, labelSize: 8 },
  md: { width: 72, height: 100, digitSize: 38, labelSize: 9 },
  lg: { width: 90, height: 126, digitSize: 48, labelSize: 10 },
};

export function CardComponent({ card, size = 'md', selected, playable, onClick, style }: CardProps) {
  const dim = SIZES[size];

  const baseStyle: React.CSSProperties = {
    width: dim.width,
    height: dim.height,
    borderRadius: 8,
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    userSelect: 'none',
    transition: 'all 0.15s',
    position: 'relative',
    flexShrink: 0,
    ...style,
  };

  if (card.kind === 'number') {
    const borderColor = selected ? 'var(--color-accent)' : playable ? 'var(--color-accent)' : '#2a3a2a';
    return (
      <div
        className={`card card-number${selected ? ' selected' : ''}${playable ? ' playable' : ''}`}
        style={{
          ...baseStyle,
          background: 'var(--color-surface)',
          borderColor,
          boxShadow: selected ? '0 0 0 2px rgba(0,255,136,0.3)' : playable ? '0 0 8px rgba(0,255,136,0.2)' : undefined,
        }}
        onClick={onClick}
      >
        {/* Corner digits */}
        <span style={{
          position: 'absolute', top: 4, left: 6,
          fontSize: dim.labelSize, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.7,
          fontFamily: 'monospace',
        }}>{card.value}</span>
        <span style={{
          position: 'absolute', bottom: 4, right: 6,
          fontSize: dim.labelSize, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.7,
          fontFamily: 'monospace', transform: 'rotate(180deg)',
        }}>{card.value}</span>
        {/* Center digit */}
        <span style={{
          fontSize: dim.digitSize,
          fontWeight: 900,
          color: 'var(--color-accent)',
          fontFamily: 'monospace',
          textShadow: '0 0 12px rgba(0,255,136,0.5)',
          lineHeight: 1,
        }}>
          {card.value}
        </span>
      </div>
    );
  }

  // Action card
  const actionColor = ACTION_COLORS[card.action];
  const borderColor = selected ? 'var(--color-accent)' : playable ? actionColor : actionColor;

  return (
    <div
      className={`card${selected ? ' selected' : ''}${playable ? ' playable' : ''}`}
      style={{
        ...baseStyle,
        background: 'var(--color-surface)',
        borderColor,
        boxShadow: selected
          ? '0 0 0 2px rgba(0,255,136,0.3)'
          : `0 0 6px ${actionColor}44`,
      }}
      onClick={onClick}
    >
      <span style={{ fontSize: dim.digitSize * 0.5, lineHeight: 1 }}>{ACTION_ICONS[card.action]}</span>
      <span style={{
        fontSize: dim.labelSize + 1,
        fontWeight: 800,
        color: actionColor,
        textAlign: 'center',
        padding: '0 4px',
        marginTop: 4,
        lineHeight: 1.2,
        letterSpacing: '0.3px',
      }}>
        {ACTION_LABELS[card.action]}
      </span>
    </div>
  );
}

export function CardBack({ size = 'md', style }: { size?: 'sm' | 'md' | 'lg'; style?: React.CSSProperties }) {
  const dim = SIZES[size];
  return (
    <div
      className="card card-back"
      style={{
        width: dim.width,
        height: dim.height,
        borderRadius: 8,
        border: '2px solid var(--color-border)',
        background: 'repeating-linear-gradient(45deg, var(--color-surface), var(--color-surface) 4px, var(--color-surface-raised) 4px, var(--color-surface-raised) 8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <span style={{ fontSize: dim.digitSize * 0.6, opacity: 0.3 }}>🔒</span>
    </div>
  );
}
