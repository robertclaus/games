import React, { useState, useEffect } from 'react';
import {
  PublicGameState,
  Card,
  CodeCard,
  VaultSlot,
  ActionCard,
  SpyCharacter,
  SPY_EMOJI,
  ActionType,
} from '../game/types';
import { GameAction } from '../game/types';
import { CardComponent } from './CardComponent';
import { VaultComponent } from './VaultComponent';
import { BoxComponent } from './BoxComponent';
import { HandComponent } from './HandComponent';

export type GameBoardAction = GameAction;

interface SneakPeakState {
  cards: Card[];
}

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  myHand: Card[];
  myCode?: CodeCard;
  myVault?: VaultSlot[];
  sneakPeakCards?: Card[];
  onAction: (action: GameBoardAction) => void;
  isMyTurn: boolean;
}

const ACTION_LABELS: Record<ActionType, string> = {
  SneakPeak: 'Sneak Peak',
  Ambush: 'Ambush',
  FastFrenzy: 'Fast Frenzy',
  EspieNAH: 'Espie-NAH!',
  Snatched: 'Snatched',
  MasterOfForgery: 'Master of Forgery',
};

export function GameBoard({
  publicState,
  myPlayerId,
  myHand,
  myCode = { digits: [0, 0, 0] },
  myVault = [null, null, null],
  sneakPeakCards,
  onAction,
  isMyTurn,
}: GameBoardProps) {
  const [selectedSwapCardId, setSelectedSwapCardId] = useState<string | null>(null);
  const [pendingActionTarget, setPendingActionTarget] = useState<{
    action: ActionType;
    cardId: string;
    step: 'pickTarget' | 'pickDigit';
    targetId?: string;
  } | null>(null);

  const [sneakPeakChoice, setSneakPeakChoice] = useState<string | null>(null);
  const [sneakPeakReturnOrder, setSneakPeakReturnOrder] = useState<string[]>([]);

  const myPublicState = publicState.players.find(p => p.playerId === myPlayerId);
  const opponents = publicState.players.filter(p => p.playerId !== myPlayerId);
  const { turnPhase, pendingAction } = publicState;
  const currentPlayer = publicState.players[publicState.currentPlayerIndex];

  // SneakPeak UI
  const isSneakPeakPhase = turnPhase === 'sneakPeakChoose' &&
    pendingAction?.playerId === myPlayerId;

  useEffect(() => {
    if (!sneakPeakCards || sneakPeakCards.length === 0) return;
    setSneakPeakReturnOrder([]);
    setSneakPeakChoice(null);
  }, [sneakPeakCards]);

  function handleDrawFromPile() {
    if (!isMyTurn || turnPhase !== 'draw') return;
    onAction({ type: 'DRAW_FROM_PILE' });
  }

  function handleDrawFromBox(index: number) {
    if (!isMyTurn || turnPhase !== 'draw') return;
    onAction({ type: 'DRAW_FROM_BOX', boxIndex: index });
  }

  function handleSwapWithBox(index: number) {
    if (!isMyTurn || turnPhase !== 'play' || !selectedSwapCardId) return;
    onAction({ type: 'SWAP_WITH_BOX', handCardId: selectedSwapCardId, boxIndex: index });
    setSelectedSwapCardId(null);
  }

  function handlePlayNumber(cardId: string, vaultSlot: number) {
    onAction({ type: 'PLAY_NUMBER', cardId, vaultSlot });
  }

  function handlePlayAction(cardId: string) {
    // Find the action card to determine if it needs targets
    const card = myHand.find(c => c.id === cardId);
    if (!card || card.kind !== 'action') return;
    const ac = card as ActionCard;

    if (ac.action === 'Ambush' || ac.action === 'Snatched') {
      setPendingActionTarget({
        action: ac.action,
        cardId,
        step: 'pickTarget',
      });
    } else {
      onAction({ type: 'PLAY_ACTION', cardId });
    }
  }

  function handleCounterAction() {
    onAction({ type: 'COUNTER_ACTION' });
  }

  function handleDiscard(cardId: string) {
    onAction({ type: 'DISCARD_CARD', cardId });
  }

  function handleTargetPick(targetId: string) {
    if (!pendingActionTarget) return;
    if (pendingActionTarget.action === 'Ambush') {
      onAction({ type: 'PLAY_ACTION', cardId: pendingActionTarget.cardId, targetPlayerId: targetId });
      setPendingActionTarget(null);
    } else if (pendingActionTarget.action === 'Snatched') {
      setPendingActionTarget({ ...pendingActionTarget, step: 'pickDigit', targetId });
    }
  }

  function handleDigitPick(digit: number) {
    if (!pendingActionTarget || !pendingActionTarget.targetId) return;
    onAction({
      type: 'PLAY_ACTION',
      cardId: pendingActionTarget.cardId,
      targetPlayerId: pendingActionTarget.targetId,
      targetDigit: digit,
    });
    setPendingActionTarget(null);
  }

  function handleSneakPeakKeep(cardId: string) {
    if (!sneakPeakCards) return;
    const returnCards = sneakPeakCards.filter(c => c.id !== cardId);
    onAction({
      type: 'SNEAK_PEAK_CHOOSE',
      keepCardId: cardId,
      returnOrder: returnCards.map(c => c.id),
    });
  }

  const isDrawPhase = isMyTurn && turnPhase === 'draw';
  const isPlayPhase = isMyTurn && (turnPhase === 'play' || turnPhase === 'fastFrenzy2');
  const isSwapMode = isPlayPhase && !!selectedSwapCardId;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 16px',
      gap: 12,
    }}>
      {/* ── Status Bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{SPY_EMOJI[currentPlayer?.character as SpyCharacter] ?? '?'}</span>
          <span style={{ fontWeight: 700, color: isMyTurn ? 'var(--color-accent)' : 'var(--color-text)' }}>
            {isMyTurn ? 'YOUR TURN' : `${currentPlayer?.name ?? '?'}'s turn`}
          </span>
          <span style={{
            background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
            borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)',
          }}>
            {turnPhase === 'draw' ? 'DRAW PHASE'
              : turnPhase === 'play' ? 'PLAY PHASE'
              : turnPhase === 'fastFrenzy2' ? 'FAST FRENZY!'
              : turnPhase === 'pendingAction' ? 'ACTION PENDING'
              : turnPhase === 'sneakPeakChoose' ? 'SNEAK PEAK'
              : (turnPhase as string).toUpperCase()}
          </span>
        </div>
        {publicState.lastEvent && (
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)', fontStyle: 'italic', maxWidth: 400 }}>
            {publicState.lastEvent}
          </div>
        )}
      </div>

      {/* ── Draw Phase Banner ──────────────────────────────────────────── */}
      {isDrawPhase && (
        <div style={{
          background: 'rgba(0,255,136,0.08)', border: '1px solid var(--color-accent)',
          borderRadius: 8, padding: '10px 16px', textAlign: 'center',
          fontSize: 13, color: 'var(--color-accent)', fontWeight: 700,
        }}>
          Draw a card from the deck or take one from the Box below
          <button
            className="primary"
            style={{ marginLeft: 16, padding: '4px 14px', fontSize: 12 }}
            onClick={handleDrawFromPile}
          >
            Draw from Deck ({publicState.deckCount})
          </button>
        </div>
      )}

      {/* ── Pending Action / Espie-NAH! Window ────────────────────────── */}
      {pendingAction && turnPhase === 'pendingAction' && (
        <div style={{
          background: 'rgba(230,126,34,0.12)', border: '2px solid var(--action-espie)',
          borderRadius: 8, padding: '12px 16px', animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--action-espie)' }}>
                ACTION PENDING: {ACTION_LABELS[pendingAction.action]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>
                Played by {publicState.players.find(p => p.playerId === pendingAction.playerId)?.name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Countdown */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 28, fontWeight: 900,
                  color: pendingAction.countdown <= 2 ? 'var(--color-danger)' : 'var(--action-espie)',
                  fontFamily: 'monospace',
                }}>
                  {pendingAction.countdown}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>seconds</div>
              </div>
              {/* Counter button */}
              {pendingAction.playerId !== myPlayerId &&
               myHand.some(c => c.kind === 'action' && (c as ActionCard).action === 'EspieNAH') && (
                <button
                  className="danger"
                  style={{ padding: '8px 16px', fontSize: 13, fontWeight: 800 }}
                  onClick={handleCounterAction}
                >
                  🚫 ESPIE-NAH!
                </button>
              )}
            </div>
          </div>
          {/* Countdown bar */}
          <div style={{ marginTop: 8, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'var(--action-espie)',
              width: `${(pendingAction.countdown / 5) * 100}%`,
              transition: 'width 1s linear',
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}

      {/* ── Sneak Peak Choose ──────────────────────────────────────────── */}
      {isSneakPeakPhase && sneakPeakCards && sneakPeakCards.length > 0 && (
        <div style={{
          background: 'rgba(45,125,210,0.12)', border: '2px solid var(--action-sneak)',
          borderRadius: 8, padding: '16px', animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--action-sneak)', marginBottom: 12 }}>
            👁️ SNEAK PEAK — Choose 1 card to keep:
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {sneakPeakCards.map(card => (
              <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <CardComponent card={card} size="md" selected={sneakPeakChoice === card.id}
                  onClick={() => setSneakPeakChoice(card.id)} />
                <button
                  className={sneakPeakChoice === card.id ? 'primary' : 'secondary'}
                  style={{ padding: '4px 12px', fontSize: 11 }}
                  onClick={() => handleSneakPeakKeep(card.id)}
                >
                  Keep
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Target Picker for Ambush / Snatched ───────────────────────── */}
      {pendingActionTarget && (
        <div style={{
          background: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '32px', maxWidth: 400, width: '100%', margin: '0 16px',
          }}>
            {pendingActionTarget.step === 'pickTarget' && (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: 'var(--color-accent)' }}>
                  {pendingActionTarget.action === 'Ambush' ? 'Choose a target to Ambush:' : 'Choose a target to Snatch from:'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {opponents.map(p => (
                    <button
                      key={p.playerId}
                      className="secondary"
                      style={{ padding: '12px', textAlign: 'left', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}
                      onClick={() => handleTargetPick(p.playerId)}
                    >
                      <span style={{ fontSize: 20 }}>{SPY_EMOJI[p.character]}</span>
                      <span style={{ fontWeight: 700 }}>{p.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: 12 }}>{p.handCount} cards</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {pendingActionTarget.step === 'pickDigit' && (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: 'var(--color-accent)' }}>
                  Name a digit to Snatch (0–9):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[0,1,2,3,4,5,6,7,8,9].map(d => (
                    <button
                      key={d}
                      className="secondary"
                      style={{ padding: '12px', fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-accent)' }}
                      onClick={() => handleDigitPick(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="secondary" style={{ marginTop: 16, width: '100%' }}
              onClick={() => setPendingActionTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Area ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Opponents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            Opponents
          </div>
          {opponents.map(opp => (
            <div key={opp.playerId} style={{
              background: 'var(--color-surface)',
              border: opp.playerId === currentPlayer?.playerId ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 22 }}>{SPY_EMOJI[opp.character]}</span>
              <div style={{ flex: 1, minWidth: 80 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {opp.name}
                  {opp.playerId === currentPlayer?.playerId && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-accent)', fontWeight: 800 }}>▶ TURN</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{opp.handCount} cards in hand</div>
              </div>
              <VaultComponent
                vault={opp.vault}
                isOwner={false}
                size="sm"
              />
            </div>
          ))}
          {opponents.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Waiting for others...</div>
          )}
        </div>

        {/* Center: Box */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <BoxComponent
            box={publicState.box}
            deckCount={publicState.deckCount}
            discardTop={publicState.discardTop}
            canDraw={isDrawPhase}
            canSwap={isPlayPhase}
            selectedHandCardId={selectedSwapCardId ?? undefined}
            onDrawFromBox={handleDrawFromBox}
            onSwapWithBox={handleSwapWithBox}
          />
          {isPlayPhase && !selectedSwapCardId && (
            <button
              className="secondary"
              style={{ fontSize: 11, padding: '4px 10px', marginTop: 4 }}
              onClick={() => {/* Will be activated when card is selected from hand */}}
            >
              Select a card from hand to swap
            </button>
          )}
        </div>
      </div>

      {/* ── My Vault ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>{SPY_EMOJI[myPublicState?.character as SpyCharacter] ?? '🕵️'}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-accent)' }}>
            Your Vault
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Secret Code: <span style={{ fontFamily: 'monospace', color: 'var(--color-text)', fontWeight: 700 }}>
              {myCode.digits[0]}-{myCode.digits[1]}-{myCode.digits[2]}
            </span>
          </span>
        </div>
        <VaultComponent
          vault={myVault}
          code={myCode}
          isOwner={true}
          handCards={myHand}
        />
      </div>

      {/* ── Hand ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '12px 16px',
      }}>
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          YOUR HAND ({myHand.length}/5)
          {isPlayPhase && (
            <span style={{ marginLeft: 12, color: 'var(--color-accent)' }}>
              — Play a Number card, an Action, or swap with the Box
            </span>
          )}
        </div>
        <HandComponent
          hand={myHand}
          code={myCode}
          vault={myVault}
          isMyTurn={isMyTurn}
          turnPhase={turnPhase}
          pendingActionPlayerId={pendingAction?.playerId}
          myPlayerId={myPlayerId}
          onPlayNumber={handlePlayNumber}
          onPlayAction={handlePlayAction}
          onCounterAction={handleCounterAction}
          onDiscard={handleDiscard}
          onSelectForSwap={isPlayPhase ? setSelectedSwapCardId : undefined}
          selectedForSwap={selectedSwapCardId ?? undefined}
        />
      </div>
    </div>
  );
}
