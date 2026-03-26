import React from 'react';
import { PublicPlayerState, TurnState } from '../game/types';

interface PlayerStatusProps {
  players: PublicPlayerState[];
  turnState: TurnState | null;
  myPlayerId: string;
}

const PLAYER_COLORS = ['#4A90D9', '#E74C3C', '#27AE60', '#9B59B6'];

export function PlayerStatus({ players, turnState, myPlayerId }: PlayerStatusProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {players.map((player, idx) => {
        const isActive = turnState?.currentPlayerId === player.playerId;
        const isMe = player.playerId === myPlayerId;
        const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];

        return (
          <div
            key={player.playerId}
            style={{
              background: isActive ? 'rgba(197,160,40,0.15)' : '#3D2514',
              border: `2px solid ${isActive ? '#C5A028' : '#5C3D1A'}`,
              borderRadius: 8,
              padding: '10px 12px',
              position: 'relative',
            }}
          >
            {/* Active indicator */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: -1,
                left: -1,
                right: -1,
                height: 3,
                background: '#C5A028',
                borderRadius: '8px 8px 0 0',
              }} />
            )}

            {/* Player name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}>
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span style={{
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#C5A028' : '#F5E6C8',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {player.name}
              </span>
              {isMe && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#C5A028',
                  color: '#2C1A0E',
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  You
                </span>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <StatRow label="Hand" value={`${player.handCount} cards`} />
              <StatRow label="Deck" value={`${player.deckCount} cards`} />
              <StatRow
                label="Fame"
                value={`${player.famePoints} pts`}
                highlight={player.famePoints > 0}
              />
            </div>

            {isActive && turnState && (
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: '#C5A028',
                fontStyle: 'italic',
              }}>
                {turnState.phase === 'spelling' && 'Spelling a word...'}
                {turnState.phase === 'validating' && 'Validating word...'}
                {turnState.phase === 'trashing' && `Trashing ${turnState.trashRemaining} card(s)`}
                {turnState.phase === 'buying' && `Buying (${turnState.budgetRemaining}¢ left)`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: '#8B6914' }}>{label}:</span>
      <span style={{ color: highlight ? '#FFD700' : '#F5E6C8', fontWeight: highlight ? 700 : 400 }}>
        {value}
      </span>
    </div>
  );
}
