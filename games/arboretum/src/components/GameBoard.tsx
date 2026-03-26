import React, { useState, useCallback } from 'react';
import {
  PublicGameState,
  Card,
  GridPosition,
  SPECIES_DISPLAY,
  SPECIES_COLORS,
} from '../game/types';
import { CardComponent, CardBack } from './CardComponent';
import { ArboretumGrid } from './ArboretumGrid';
import { HandComponent } from './HandComponent';

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  myHand: Card[];
  onAction: (action: GameBoardAction) => void;
  isMyTurn: boolean;
}

export type GameBoardAction =
  | { type: 'DRAW_FROM_DECK' }
  | { type: 'DRAW_FROM_DISCARD'; targetPlayerId: string }
  | { type: 'PLAY_CARD'; cardId: string; position: GridPosition }
  | { type: 'DISCARD_CARD'; cardId: string };

export function GameBoard({ publicState, myPlayerId, myHand, onAction, isMyTurn }: GameBoardProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<string | null>(null);

  const myPlayer = publicState.players.find(p => p.playerId === myPlayerId);
  const otherPlayers = publicState.players.filter(p => p.playerId !== myPlayerId);
  const currentPlayer = publicState.players[publicState.currentPlayerIndex];
  const phase = publicState.phase;

  // Determine what the current player needs to do
  function getPhaseLabel(): string {
    if (!isMyTurn) return `${currentPlayer?.name ?? '?'}'s turn`;
    switch (phase) {
      case 'drawing':
        return `Your turn — Draw ${2 - publicState.drawCount} more card${2 - publicState.drawCount !== 1 ? 's' : ''}`;
      case 'playing':
        return 'Your turn — Play a card to your arboretum';
      case 'discarding':
        return 'Your turn — Discard a card';
      default:
        return '';
    }
  }

  const handleDrawDeck = useCallback(() => {
    if (!isMyTurn || phase !== 'drawing') return;
    onAction({ type: 'DRAW_FROM_DECK' });
  }, [isMyTurn, phase, onAction]);

  const handleDrawDiscard = useCallback((targetPlayerId: string) => {
    if (!isMyTurn || phase !== 'drawing') return;
    onAction({ type: 'DRAW_FROM_DISCARD', targetPlayerId });
  }, [isMyTurn, phase, onAction]);

  const handleSelectCard = useCallback((cardId: string) => {
    if (!isMyTurn) return;
    if (phase === 'discarding') {
      // Immediately discard
      onAction({ type: 'DISCARD_CARD', cardId });
      setSelectedCardId(null);
      return;
    }
    setSelectedCardId(prev => prev === cardId ? null : cardId);
  }, [isMyTurn, phase, onAction]);

  const handlePlaceCard = useCallback((position: GridPosition) => {
    if (!isMyTurn || phase !== 'playing' || !selectedCardId) return;
    onAction({ type: 'PLAY_CARD', cardId: selectedCardId, position });
    setSelectedCardId(null);
  }, [isMyTurn, phase, selectedCardId, onAction]);

  // Determine the active viewing player for arboretum
  const displayedPlayerId = viewingPlayer ?? myPlayerId;
  const displayedPlayer = publicState.players.find(p => p.playerId === displayedPlayerId);

  const canDraw = isMyTurn && phase === 'drawing';
  const canPlay = isMyTurn && phase === 'playing';
  const canDiscard = isMyTurn && phase === 'discarding';

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Top status bar */}
      <div className="status-bar">
        <span>Room: <strong style={{ color: 'var(--color-text)' }}>{myPlayerId}</strong></span>
        <span style={{ marginLeft: 'auto' }}>
          Deck: <span className="highlight">{publicState.deckCount}</span> cards
        </span>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 12,
            background: isMyTurn ? 'rgba(92,184,92,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isMyTurn ? 'var(--color-accent)' : 'var(--color-border)'}`,
            color: isMyTurn ? 'var(--color-accent)' : 'var(--color-text-dim)',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {getPhaseLabel()}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar: other players */}
        <div
          style={{
            width: 200,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            Players
          </div>

          {publicState.players.map((player, idx) => {
            const isCurrentTurnPlayer = idx === publicState.currentPlayerIndex;
            const isMe = player.playerId === myPlayerId;
            const isViewing = displayedPlayerId === player.playerId;
            const discardTop = player.discardPile.length > 0
              ? player.discardPile[player.discardPile.length - 1]
              : null;

            return (
              <div
                key={player.playerId}
                onClick={() => setViewingPlayer(isViewing ? null : player.playerId)}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  background: isViewing ? 'rgba(92,184,92,0.1)' : 'transparent',
                  borderLeft: isCurrentTurnPlayer ? '3px solid var(--color-accent)' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isViewing) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  if (!isViewing) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: isMe ? 700 : 500, fontSize: 13 }}>
                    {player.name}
                    {isMe && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> (you)</span>}
                  </span>
                  {isCurrentTurnPlayer && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--color-accent)',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                  )}
                </div>

                {/* Discard pile top */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Discard:</span>
                  {discardTop ? (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        if (canDraw) handleDrawDiscard(player.playerId);
                      }}
                      style={{ cursor: canDraw ? 'pointer' : 'default' }}
                      title={canDraw ? `Draw ${SPECIES_DISPLAY[discardTop.species]} ${discardTop.value}` : ''}
                    >
                      <CardComponent
                        card={discardTop}
                        small
                        highlight={canDraw}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Empty</span>
                  )}
                </div>

                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Cards in arboretum: {player.arboretum.length}
                </div>
              </div>
            );
          })}

          {/* Deck draw button */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Draw Pile
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                onClick={canDraw ? handleDrawDeck : undefined}
                style={{
                  cursor: canDraw ? 'pointer' : 'default',
                  position: 'relative',
                  display: 'inline-block',
                }}
                title={canDraw ? 'Draw from deck' : ''}
              >
                <CardBack small />
                {canDraw && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 6,
                      border: '2px solid var(--color-accent)',
                      boxShadow: '0 0 8px rgba(92,184,92,0.5)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                {publicState.deckCount} left
              </span>
            </div>
          </div>
        </div>

        {/* Main content: arboretum view */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Arboretum tabs */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              flexShrink: 0,
              overflowX: 'auto',
            }}
          >
            {publicState.players.map(player => {
              const isViewing = displayedPlayerId === player.playerId;
              const isMe = player.playerId === myPlayerId;
              return (
                <button
                  key={player.playerId}
                  onClick={() => setViewingPlayer(player.playerId)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 0,
                    border: 'none',
                    borderBottom: isViewing ? '2px solid var(--color-accent)' : '2px solid transparent',
                    background: isViewing ? 'rgba(92,184,92,0.08)' : 'transparent',
                    color: isViewing ? 'var(--color-accent)' : 'var(--color-text-dim)',
                    fontWeight: isViewing ? 700 : 400,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {player.name}{isMe ? ' (you)' : ''} — {player.arboretum.length} cards
                </button>
              );
            })}
          </div>

          {/* Arboretum grid */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            {displayedPlayer && (
              <>
                {/* Action hint */}
                {canPlay && displayedPlayerId === myPlayerId && selectedCardId && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '8px 16px',
                      background: 'rgba(92,184,92,0.1)',
                      border: '1px solid var(--color-accent)',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--color-accent)',
                    }}
                  >
                    Click a highlighted cell (+) to place your card
                  </div>
                )}
                {canPlay && displayedPlayerId === myPlayerId && !selectedCardId && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '8px 16px',
                      background: 'rgba(240,173,78,0.1)',
                      border: '1px solid var(--color-warning)',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--color-warning)',
                    }}
                  >
                    Select a card from your hand to place it
                  </div>
                )}
                {canDiscard && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '8px 16px',
                      background: 'rgba(217,83,79,0.1)',
                      border: '1px solid var(--color-danger)',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--color-danger)',
                    }}
                  >
                    Select a card from your hand to discard it
                  </div>
                )}

                <ArboretumGrid
                  placedCards={displayedPlayer.arboretum}
                  onPlaceCard={
                    canPlay && displayedPlayerId === myPlayerId && selectedCardId
                      ? handlePlaceCard
                      : undefined
                  }
                  interactive={canPlay && displayedPlayerId === myPlayerId && !!selectedCardId}
                  label={`${displayedPlayer.name}'s Arboretum`}
                />
              </>
            )}
          </div>
        </div>

        {/* Right panel: opponents' arboretums (small view) */}
        {otherPlayers.length > 0 && (
          <div
            style={{
              width: 220,
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                fontSize: 11,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              Opponents' Arboretums
            </div>
            {otherPlayers.map(player => (
              <div
                key={player.playerId}
                style={{
                  padding: '10px 10px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <ArboretumGrid
                  placedCards={player.arboretum}
                  small
                  label={player.name}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: hand */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: '10px 16px',
          flexShrink: 0,
        }}
      >
        <HandComponent
          cards={myHand}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
          interactive={isMyTurn && (phase === 'playing' || phase === 'discarding')}
          label={
            canDiscard
              ? 'Your Hand — Click to discard'
              : canPlay
              ? 'Your Hand — Click to select for placement'
              : 'Your Hand'
          }
        />
      </div>
    </div>
  );
}
