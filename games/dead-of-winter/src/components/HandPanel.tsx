import React, { useState } from 'react';
import { ItemCard, ItemType } from '../game/types';
import { SURVIVORS } from '../game/content';

interface HandPanelProps {
  hand: ItemCard[];
  canAct: boolean;
  hasCrisis: boolean;
  hasContributed: boolean;
  mySurvivorIds: string[];
  onContributeCrisis: (cardId: string) => void;
  onPlayItem: (cardId: string, targetSurvivorId?: string) => void;
  onEquipItem: (cardId: string, survivorId: string) => void;
}

export function HandPanel({
  hand, canAct, hasCrisis, hasContributed, mySurvivorIds,
  onContributeCrisis, onPlayItem, onEquipItem,
}: HandPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState<'play' | 'equip' | 'crisis' | null>(null);

  if (hand.length === 0) {
    return <div style={styles.empty}>Hand is empty</div>;
  }

  function handleCardClick(card: ItemCard) {
    if (!canAct && !(hasCrisis && !hasContributed)) {
      return;
    }
    if (selected === card.id) {
      setSelected(null);
      setAction(null);
    } else {
      setSelected(card.id);
      setAction(null);
    }
  }

  function handlePlay(cardId: string, survivorId?: string) {
    onPlayItem(cardId, survivorId);
    setSelected(null);
    setAction(null);
  }

  function handleEquip(cardId: string, survivorId: string) {
    onEquipItem(cardId, survivorId);
    setSelected(null);
    setAction(null);
  }

  function handleCrisis(cardId: string) {
    onContributeCrisis(cardId);
    setSelected(null);
    setAction(null);
  }

  const selectedCard = selected ? hand.find(c => c.id === selected) : null;

  return (
    <div style={styles.container}>
      <div style={styles.cardRow}>
        {hand.map(card => (
          <div
            key={card.id}
            style={{
              ...styles.card,
              borderColor: selected === card.id ? '#f57c00' : TYPE_COLOR[card.type],
              background: selected === card.id ? '#2a1a0e' : '#16213e',
              cursor: (canAct || (hasCrisis && !hasContributed)) ? 'pointer' : 'default',
            }}
            onClick={() => handleCardClick(card)}
          >
            <div style={{ ...styles.typeBadge, background: TYPE_COLOR[card.type] }}>
              {card.type}
            </div>
            <div style={styles.cardName}>{card.name}</div>
            <div style={styles.cardDesc}>{card.description}</div>
          </div>
        ))}
      </div>

      {/* Actions for selected card */}
      {selectedCard && (
        <div style={styles.actionBar}>
          <span style={styles.selectedLabel}>{selectedCard.name} →</span>
          {canAct && selectedCard.playEffect && (
            <button style={styles.actBtn} onClick={() => handlePlay(selectedCard.id)}>
              Play Effect
            </button>
          )}
          {canAct && selectedCard.equipEffect && mySurvivorIds.map(sid => {
            const cardId = sid.split('_')[0];
            const survivorName = SURVIVORS.find(s => s.id === cardId)?.name.split(' ')[0] ?? cardId;
            return (
              <button
                key={sid}
                style={styles.actBtn}
                onClick={() => handleEquip(selectedCard.id, sid)}
              >
                Equip to {survivorName}
              </button>
            );
          })}
          {hasCrisis && !hasContributed && (
            <button style={{ ...styles.actBtn, background: '#8b1a1a' }} onClick={() => handleCrisis(selectedCard.id)}>
              Contribute to Crisis
            </button>
          )}
          <button style={styles.cancelBtn} onClick={() => { setSelected(null); setAction(null); }}>
            Cancel
          </button>
        </div>
      )}

      {hasContributed && (
        <div style={styles.contributed}>✓ Crisis contribution made</div>
      )}
    </div>
  );
}

const TYPE_COLOR: Record<ItemType, string> = {
  food: '#388e3c',
  weapon: '#c62828',
  medicine: '#0288d1',
  fuel: '#f57c00',
  tool: '#7b1fa2',
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { color: '#555', fontSize: '0.85rem', fontStyle: 'italic' },
  cardRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  card: {
    border: '1px solid',
    borderRadius: 6,
    padding: '6px 10px',
    minWidth: 100,
    maxWidth: 140,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 3,
    color: '#fff',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  cardName: { fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 },
  cardDesc: { color: '#888', fontSize: '0.7rem' },
  actionBar: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '6px 8px',
    background: '#0d1117',
    borderRadius: 6,
    border: '1px solid #f57c00',
  },
  selectedLabel: { color: '#f57c00', fontWeight: 600, fontSize: '0.85rem' },
  actBtn: {
    padding: '4px 10px',
    background: '#0f3460',
    color: '#90caf9',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  cancelBtn: {
    padding: '4px 10px',
    background: 'transparent',
    color: '#888',
    border: '1px solid #555',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  contributed: {
    color: '#81c784',
    fontSize: '0.8rem',
  },
};
