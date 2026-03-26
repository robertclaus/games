import React, { useState, useEffect } from 'react';
import { PublicGameState, GameAction, TeamId } from '../game/types';
import { getStorytellerId } from '../game/engine';
import { StorytellerPanel } from './StorytellerPanel';
import { GuesserPanel } from './GuesserPanel';

const BG       = '#0F172A';
const PANEL    = '#1E293B';
const BORDER   = '#334155';
const TEXT     = '#E2E8F0';
const MUTED    = '#94A3B8';
const RED_CLR  = '#EF4444';
const BLUE_CLR = '#3B82F6';
const ACCENT   = '#F59E0B';

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  myAnswer: string | null;
  onAction: (action: GameAction) => void;
}

export function GameBoard({ publicState, myPlayerId, myAnswer, onAction }: GameBoardProps) {
  const { phase, teams, round, totalRounds, roundStartTime, roundDuration, guesses, roundResult } = publicState;

  // Determine local player's role
  const myInfo = publicState.players.find(p => p.playerId === myPlayerId);
  const myTeam = myInfo?.team ?? null;

  const redStorytellerId  = getStorytellerId(publicState, 'red');
  const blueStorytellerId = getStorytellerId(publicState, 'blue');
  const amStoryteller = myPlayerId === redStorytellerId || myPlayerId === blueStorytellerId;

  // Client-side countdown
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (phase !== 'round_active') { setTimeLeft(0); return; }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((roundStartTime + roundDuration - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [phase, roundStartTime, roundDuration]);

  const timerPct    = roundDuration > 0 ? timeLeft / (roundDuration / 1000) : 0;
  const timerColor  = timeLeft > 60 ? '#22C55E' : timeLeft > 30 ? ACCENT : '#EF4444';

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: PANEL,
        borderBottom: `1px solid ${BORDER}`,
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: ACCENT }}>Word Slam</div>

        {/* Scores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TeamScore color={RED_CLR}  label="Red"  score={teams.red.score}  />
          <span style={{ color: MUTED, fontSize: 12 }}>vs</span>
          <TeamScore color={BLUE_CLR} label="Blue" score={teams.blue.score} />
        </div>

        {/* Round */}
        <div style={{ fontSize: 13, color: MUTED }}>
          Round <span style={{ color: TEXT, fontWeight: 700 }}>{round}</span>
          {' / '}{totalRounds}
        </div>

        {/* Role badge */}
        {myTeam && (
          <div style={{
            padding: '3px 10px', borderRadius: 20,
            background: myTeam === 'red' ? `${RED_CLR}22` : `${BLUE_CLR}22`,
            border: `1px solid ${myTeam === 'red' ? RED_CLR : BLUE_CLR}`,
            color: myTeam === 'red' ? RED_CLR : BLUE_CLR,
            fontSize: 12, fontWeight: 700,
          }}>
            {myTeam === 'red' ? '🔴 Red' : '🔵 Blue'} · {amStoryteller ? 'Storyteller' : 'Guesser'}
          </div>
        )}

        {/* Timer */}
        {phase === 'round_active' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: MUTED }}>⏱</div>
            <div style={{
              width: 120, height: 8, borderRadius: 4,
              background: '#1E293B', overflow: 'hidden',
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: timerColor,
                width: `${timerPct * 100}%`,
                transition: 'width 0.5s linear, background 1s',
              }} />
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: timerColor, minWidth: 32, textAlign: 'right',
            }}>
              {timeLeft}s
            </div>
          </div>
        )}
      </div>

      {/* ── Storytellers row ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '6px 20px',
        background: '#0A1628',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        gap: 24,
        fontSize: 12,
        color: MUTED,
        flexShrink: 0,
      }}>
        <span>
          <span style={{ color: RED_CLR, fontWeight: 700 }}>🔴 Red storyteller: </span>
          {publicState.players.find(p => p.playerId === redStorytellerId)?.name ?? '—'}
        </span>
        <span>
          <span style={{ color: BLUE_CLR, fontWeight: 700 }}>🔵 Blue storyteller: </span>
          {publicState.players.find(p => p.playerId === blueStorytellerId)?.name ?? '—'}
        </span>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {amStoryteller ? (
          <StorytellerPanel
            myTeam={myTeam as TeamId}
            myAnswer={myAnswer}
            arrangement={myTeam ? publicState.teams[myTeam].arrangement : []}
            guesses={guesses}
            onAction={onAction}
          />
        ) : (
          <GuesserPanel
            myTeam={myTeam}
            myPlayerId={myPlayerId}
            publicState={publicState}
            onAction={onAction}
          />
        )}
      </div>

      {/* ── Round Result Overlay ─────────────────────────────────────────────── */}
      {phase === 'round_result' && roundResult && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: PANEL,
            border: `3px solid ${roundResult.winnerTeam === 'red' ? RED_CLR : roundResult.winnerTeam === 'blue' ? BLUE_CLR : ACCENT}`,
            borderRadius: 16,
            padding: '36px 48px',
            textAlign: 'center',
            minWidth: 320,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            {roundResult.winnerTeam ? (
              <>
                <div style={{
                  fontSize: '2rem', fontWeight: 900,
                  color: roundResult.winnerTeam === 'red' ? RED_CLR : BLUE_CLR,
                  marginBottom: 8,
                }}>
                  {roundResult.winnerTeam === 'red' ? '🔴 Red Team' : '🔵 Blue Team'} Wins!
                </div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 16 }}>
                  +1 point
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: ACCENT, marginBottom: 8 }}>
                  ⏱ Time's Up!
                </div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 16 }}>
                  No one scored this round
                </div>
              </>
            )}
            <div style={{ fontSize: 14, color: TEXT }}>The word was:</div>
            <div style={{
              fontSize: '1.8rem', fontWeight: 900, color: TEXT,
              marginTop: 6, marginBottom: 20,
              textTransform: 'uppercase', letterSpacing: '2px',
            }}>
              {roundResult.answer}
            </div>
            <div style={{ fontSize: 12, color: MUTED }}>Next round starting…</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamScore({ color, label, score }: { color: string; label: string; score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</span>
      <span style={{
        background: `${color}22`, border: `1px solid ${color}`,
        color, borderRadius: 6, padding: '1px 8px',
        fontSize: 15, fontWeight: 900,
      }}>{score}</span>
    </div>
  );
}
