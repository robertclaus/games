import React from 'react';
import { GameAction, Guess, TeamId } from '../game/types';
import { WORDS_BY_CATEGORY, WORD_BY_ID } from '../game/words';

const BG       = '#0F172A';
const PANEL    = '#1E293B';
const BORDER   = '#334155';
const TEXT     = '#E2E8F0';
const MUTED    = '#94A3B8';
const RED_CLR  = '#EF4444';
const BLUE_CLR = '#3B82F6';
const ACCENT   = '#F59E0B';

// Per-category styling
const CAT_STYLE: Record<string, { label: string; bg: string; border: string; text: string }> = {
  noun:      { label: 'NOUNS',      bg: '#1E3A5F', border: '#3B82F6', text: '#93C5FD' },
  verb:      { label: 'VERBS',      bg: '#1A3A1A', border: '#22C55E', text: '#86EFAC' },
  adjective: { label: 'ADJECTIVES', bg: '#3B2A0A', border: '#F59E0B', text: '#FCD34D' },
  connector: { label: 'CONNECTORS', bg: '#2D1B3D', border: '#A855F7', text: '#D8B4FE' },
};

interface StorytellerPanelProps {
  myTeam: TeamId;
  myAnswer: string | null;
  arrangement: string[];        // ordered word IDs
  guesses: Guess[];
  onAction: (action: GameAction) => void;
}

export function StorytellerPanel({ myTeam, myAnswer, arrangement, guesses, onAction }: StorytellerPanelProps) {
  const teamColor = myTeam === 'red' ? RED_CLR : BLUE_CLR;

  function toggleWord(wordId: string) {
    let newArrangement: string[];
    if (arrangement.includes(wordId)) {
      newArrangement = arrangement.filter(id => id !== wordId);
    } else {
      newArrangement = [...arrangement, wordId];
    }
    onAction({ type: 'UPDATE_ARRANGEMENT', wordIds: newArrangement });
  }

  function moveWord(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= arrangement.length) return;
    const next = [...arrangement];
    [next[index], next[target]] = [next[target], next[index]];
    onAction({ type: 'UPDATE_ARRANGEMENT', wordIds: next });
  }

  function removeWord(index: number) {
    const next = arrangement.filter((_, i) => i !== index);
    onAction({ type: 'UPDATE_ARRANGEMENT', wordIds: next });
  }

  function clearAll() {
    onAction({ type: 'UPDATE_ARRANGEMENT', wordIds: [] });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Answer display ────────────────────────────────────────────────── */}
      <div style={{
        background: `${teamColor}18`,
        borderBottom: `2px solid ${teamColor}44`,
        padding: '14px 20px',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
          Your secret word — only you can see this:
        </div>
        <div style={{
          fontSize: '2rem', fontWeight: 900,
          color: myAnswer ? TEXT : MUTED,
          letterSpacing: '3px', textTransform: 'uppercase',
        }}>
          {myAnswer ?? '…waiting…'}
        </div>
      </div>

      {/* ── Main area: Library + Arrangement ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Word Library */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          borderRight: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, fontWeight: 600 }}>
            WORD LIBRARY — click to add to your arrangement
          </div>
          {(['noun', 'verb', 'adjective', 'connector'] as const).map(cat => {
            const s = CAT_STYLE[cat];
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: s.text,
                  textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6,
                }}>
                  {s.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {WORDS_BY_CATEGORY[cat].map(lw => {
                    const selected = arrangement.includes(lw.id);
                    return (
                      <button
                        key={lw.id}
                        onClick={() => toggleWord(lw.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 5,
                          border: `1px solid ${selected ? s.border : BORDER}`,
                          background: selected ? s.bg : BG,
                          color: selected ? s.text : MUTED,
                          fontSize: 13,
                          fontWeight: selected ? 700 : 400,
                          cursor: 'pointer',
                          textDecoration: selected ? 'underline' : 'none',
                          transition: 'all 0.1s',
                        }}
                      >
                        {lw.word}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrangement + Guesses */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Arrangement */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
                YOUR ARRANGEMENT
              </div>
              {arrangement.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    fontSize: 11, color: '#EF4444', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  clear all
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
              Your teammates see these words in real-time.
            </div>

            {arrangement.length === 0 ? (
              <div style={{
                textAlign: 'center', color: MUTED, fontSize: 12,
                padding: '20px 0', fontStyle: 'italic',
              }}>
                Click words from the library to build your clue
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {arrangement.map((wordId, i) => {
                  const lw = WORD_BY_ID.get(wordId);
                  if (!lw) return null;
                  const s = CAT_STYLE[lw.category];
                  return (
                    <div
                      key={`${wordId}-${i}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 6px',
                        borderRadius: 6,
                        background: s.bg,
                        border: `1px solid ${s.border}55`,
                      }}
                    >
                      <span style={{ fontSize: 13, color: s.text, flex: 1, fontWeight: 600 }}>
                        {lw.word}
                      </span>
                      <button
                        onClick={() => moveWord(i, -1)}
                        disabled={i === 0}
                        style={{
                          background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer',
                          color: i === 0 ? BORDER : MUTED, fontSize: 12, padding: '1px 3px',
                        }}
                        title="Move up"
                      >▲</button>
                      <button
                        onClick={() => moveWord(i, 1)}
                        disabled={i === arrangement.length - 1}
                        style={{
                          background: 'none', border: 'none',
                          cursor: i === arrangement.length - 1 ? 'default' : 'pointer',
                          color: i === arrangement.length - 1 ? BORDER : MUTED, fontSize: 12, padding: '1px 3px',
                        }}
                        title="Move down"
                      >▼</button>
                      <button
                        onClick={() => removeWord(i)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#EF444488', fontSize: 13, padding: '1px 3px',
                        }}
                        title="Remove"
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guesses feed */}
          <GuessHistory guesses={guesses} />
        </div>
      </div>
    </div>
  );
}

// ── Shared guess history ───────────────────────────────────────────────────────

export function GuessHistory({ guesses }: { guesses: Guess[] }) {
  const recent = [...guesses].reverse().slice(0, 20);
  return (
    <div style={{
      overflowY: 'auto',
      padding: '10px 14px',
      maxHeight: 220,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 600 }}>
        GUESSES
      </div>
      {recent.length === 0 ? (
        <div style={{ fontSize: 12, color: BORDER, fontStyle: 'italic' }}>No guesses yet</div>
      ) : (
        recent.map((g, i) => (
          <div
            key={i}
            style={{
              fontSize: 12,
              color: g.correct ? '#22C55E' : g.team === 'red' ? '#FCA5A5' : '#93C5FD',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{
              fontSize: 10,
              color: g.team === 'red' ? RED_CLR : BLUE_CLR,
            }}>
              {g.team === 'red' ? '🔴' : '🔵'}
            </span>
            <span style={{ color: MUTED }}>{g.playerName}:</span>
            <span style={{ fontWeight: g.correct ? 700 : 400 }}>{g.guess}</span>
            {g.correct && <span style={{ color: '#22C55E' }}>✓</span>}
          </div>
        ))
      )}
    </div>
  );
}
