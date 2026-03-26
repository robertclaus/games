import React from 'react';
import { PublicGameState } from '../game/types';

const BG       = '#0F172A';
const PANEL    = '#1E293B';
const BORDER   = '#334155';
const TEXT     = '#E2E8F0';
const MUTED    = '#94A3B8';
const RED_CLR  = '#EF4444';
const BLUE_CLR = '#3B82F6';
const ACCENT   = '#F59E0B';

interface ScoreScreenProps {
  publicState: PublicGameState;
  isHost: boolean;
  myPlayerId: string;
  onPlayAgain: () => void;
}

export function ScoreScreen({ publicState, isHost, myPlayerId, onPlayAgain }: ScoreScreenProps) {
  const { teams } = publicState;
  const redScore  = teams.red.score;
  const blueScore = teams.blue.score;

  const winner =
    redScore  > blueScore ? 'red'  :
    blueScore > redScore  ? 'blue' :
    'tie';

  const winnerLabel =
    winner === 'red'  ? '🔴 Red Team Wins!' :
    winner === 'blue' ? '🔵 Blue Team Wins!' :
    "It's a Tie!";

  const winnerColor =
    winner === 'red'  ? RED_CLR  :
    winner === 'blue' ? BLUE_CLR :
    ACCENT;

  const redPlayers  = publicState.players.filter(p => p.team === 'red');
  const bluePlayers = publicState.players.filter(p => p.team === 'blue');

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: PANEL,
        border: `2px solid ${winnerColor}`,
        borderRadius: 16,
        padding: '40px 48px',
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        textAlign: 'center',
        boxShadow: `0 0 40px ${winnerColor}33`,
      }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: ACCENT, marginBottom: 4 }}>
            Game Over!
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: winnerColor }}>
            {winnerLabel}
          </div>
        </div>

        {/* Score cards */}
        <div style={{ display: 'flex', gap: 16 }}>
          <ScoreCard
            color={RED_CLR}
            label="🔴 Red Team"
            score={redScore}
            players={redPlayers}
            myPlayerId={myPlayerId}
            isWinner={winner === 'red'}
          />
          <ScoreCard
            color={BLUE_CLR}
            label="🔵 Blue Team"
            score={blueScore}
            players={bluePlayers}
            myPlayerId={myPlayerId}
            isWinner={winner === 'blue'}
          />
        </div>

        {/* Rounds played */}
        <div style={{ fontSize: 13, color: MUTED }}>
          {publicState.totalRounds} rounds played
        </div>

        {/* Play Again */}
        {isHost ? (
          <button
            onClick={onPlayAgain}
            style={{
              padding: '13px 0', borderRadius: 8, border: 'none',
              background: ACCENT, color: '#0F172A',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Play Again
          </button>
        ) : (
          <div style={{ color: MUTED, fontSize: 14 }}>
            Waiting for host to start a new game…
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({
  color, label, score, players, myPlayerId, isWinner,
}: {
  color: string;
  label: string;
  score: number;
  players: { playerId: string; name: string }[];
  myPlayerId: string;
  isWinner: boolean;
}) {
  return (
    <div style={{
      flex: 1,
      background: BG,
      border: `2px solid ${isWinner ? color : BORDER}`,
      borderRadius: 12,
      padding: '16px 12px',
      boxShadow: isWinner ? `0 0 20px ${color}44` : undefined,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>points</div>
      {players.map(p => (
        <div key={p.playerId} style={{
          fontSize: 13,
          color: p.playerId === myPlayerId ? color : MUTED,
          fontWeight: p.playerId === myPlayerId ? 700 : 400,
          padding: '2px 0',
        }}>
          {p.name}{p.playerId === myPlayerId ? ' (you)' : ''}
        </div>
      ))}
    </div>
  );
}
