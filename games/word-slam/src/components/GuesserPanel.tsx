import React, { useState, useRef, useEffect } from 'react';
import { PublicGameState, GameAction, TeamId } from '../game/types';
import { getStorytellerId } from '../game/engine';
import { WORD_BY_ID } from '../game/words';
import { GuessHistory } from './StorytellerPanel';

const BG       = '#0F172A';
const PANEL    = '#1E293B';
const BORDER   = '#334155';
const TEXT     = '#E2E8F0';
const MUTED    = '#94A3B8';
const RED_CLR  = '#EF4444';
const BLUE_CLR = '#3B82F6';
const ACCENT   = '#F59E0B';

interface GuesserPanelProps {
  myTeam: TeamId | null;
  myPlayerId: string;
  publicState: PublicGameState;
  onAction: (action: GameAction) => void;
}

export function GuesserPanel({ myTeam, myPlayerId, publicState, onAction }: GuesserPanelProps) {
  const { teams, guesses, phase } = publicState;
  const [guessInput, setGuessInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const canGuess = phase === 'round_active' && !!myTeam;

  // Focus input on mount
  useEffect(() => {
    if (canGuess) inputRef.current?.focus();
  }, [canGuess]);

  function submitGuess() {
    const text = guessInput.trim();
    if (!text || !canGuess) return;
    onAction({ type: 'SUBMIT_GUESS', guess: text });
    setGuessInput('');
  }

  const teamColor    = myTeam === 'red' ? RED_CLR : myTeam === 'blue' ? BLUE_CLR : MUTED;
  const teamLabel    = myTeam === 'red' ? '🔴 Red' : myTeam === 'blue' ? '🔵 Blue' : '';
  const myTeamState  = myTeam ? teams[myTeam] : null;
  const arrangement  = myTeamState?.arrangement ?? [];

  const storytellerId   = myTeam ? getStorytellerId(publicState, myTeam) : null;
  const storytellerName = publicState.players.find(p => p.playerId === storytellerId)?.name ?? 'Storyteller';

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ── Left: Arrangement + Guess input ──────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Team header */}
        <div style={{
          background: `${teamColor}18`,
          borderBottom: `2px solid ${teamColor}44`,
          padding: '10px 20px',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
            {teamLabel} Team Clues — {storytellerName}'s arrangement:
          </div>
          <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>
            Updates live as your storyteller builds the clue
          </div>
        </div>

        {/* Arrangement display */}
        <div style={{
          padding: '16px 20px',
          flexShrink: 0,
          minHeight: 80,
          overflowX: 'auto',
        }}>
          {arrangement.length === 0 ? (
            <div style={{
              color: MUTED, fontSize: 14, fontStyle: 'italic', padding: '8px 0',
            }}>
              Waiting for {storytellerName} to arrange words…
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {arrangement.map((wordId, i) => {
                const lw = WORD_BY_ID.get(wordId);
                if (!lw) return null;
                return (
                  <React.Fragment key={`${wordId}-${i}`}>
                    {i > 0 && <span style={{ color: BORDER, fontSize: 14 }}>›</span>}
                    <span style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      background: PANEL,
                      border: `2px solid ${teamColor}66`,
                      color: TEXT,
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}>
                      {lw.word}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BORDER, margin: '0 20px', flexShrink: 0 }} />

        {/* Guess input */}
        <div style={{ padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, marginBottom: 8 }}>
            Your guess:
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitGuess()}
              placeholder={canGuess ? 'Type your answer…' : 'Round ended'}
              disabled={!canGuess}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: 8,
                border: `2px solid ${canGuess ? teamColor + '88' : BORDER}`,
                background: BG,
                color: TEXT,
                fontSize: 16,
                outline: 'none',
                opacity: canGuess ? 1 : 0.5,
              }}
            />
            <button
              onClick={submitGuess}
              disabled={!canGuess || !guessInput.trim()}
              style={{
                padding: '11px 22px',
                borderRadius: 8,
                border: 'none',
                background: canGuess && guessInput.trim() ? teamColor : '#374151',
                color: canGuess && guessInput.trim() ? '#0F172A' : MUTED,
                fontSize: 15,
                fontWeight: 700,
                cursor: canGuess && guessInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Guess!
            </button>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
            Press Enter or click Guess to submit • Case-insensitive
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Other team's status (read-only) */}
        <OtherTeamStatus myTeam={myTeam} publicState={publicState} />
      </div>

      {/* ── Right: Guess history ──────────────────────────────────────────── */}
      <div style={{
        width: 260,
        borderLeft: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${BORDER}`,
          fontSize: 12,
          color: MUTED,
          fontWeight: 600,
          flexShrink: 0,
        }}>
          ALL GUESSES — both teams visible to everyone
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <GuessHistory guesses={guesses} />
        </div>
      </div>
    </div>
  );
}

// Shows the other team's arrangement count (not the actual words — they can't see those)
function OtherTeamStatus({ myTeam, publicState }: { myTeam: TeamId | null; publicState: PublicGameState }) {
  const otherTeam = myTeam === 'red' ? 'blue' : 'red';
  const otherColor = otherTeam === 'red' ? RED_CLR : BLUE_CLR;
  const otherState = publicState.teams[otherTeam];
  const otherStorytellerId = getStorytellerId(publicState, otherTeam);
  const otherStoryteller = publicState.players.find(p => p.playerId === otherStorytellerId)?.name ?? '—';

  if (!myTeam) return null;

  return (
    <div style={{
      padding: '10px 20px',
      borderTop: `1px solid ${BORDER}`,
      flexShrink: 0,
      background: '#0A1628',
    }}>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
        <span style={{ color: otherColor, fontWeight: 700 }}>
          {otherTeam === 'red' ? '🔴 Red' : '🔵 Blue'} Team
        </span>
        {' '}storyteller ({otherStoryteller}) has placed{' '}
        <span style={{ color: otherColor, fontWeight: 700 }}>
          {otherState.arrangement.length} word{otherState.arrangement.length !== 1 ? 's' : ''}
        </span>
        {' '}(you can't see their arrangement)
      </div>
    </div>
  );
}
