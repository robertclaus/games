import React, { useState, useRef, useEffect } from 'react';
import { PublicGameState, GameAction, BookletPrompt } from '../game/types';
import { DrawingCanvas, DrawingCanvasHandle } from './DrawingCanvas';

const BG     = '#0F172A';
const PANEL  = '#1E293B';
const BORDER = '#334155';
const TEXT   = '#E2E8F0';
const MUTED  = '#94A3B8';
const PURPLE = '#8B5CF6';
const AMBER  = '#F59E0B';
const TEAL   = '#14B8A6';

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  isHost: boolean;
  myPrompt: BookletPrompt | null;
  submitted: boolean;
  onAction: (action: GameAction) => void;
}

export function GameBoard({ publicState, myPlayerId, isHost, myPrompt, submitted, onAction }: GameBoardProps) {
  const { phase, round, totalRounds, submittedCount, players } = publicState;
  const phaseLabel = phase === 'writing' ? 'Write' : phase === 'drawing' ? 'Draw' : 'Guess';
  const phaseColor = phase === 'writing' ? PURPLE : phase === 'drawing' ? AMBER : TEAL;

  const allSubmitted = submittedCount >= players.length;

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: PANEL, borderBottom: `1px solid ${BORDER}`,
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, color: phaseColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {phaseLabel}
        </span>
        <span style={{ fontSize: 13, color: MUTED }}>
          Round {round + 1} of {totalRounds}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: MUTED }}>
          {submittedCount}/{players.length} submitted
        </span>
        {/* Player dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {players.map(p => {
            // We don't have exact submitted IDs in public state — use count heuristic
            // Just show all player dots with the current player highlighted
            const isMe = p.playerId === myPlayerId;
            return (
              <div key={p.playerId} title={p.name} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isMe ? phaseColor : BORDER,
              }} />
            );
          })}
        </div>
        {/* Host force-advance */}
        {isHost && !allSubmitted && (
          <button
            onClick={() => onAction({ type: 'FORCE_ADVANCE' })}
            style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 11, cursor: 'pointer' }}
            title="Skip players who haven't submitted yet"
          >
            Force Advance ⏭
          </button>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto' }}>
        {submitted ? (
          <WaitingPanel
            submittedCount={submittedCount}
            totalPlayers={players.length}
            players={players}
          />
        ) : phase === 'writing' ? (
          <WritingPanel
            prompt={myPrompt}
            onSubmit={text => onAction({ type: 'SUBMIT_ENTRY', content: text, entryType: 'word' })}
          />
        ) : phase === 'drawing' ? (
          <DrawingPanel
            prompt={myPrompt}
            onSubmit={dataUrl => onAction({ type: 'SUBMIT_ENTRY', content: dataUrl, entryType: 'drawing' })}
          />
        ) : phase === 'guessing' ? (
          <GuessingPanel
            prompt={myPrompt}
            onSubmit={text => onAction({ type: 'SUBMIT_ENTRY', content: text, entryType: 'word' })}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Writing panel ─────────────────────────────────────────────────────────────

function WritingPanel({ prompt, onSubmit }: {
  prompt: BookletPrompt | null;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');

  function submit() {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
  }

  return (
    <div style={{ maxWidth: 480, width: '100%' }}>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32 }}>
        <div style={{ fontSize: 11, color: PURPLE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Round 1 · Write
        </div>
        <h2 style={{ color: TEXT, fontSize: 22, marginBottom: 8 }}>
          Start your booklet
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Write a word or short phrase. Your booklet will travel around the table — others will draw and guess what you wrote. No letters or numbers allowed in drawings!
        </p>
        {prompt?.bookletOwnerName && (
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
            Your booklet · <strong style={{ color: TEXT }}>{prompt.bookletOwnerName}</strong>
          </div>
        )}
        <input
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. dancing elephant"
          maxLength={60}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8,
            border: `2px solid ${PURPLE}66`, background: BG, color: TEXT, fontSize: 16, outline: 'none',
            marginBottom: 16,
          }}
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          style={{
            width: '100%', padding: 14, borderRadius: 8, border: 'none',
            background: text.trim() ? PURPLE : BORDER, color: text.trim() ? '#fff' : MUTED,
            fontSize: 15, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Submit Word ✓
        </button>
      </div>
    </div>
  );
}

// ── Drawing panel ─────────────────────────────────────────────────────────────

function DrawingPanel({ prompt, onSubmit }: {
  prompt: BookletPrompt | null;
  onSubmit: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  function submit() {
    const dataUrl = canvasRef.current?.getDataUrl() ?? '';
    onSubmit(dataUrl);
  }

  const wordToDraw = prompt?.previousEntry?.content ?? '…';
  const ownerName = prompt?.bookletOwnerName ?? '?';

  return (
    <div style={{ maxWidth: 660, width: '100%' }}>
      {/* Prompt banner */}
      <div style={{
        background: `${AMBER}18`, border: `1px solid ${AMBER}44`, borderRadius: 10,
        padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 11, color: AMBER, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Draw this</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-0.5px' }}>"{wordToDraw}"</span>
        <span style={{ fontSize: 12, color: MUTED, marginLeft: 'auto', flexShrink: 0 }}>from {ownerName}'s booklet</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <DrawingCanvas ref={canvasRef} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <p style={{ fontSize: 12, color: MUTED, flex: 1 }}>
          No letters or numbers · Draw whatever comes to mind
        </p>
        <button
          onClick={submit}
          style={{
            padding: '12px 28px', borderRadius: 8, border: 'none',
            background: AMBER, color: '#0F172A', fontSize: 15, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          Submit Drawing ✓
        </button>
      </div>
    </div>
  );
}

// ── Guessing panel ────────────────────────────────────────────────────────────

function GuessingPanel({ prompt, onSubmit }: {
  prompt: BookletPrompt | null;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');

  function submit() {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
  }

  const drawing = prompt?.previousEntry?.content ?? '';
  const ownerName = prompt?.bookletOwnerName ?? '?';

  return (
    <div style={{ maxWidth: 660, width: '100%' }}>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 11, color: TEAL, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Guess what this drawing shows · from {ownerName}'s booklet
        </div>

        {/* Drawing */}
        <div style={{ marginBottom: 20, border: `2px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', lineHeight: 0 }}>
          {drawing ? (
            <img
              src={drawing}
              alt="Drawing to guess"
              style={{ width: '100%', maxWidth: 600, height: 'auto', display: 'block' }}
            />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 14 }}>
              [No drawing submitted]
            </div>
          )}
        </div>

        <p style={{ color: MUTED, fontSize: 13, marginBottom: 12 }}>
          What do you think this is? Write your best guess (even if you have no idea!).
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Your guess…"
            maxLength={60}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 8,
              border: `2px solid ${TEAL}66`, background: BG, color: TEXT, fontSize: 15, outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{
              padding: '11px 24px', borderRadius: 8, border: 'none',
              background: text.trim() ? TEAL : BORDER, color: text.trim() ? '#0F172A' : MUTED,
              fontSize: 15, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
            }}
          >
            Submit Guess ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Waiting panel ─────────────────────────────────────────────────────────────

function WaitingPanel({ submittedCount, totalPlayers, players }: {
  submittedCount: number;
  totalPlayers: number;
  players: PublicGameState['players'];
}) {
  const remaining = totalPlayers - submittedCount;

  return (
    <div style={{ maxWidth: 420, width: '100%' }}>
      <div style={{
        background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <h2 style={{ color: TEXT, fontSize: 20, marginBottom: 8 }}>Submitted!</h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
          {remaining > 0
            ? `Waiting for ${remaining} more player${remaining !== 1 ? 's' : ''}…`
            : 'Everyone has submitted! Moving to the next round…'}
        </p>
        {/* Progress bar */}
        <div style={{ background: BG, borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: PURPLE,
            width: `${(submittedCount / totalPlayers) * 100}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        {/* Player list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {players.map((_p, i) => (
            <div key={_p.playerId} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 10px', borderRadius: 6, background: BG,
              border: `1px solid ${BORDER}`,
            }}>
              <span style={{ fontSize: 14 }}>{i < submittedCount ? '✓' : '⏳'}</span>
              <span style={{ fontSize: 13, color: i < submittedCount ? TEXT : MUTED }}>
                {_p.name}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 12 }}>
          (submission order may differ from display order)
        </p>
      </div>
    </div>
  );
}
