import React from 'react';
import { PublicGameState, CardInstance, GameAction } from '../game/types';
import { PlayerStatus } from './PlayerStatus';
import { CommonPile } from './CommonPile';
import { OfferArea } from './OfferArea';
import { FamePiles } from './FamePiles';
import { HandArea } from './HandArea';

interface GameBoardProps {
  publicState: PublicGameState;
  myHand: CardInstance[];
  myPlayerId: string;
  isHost: boolean;
  onAction: (action: GameAction) => void;
}

export function GameBoard({ publicState, myHand, myPlayerId, isHost, onAction }: GameBoardProps) {
  const { turnState, players, offerPiles, famePiles, commonPile, log } = publicState;

  const isMyTurn = turnState?.currentPlayerId === myPlayerId;
  const currentPlayer = players.find(p => p.playerId === turnState?.currentPlayerId);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#2C1A0E',
      color: '#F5E6C8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: '#3D2514',
        borderBottom: '2px solid #C5A028',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '1.4rem',
          fontWeight: 900,
          color: '#C5A028',
          fontFamily: 'Georgia, serif',
        }}>
          📖 Paperback
        </div>

        {/* Current turn indicator */}
        {turnState && (
          <div style={{
            fontSize: 13,
            color: '#F5E6C8',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ color: '#8B6914' }}>Turn:</span>
            <span style={{ fontWeight: 700, color: isMyTurn ? '#C5A028' : '#F5E6C8' }}>
              {isMyTurn ? 'Your Turn!' : `${currentPlayer?.name ?? '...'}'s turn`}
            </span>
            {turnState.phase === 'validating' && (
              <span style={{
                background: 'rgba(197,160,40,0.2)',
                border: '1px solid #C5A028',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 11,
                color: '#C5A028',
              }}>
                VALIDATING...
              </span>
            )}
          </div>
        )}

        {/* Game end warning */}
        {publicState.phase === 'playing' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {(commonPile.remaining === 0 || famePiles.some(p => p.count === 0)) && (
              <div style={{
                background: 'rgba(239,83,80,0.2)',
                border: '1px solid #ef5350',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                color: '#ef5350',
                fontWeight: 700,
              }}>
                LAST ROUND
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 0,
        overflow: 'hidden',
      }}>
        {/* Left column: Player Status (20%) */}
        <div style={{
          width: '20%',
          minWidth: 160,
          maxWidth: 220,
          background: '#2C1A0E',
          borderRight: '1px solid #5C3D1A',
          padding: 12,
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11,
            color: '#8B6914',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            Players
          </div>
          <PlayerStatus
            players={players}
            turnState={turnState}
            myPlayerId={myPlayerId}
          />
        </div>

        {/* Center column: Main game area (55%) */}
        <div style={{
          flex: 1,
          padding: 12,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Validating overlay */}
          {turnState?.phase === 'validating' && (
            <div style={{
              background: 'rgba(44,26,14,0.9)',
              border: '2px solid #C5A028',
              borderRadius: 8,
              padding: '12px 16px',
              textAlign: 'center',
              color: '#C5A028',
              fontWeight: 700,
              fontSize: 15,
            }}>
              Checking "{turnState.playedWord}" with dictionary...
            </div>
          )}

          {/* Not your turn banner */}
          {!isMyTurn && turnState && (
            <div style={{
              background: 'rgba(44,26,14,0.8)',
              border: '1px solid #5C3D1A',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 13,
              color: '#8B6914',
              textAlign: 'center',
            }}>
              Waiting for {currentPlayer?.name ?? '...'} to take their turn
              {turnState.phase === 'validating' && ' (validating word...)'}
            </div>
          )}

          {/* Common Pile */}
          <CommonPile
            topCard={commonPile.topCard}
            remaining={commonPile.remaining}
            lengthRequired={commonPile.lengthRequired}
          />

          {/* Offer Area */}
          <OfferArea
            offerPiles={offerPiles}
            turnState={turnState}
            myPlayerId={myPlayerId}
            onAction={onAction}
          />

          {/* Fame Piles */}
          <FamePiles
            famePiles={famePiles}
            turnState={turnState}
            myPlayerId={myPlayerId}
            onAction={onAction}
          />

          {/* Hand Area — only for active player */}
          {isMyTurn && turnState && (
            <HandArea
              hand={myHand}
              turnState={turnState}
              commonCard={commonPile}
              onAction={onAction}
            />
          )}
        </div>

        {/* Right column: Game log (25%) */}
        <div style={{
          width: '25%',
          minWidth: 180,
          maxWidth: 280,
          background: '#2C1A0E',
          borderLeft: '1px solid #5C3D1A',
          padding: 12,
          overflowY: 'auto',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{
            fontSize: 11,
            color: '#8B6914',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}>
            Game Log
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: 1,
          }}>
            {[...log].reverse().map((entry, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: i === 0 ? '#F5E6C8' : '#8B6914',
                  padding: '4px 6px',
                  background: i === 0 ? 'rgba(197,160,40,0.08)' : 'transparent',
                  borderRadius: 4,
                  lineHeight: 1.4,
                }}
              >
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
