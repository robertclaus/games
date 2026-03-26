import React from 'react';
import { TummyCard } from '../game/types';
import { SUIT_ICONS } from '../game/deck';

interface HandComponentProps {
  hand: TummyCard[];
  selectedCardId: string | null;
  validCardIds: Set<string>;
  onSelect: (cardId: string) => void;
  isMyTurn: boolean;
}

export function HandComponent({ hand, selectedCardId, validCardIds, onSelect, isMyTurn }: HandComponentProps) {
  if (hand.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.label}>Your Hand (0 cards)</div>
        <div style={{ color: '#455a64', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
          No cards in hand
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>Your Hand ({hand.length} cards)</div>
      <div style={styles.cardRow}>
        {hand.map(card => {
          const isSelected = card.id === selectedCardId;
          const isValid = validCardIds.has(card.id);
          const isPlayable = isMyTurn && isValid;

          return (
            <div
              key={card.id}
              onClick={() => isMyTurn && onSelect(card.id)}
              style={{
                ...styles.card,
                borderColor: isSelected
                  ? '#00e5ff'
                  : isPlayable
                    ? '#00acc1'
                    : '#1a3a5c',
                background: isSelected
                  ? '#0d2137'
                  : '#0a1628',
                opacity: isMyTurn && !isPlayable ? 0.4 : 1,
                cursor: isMyTurn ? 'pointer' : 'default',
                transform: isSelected ? 'translateY(-8px) scale(1.05)' : 'none',
                boxShadow: isSelected
                  ? '0 8px 20px rgba(0,229,255,0.4)'
                  : isPlayable
                    ? '0 2px 8px rgba(0,172,193,0.2)'
                    : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={styles.cardValue}>{card.value}</div>
              <div style={styles.cardSuit}>{SUIT_ICONS[card.suit]}</div>
              <div style={styles.cardSuitName}>{card.suit.slice(0, 3)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0a1628',
    borderTop: '1px solid #1a3a5c',
    padding: '12px 16px',
  },
  label: {
    fontSize: '0.75rem',
    color: '#78909c',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  cardRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    background: '#0a1628',
    border: '2px solid #1a3a5c',
    borderRadius: 8,
    width: 56,
    height: 76,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    userSelect: 'none',
  },
  cardValue: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#e0f2f1',
    lineHeight: 1,
  },
  cardSuit: {
    fontSize: '1rem',
    lineHeight: 1,
  },
  cardSuitName: {
    fontSize: '0.55rem',
    color: '#78909c',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
};
