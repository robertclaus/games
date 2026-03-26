import React from 'react';
import { Card } from '../game/types';
import { CardComponent } from './CardComponent';

interface HandComponentProps {
  cards: Card[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  interactive: boolean;
  label?: string;
}

export function HandComponent({ cards, selectedCardId, onSelectCard, interactive, label }: HandComponentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {label && (
        <div style={{ fontSize: 12, color: 'var(--color-text-dim)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          minHeight: 100,
        }}
      >
        {cards.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 16px' }}>
            No cards in hand
          </div>
        ) : (
          cards.map(card => (
            <CardComponent
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              onClick={interactive ? () => onSelectCard(card.id) : undefined}
              dimmed={!interactive}
            />
          ))
        )}
      </div>
    </div>
  );
}
