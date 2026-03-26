import React, { useState } from 'react';
import { Card, CodeCard, VaultSlot, ActionCard } from '../game/types';
import { CardComponent } from './CardComponent';

interface HandProps {
  hand: Card[];
  code: CodeCard;
  vault: VaultSlot[];
  isMyTurn: boolean;
  turnPhase: string;
  pendingActionPlayerId?: string;
  myPlayerId: string;
  onPlayNumber: (cardId: string, vaultSlot: number) => void;
  onPlayAction: (cardId: string) => void;
  onCounterAction: () => void;
  onDiscard: (cardId: string) => void;
  onSelectForSwap?: (cardId: string) => void;
  selectedForSwap?: string;
}

export function HandComponent({
  hand,
  code,
  vault,
  isMyTurn,
  turnPhase,
  pendingActionPlayerId,
  myPlayerId,
  onPlayNumber,
  onPlayAction,
  onCounterAction,
  onDiscard,
  onSelectForSwap,
  selectedForSwap,
}: HandProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [choosingVaultSlot, setChoosingVaultSlot] = useState<string | null>(null);

  const isOverLimit = hand.length > 5;
  const canActThisTurn = isMyTurn && (turnPhase === 'play' || turnPhase === 'fastFrenzy2');
  const canCounter = turnPhase === 'pendingAction' && pendingActionPlayerId !== myPlayerId;
  const hasEspieNAH = hand.some(c => c.kind === 'action' && (c as ActionCard).action === 'EspieNAH');

  function handleCardClick(card: Card) {
    if (isOverLimit) {
      onDiscard(card.id);
      return;
    }

    if (canCounter && card.kind === 'action' && (card as ActionCard).action === 'EspieNAH') {
      onCounterAction();
      return;
    }

    if (!canActThisTurn) return;

    if (choosingVaultSlot === card.id) {
      setChoosingVaultSlot(null);
      setSelectedCard(null);
      return;
    }

    if (card.kind === 'number') {
      // If only one valid slot, auto-play; else show slot picker
      const validSlots = getValidSlotsForCard(card);
      if (validSlots.length === 1) {
        onPlayNumber(card.id, validSlots[0]);
        setSelectedCard(null);
      } else if (validSlots.length > 1) {
        setChoosingVaultSlot(card.id);
        setSelectedCard(card.id);
      }
    } else if (card.kind === 'action') {
      const ac = card as ActionCard;
      if (ac.action === 'MasterOfForgery') {
        // Show vault slot picker
        const validSlots = getValidSlotsForForgery();
        if (validSlots.length === 1) {
          onPlayNumber(card.id, validSlots[0]);
          setSelectedCard(null);
        } else if (validSlots.length > 1) {
          setChoosingVaultSlot(card.id);
          setSelectedCard(card.id);
        }
      } else if (ac.action !== 'EspieNAH') {
        setSelectedCard(card.id === selectedCard ? null : card.id);
      }
    }

    // If clicking for swap
    if (onSelectForSwap) {
      onSelectForSwap(card.id);
    }
  }

  function getValidSlotsForCard(card: Card): number[] {
    if (card.kind !== 'number') return [];
    const numCard = card as import('../game/types').NumberCard;
    return [0, 1, 2].filter(i =>
      vault[i] === null && code.digits[i] === numCard.value
    );
  }

  function getValidSlotsForForgery(): number[] {
    return [0, 1, 2].filter(i => vault[i] === null);
  }

  function isCardPlayable(card: Card): boolean {
    if (isOverLimit) return true; // all cards are "discard" targets
    if (canCounter && card.kind === 'action' && (card as ActionCard).action === 'EspieNAH') return true;
    if (!canActThisTurn) return false;
    if (card.kind === 'number') return getValidSlotsForCard(card).length > 0;
    if (card.kind === 'action') {
      const ac = card as ActionCard;
      if (ac.action === 'EspieNAH') return false; // only reactive
      if (ac.action === 'MasterOfForgery') return getValidSlotsForForgery().length > 0;
      return true;
    }
    return false;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Status banners */}
      {isOverLimit && (
        <div style={{
          background: 'rgba(248,81,73,0.15)', border: '1px solid var(--color-danger)',
          borderRadius: 6, padding: '6px 12px', fontSize: 12, color: 'var(--color-danger)',
          textAlign: 'center', fontWeight: 600,
        }}>
          Hand limit exceeded! Click a card to discard it ({hand.length}/5)
        </div>
      )}

      {canCounter && hasEspieNAH && (
        <div style={{
          background: 'rgba(230,126,34,0.15)', border: '1px solid var(--action-espie)',
          borderRadius: 6, padding: '6px 12px', fontSize: 12, color: 'var(--action-espie)',
          textAlign: 'center', fontWeight: 700, animation: 'pulse 1s infinite',
        }}>
          You can play ESPIE-NAH! to counter!
        </div>
      )}

      {/* Vault slot chooser */}
      {choosingVaultSlot && (
        <div style={{
          background: 'rgba(0,255,136,0.1)', border: '1px solid var(--color-accent)',
          borderRadius: 6, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>Choose vault slot:</span>
          {[0, 1, 2].map(i => {
            const card = hand.find(c => c.id === choosingVaultSlot);
            const isForge = card?.kind === 'action' && (card as ActionCard).action === 'MasterOfForgery';
            const valid = isForge
              ? vault[i] === null
              : (card?.kind === 'number' && vault[i] === null && code.digits[i] === (card as import('../game/types').NumberCard).value);
            return valid ? (
              <button
                key={i}
                className="primary"
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => {
                  onPlayNumber(choosingVaultSlot, i);
                  setChoosingVaultSlot(null);
                  setSelectedCard(null);
                }}
              >
                Slot {i + 1}
                {!isForge && <span style={{ marginLeft: 4, opacity: 0.7 }}>(={code.digits[i]})</span>}
              </button>
            ) : null;
          })}
          <button className="secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { setChoosingVaultSlot(null); setSelectedCard(null); }}>
            Cancel
          </button>
        </div>
      )}

      {/* Action card play button */}
      {selectedCard && (() => {
        const card = hand.find(c => c.id === selectedCard);
        if (!card || card.kind !== 'action') return null;
        const ac = card as ActionCard;
        if (ac.action === 'MasterOfForgery') return null; // handled via slot chooser
        return (
          <div style={{
            background: 'rgba(0,255,136,0.08)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: '8px 12px', textAlign: 'center',
          }}>
            <button className="primary" style={{ fontSize: 13 }} onClick={() => { onPlayAction(selectedCard); setSelectedCard(null); }}>
              Play {ac.action}
            </button>
            <button className="secondary" style={{ fontSize: 12, marginLeft: 8 }} onClick={() => setSelectedCard(null)}>
              Cancel
            </button>
          </div>
        );
      })()}

      {/* Cards */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {hand.map(card => (
          <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <CardComponent
              card={card}
              size="md"
              selected={selectedCard === card.id || selectedForSwap === card.id}
              playable={isCardPlayable(card)}
              onClick={() => handleCardClick(card)}
            />
            {isOverLimit && (
              <span style={{ fontSize: 9, color: 'var(--color-danger)', fontWeight: 700 }}>DISCARD</span>
            )}
          </div>
        ))}
        {hand.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '20px 0' }}>
            No cards in hand
          </div>
        )}
      </div>
    </div>
  );
}
