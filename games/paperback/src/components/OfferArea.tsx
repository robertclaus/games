import React from 'react';
import { PublicOfferPile, TurnState, GameAction } from '../game/types';
import { CardTile } from './CardTile';

interface OfferAreaProps {
  offerPiles: PublicOfferPile[];
  turnState: TurnState | null;
  myPlayerId: string;
  onAction: (action: GameAction) => void;
}

export function OfferArea({ offerPiles, turnState, myPlayerId, onAction }: OfferAreaProps) {
  const isMyTurn = turnState?.currentPlayerId === myPlayerId;
  const isBuying = isMyTurn && turnState?.phase === 'buying';
  const budget = turnState?.budgetRemaining ?? 0;

  return (
    <div style={{
      background: '#3D2514',
      border: '1px solid #5C3D1A',
      borderRadius: 8,
      padding: '12px 16px',
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#C5A028',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        The Offer
        {isBuying && (
          <span style={{
            marginLeft: 8,
            fontSize: 12,
            color: '#F5E6C8',
            fontWeight: 400,
            textTransform: 'none',
          }}>
            — {budget}¢ to spend
          </span>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {offerPiles.map(pile => (
          <OfferPileDisplay
            key={pile.id}
            pile={pile}
            isBuying={isBuying}
            budget={budget}
            onBuy={(cardId) => onAction({ type: 'BUY_CARD', pileId: pile.id, cardId })}
          />
        ))}
      </div>
    </div>
  );
}

interface OfferPileDisplayProps {
  pile: PublicOfferPile;
  isBuying: boolean;
  budget: number;
  onBuy: (cardId: string) => void;
}

function OfferPileDisplay({ pile, isBuying, budget, onBuy }: OfferPileDisplayProps) {
  const topCard = pile.visible[0];
  const secondCard = pile.visible[1];

  if (!topCard && pile.remaining === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: 64,
      }}>
        <div style={{
          width: 64,
          height: 88,
          borderRadius: 6,
          border: '2px dashed #5C3D1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#5C3D1A',
          fontSize: 10,
          textAlign: 'center',
        }}>
          Empty
        </div>
        <div style={{ fontSize: 10, color: '#5C3D1A' }}>Sold out</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      {/* Both visible cards shown side-by-side */}
      <div style={{ display: 'flex', gap: 4 }}>
        {pile.visible.map((card) => {
          const canAfford = isBuying && budget >= card.cost;
          return (
            <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CardTile
                card={card}
                disabled={isBuying && !canAfford}
                onClick={canAfford ? () => onBuy(card.id) : undefined}
                size="normal"
              />
              {isBuying && (
                <div style={{
                  fontSize: 10,
                  color: canAfford ? '#4CAF50' : '#ef5350',
                  fontWeight: 600,
                }}>
                  {canAfford ? `Buy (${card.cost}¢)` : `${card.cost}¢`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remaining count */}
      <div style={{ fontSize: 10, color: '#8B6914', textAlign: 'center' }}>
        {pile.remaining} left
      </div>
    </div>
  );
}
