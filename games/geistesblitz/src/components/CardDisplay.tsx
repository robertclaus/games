import React from 'react';
import { GameCard, GamePhase } from '../game/types';
import { ITEM_EMOJI, ITEM_DISPLAY_COLOR } from '../game/cards';

interface CardDisplayProps {
  card: GameCard | null;
  phase: GamePhase;
}

export function CardDisplay({ card, phase }: CardDisplayProps) {
  const dimmed = phase === 'result';

  if (!card) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyCard}>No card</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, opacity: dimmed ? 0.45 : 1, transition: 'opacity 0.3s' }}>
      <div style={styles.cardRow}>
        {/* Item 1 */}
        <div style={{ ...styles.itemBox, background: ITEM_DISPLAY_COLOR[card.color1] }}>
          <span style={styles.emoji}>{ITEM_EMOJI[card.item1]}</span>
          <span style={styles.itemName}>{card.item1}</span>
        </div>

        {/* Item 2 */}
        <div style={{ ...styles.itemBox, background: ITEM_DISPLAY_COLOR[card.color2] }}>
          <span style={styles.emoji}>{ITEM_EMOJI[card.item2]}</span>
          <span style={styles.itemName}>{card.item2}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px 0',
  },
  cardRow: {
    display: 'flex',
    gap: 24,
  },
  itemBox: {
    width: 200,
    height: 200,
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    border: '3px solid rgba(255,255,255,0.15)',
  },
  emoji: {
    fontSize: '3.5rem',
    lineHeight: 1,
  },
  itemName: {
    color: '#fff',
    fontWeight: 700,
    fontSize: '1.1rem',
    textTransform: 'capitalize',
    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
  },
  emptyCard: {
    color: '#6d28d9',
    fontSize: '1rem',
  },
};
