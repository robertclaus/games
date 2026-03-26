import React, { useState } from 'react';
import { Booklet, PlayerInfo } from '../game/types';

const BG     = '#0F172A';
const PANEL  = '#1E293B';
const BORDER = '#334155';
const TEXT   = '#E2E8F0';
const MUTED  = '#94A3B8';
const PURPLE = '#8B5CF6';
const AMBER  = '#F59E0B';
const TEAL   = '#14B8A6';

interface ResultsViewerProps {
  booklets: Booklet[];
  players: PlayerInfo[];
  isHost: boolean;
  myPlayerId: string;
  onPlayAgain: () => void;
}

export function ResultsViewer({ booklets, players, isHost, myPlayerId, onPlayAgain }: ResultsViewerProps) {
  const [activeIdx, setActiveIdx] = useState(() => {
    // Start with the current player's booklet
    const myBookletIdx = booklets.findIndex(b => b.ownerPlayerId === myPlayerId);
    return myBookletIdx >= 0 ? myBookletIdx : 0;
  });

  const booklet = booklets[activeIdx];

  if (!booklet) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
        No booklets available.
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: PANEL, borderBottom: `1px solid ${BORDER}`,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>✏️ Results</span>
        <div style={{ flex: 1 }} />
        {isHost && (
          <button
            onClick={onPlayAgain}
            style={{
              padding: '7px 18px', borderRadius: 6, border: 'none',
              background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Play Again
          </button>
        )}
        {!isHost && (
          <span style={{ color: MUTED, fontSize: 13 }}>Waiting for host to start a new game…</span>
        )}
      </div>

      {/* Booklet tabs */}
      <div style={{
        background: PANEL, borderBottom: `1px solid ${BORDER}`,
        padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto', flexShrink: 0,
      }}>
        {booklets.map((b, i) => {
          const isActive = i === activeIdx;
          const isOwn = b.ownerPlayerId === myPlayerId;
          return (
            <button
              key={b.ownerPlayerId}
              onClick={() => setActiveIdx(i)}
              style={{
                padding: '10px 16px', border: 'none', borderBottom: isActive ? `2px solid ${PURPLE}` : '2px solid transparent',
                background: 'transparent', color: isActive ? TEXT : MUTED, cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap',
                outline: 'none',
              }}
            >
              {b.ownerName}{isOwn ? ' (yours)' : ''}
            </button>
          );
        })}
      </div>

      {/* Chain */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>
            <span style={{ color: TEXT, fontWeight: 600 }}>{booklet.ownerName}'s booklet</span>
            {' '}· {booklet.entries.length} entries
          </div>

          {booklet.entries.length === 0 && (
            <div style={{ color: MUTED, fontStyle: 'italic', fontSize: 14 }}>No entries in this booklet.</div>
          )}

          {booklet.entries.map((entry, i) => {
            const isWord = entry.type === 'word';
            const roundLabel = i === 0 ? 'Original word' : i % 2 === 1 ? 'Drawing' : 'Guess';
            const accent = i === 0 ? PURPLE : i % 2 === 1 ? AMBER : TEAL;
            const isEmpty = !entry.content;

            return (
              <React.Fragment key={i}>
                {/* Connector arrow */}
                {i > 0 && (
                  <div style={{ textAlign: 'center', color: BORDER, fontSize: 20, lineHeight: 1 }}>↓</div>
                )}

                {/* Entry card */}
                <div style={{
                  background: PANEL, border: `1px solid ${accent}33`, borderRadius: 10, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '8px 16px', borderBottom: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                      {roundLabel}
                    </span>
                    <span style={{ fontSize: 12, color: MUTED }}>by {entry.authorName}</span>
                  </div>

                  <div style={{ padding: 16 }}>
                    {isWord ? (
                      isEmpty ? (
                        <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 14 }}>(skipped)</span>
                      ) : (
                        <span style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: '-0.3px' }}>
                          "{entry.content}"
                        </span>
                      )
                    ) : isEmpty ? (
                      <div style={{
                        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: MUTED, fontSize: 14, fontStyle: 'italic', background: BG, borderRadius: 6,
                      }}>
                        [No drawing submitted]
                      </div>
                    ) : (
                      <img
                        src={entry.content}
                        alt={`Drawing by ${entry.authorName}`}
                        style={{ width: '100%', maxWidth: 600, height: 'auto', borderRadius: 6, display: 'block' }}
                      />
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Compare original to final */}
          {booklet.entries.length >= 2 && (() => {
            const first = booklet.entries[0];
            const last = booklet.entries[booklet.entries.length - 1];
            const match = first.type === 'word' && last.type === 'word' &&
              first.content.trim().toLowerCase() === last.content.trim().toLowerCase();
            const bothWord = first.type === 'word' && last.type === 'word';
            return (
              <div style={{
                marginTop: 8, padding: '12px 16px', borderRadius: 10,
                background: match ? '#052E16' : '#1C1917',
                border: `1px solid ${match ? '#16A34A' : BORDER}`,
                fontSize: 13, color: match ? '#86EFAC' : MUTED,
              }}>
                {match
                  ? '🎯 The final guess matched the original word!'
                  : bothWord
                    ? `Started as "${first.content}" · ended as "${last.content}"`
                    : 'The chain ended on a drawing.'}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Booklet nav footer */}
      <div style={{
        background: PANEL, borderTop: `1px solid ${BORDER}`,
        padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexShrink: 0,
      }}>
        <button
          onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
          disabled={activeIdx === 0}
          style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: activeIdx === 0 ? BORDER : TEXT, cursor: activeIdx === 0 ? 'default' : 'pointer', fontSize: 13 }}
        >
          ← Prev booklet
        </button>
        <span style={{ fontSize: 13, color: MUTED }}>
          {activeIdx + 1} / {booklets.length}
        </span>
        <button
          onClick={() => setActiveIdx(i => Math.min(booklets.length - 1, i + 1))}
          disabled={activeIdx === booklets.length - 1}
          style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: activeIdx === booklets.length - 1 ? BORDER : TEXT, cursor: activeIdx === booklets.length - 1 ? 'default' : 'pointer', fontSize: 13 }}
        >
          Next booklet →
        </button>
        <span style={{ color: players.find(p => booklets[activeIdx]?.ownerPlayerId === p.playerId) ? TEXT : MUTED, fontSize: 13, fontWeight: 600 }}>
          {booklets[activeIdx]?.ownerName}'s booklet
        </span>
      </div>
    </div>
  );
}
