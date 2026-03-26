import React from 'react';
import { ItemType, RoundResult } from '../game/types';
import { ALL_ITEMS, ITEM_EMOJI, ITEM_DISPLAY_COLOR, ORIGINAL_COLORS } from '../game/cards';

interface ItemButtonsProps {
  onGuess: (item: ItemType) => void;
  disabled: boolean;
  myGuessedThisRound: boolean;
  correctItem?: ItemType;
  roundResult?: RoundResult | null;
}

export function ItemButtons({
  onGuess,
  disabled,
  myGuessedThisRound,
  correctItem,
  roundResult,
}: ItemButtonsProps) {
  function renderButton(item: ItemType) {
    const isCorrect = roundResult != null && item === correctItem;
    const bgColor = ITEM_DISPLAY_COLOR[ORIGINAL_COLORS[item]];
    const boxShadow = isCorrect
      ? '0 0 0 4px #22c55e, 0 4px 20px rgba(34,197,94,0.5)'
      : '0 4px 12px rgba(0,0,0,0.4)';
    return (
      <button
        key={item}
        onClick={() => onGuess(item)}
        disabled={disabled || myGuessedThisRound}
        style={{
          ...styles.button,
          background: bgColor,
          boxShadow,
          opacity: (disabled || myGuessedThisRound) && !isCorrect ? 0.6 : 1,
          cursor: disabled || myGuessedThisRound ? 'not-allowed' : 'pointer',
          transform: isCorrect ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <span style={styles.emoji}>{ITEM_EMOJI[item]}</span>
        <span style={styles.label}>{item}</span>
      </button>
    );
  }

  return (
    <div style={styles.container}>
      {myGuessedThisRound && (
        <div style={styles.guessedOverlay}>You guessed!</div>
      )}
      <div style={styles.row}>{ALL_ITEMS.slice(0, 3).map(renderButton)}</div>
      <div style={styles.row}>{ALL_ITEMS.slice(3).map(renderButton)}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
  },
  guessedOverlay: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(124,58,237,0.85)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.9rem',
    padding: '3px 16px',
    borderRadius: 20,
    zIndex: 10,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  row: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 12,
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
  },
  emoji: {
    fontSize: '2.2rem',
    lineHeight: 1,
  },
  label: {
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.8rem',
    textTransform: 'capitalize',
    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
  },
};
