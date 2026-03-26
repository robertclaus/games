import React, { useState, useEffect, useCallback } from 'react';
import { CardInstance, TurnState, GameAction } from '../game/types';
import { canSpellWord } from '../game/engine';
import { CardTile } from './CardTile';

interface HandAreaProps {
  hand: CardInstance[];
  turnState: TurnState;
  commonCard: { topCard: { score: number; abilityText: string | null } | null; remaining: number; lengthRequired: number };
  onAction: (action: GameAction) => void;
}

const VOWELS = ['A', 'E', 'I', 'O', 'U'];

export function HandArea({ hand, turnState, commonCard, onAction }: HandAreaProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');
  const [useCommonCard, setUseCommonCard] = useState(false);
  const [commonLetter, setCommonLetter] = useState<string>('A');

  // Reset state when phase changes to spelling
  useEffect(() => {
    if (turnState.phase === 'spelling') {
      setSelectedIds([]);
      setWordInput('');
      setUseCommonCard(false);
      setCommonLetter('A');
    }
  }, [turnState.phase]);

  const toggleCard = useCallback((cardId: string) => {
    setSelectedIds(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  }, []);

  const word = wordInput.toUpperCase().trim();

  const coverage = word.length >= 2
    ? canSpellWord(hand, word, selectedIds, useCommonCard, useCommonCard ? commonLetter : undefined)
    : { ok: false, message: 'Word must be at least 2 letters' };

  const canSubmit = word.length >= 2 && coverage.ok;

  function handleSubmit() {
    if (!canSubmit) return;
    onAction({
      type: 'SUBMIT_WORD',
      word,
      cardIds: selectedIds,
      useCommonCard,
      commonCardLetter: useCommonCard ? commonLetter : undefined,
    });
  }

  // ── SPELLING PHASE ─────────────────────────────────────────────────────────
  if (turnState.phase === 'spelling') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Your Hand — Spell a Word</div>

        {/* Error/hint message */}
        {turnState.message && (
          <div style={{
            ...styles.message,
            color: turnState.message.includes('not a valid') || turnState.message.includes('enough') ? '#ef5350' : '#C5A028',
          }}>
            {turnState.message}
          </div>
        )}

        {/* Hand cards */}
        <div style={styles.cardRow}>
          {hand.map(card => (
            <CardTile
              key={card.id}
              card={card}
              selected={selectedIds.includes(card.id)}
              onClick={() => toggleCard(card.id)}
              size="normal"
            />
          ))}
          {hand.length === 0 && (
            <div style={{ color: '#8B6914', fontSize: 13, fontStyle: 'italic' }}>
              No cards in hand
            </div>
          )}
        </div>

        {/* Common card option */}
        {commonCard.remaining > 0 && (
          <div style={styles.commonRow}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useCommonCard}
                onChange={e => setUseCommonCard(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ color: '#A5D6A7', fontSize: 13 }}>
                Use Common Card as vowel:
              </span>
            </label>
            {useCommonCard && (
              <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                {VOWELS.map(v => (
                  <button
                    key={v}
                    onClick={() => setCommonLetter(v)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      border: `2px solid ${commonLetter === v ? '#4CAF50' : '#5C3D1A'}`,
                      background: commonLetter === v ? '#4CAF50' : '#3D2514',
                      color: commonLetter === v ? '#fff' : '#F5E6C8',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Word input */}
        <div style={styles.inputRow}>
          <input
            style={styles.wordInput}
            placeholder="Type your word..."
            value={wordInput}
            onChange={e => setWordInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={20}
            autoFocus
          />
          <div style={{
            fontSize: 12,
            color: word.length >= 2
              ? (coverage.ok ? '#4CAF50' : '#ef5350')
              : '#8B6914',
            minWidth: 140,
          }}>
            {word.length < 2
              ? 'Type 2+ letters'
              : coverage.ok
                ? `✓ Can spell "${word}"`
                : coverage.message}
          </div>
        </div>

        {/* Word length vs common requirement */}
        {word.length >= 2 && (
          <div style={{ fontSize: 12, color: '#8B6914' }}>
            {word.length >= commonCard.lengthRequired && commonCard.remaining > 0
              ? `✓ Word length ${word.length} ≥ ${commonCard.lengthRequired} — you'll gain the Common Card!`
              : commonCard.remaining > 0
                ? `Word length ${word.length} < ${commonCard.lengthRequired} (need ${commonCard.lengthRequired} to gain Common Card)`
                : ''}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          Submit Word
        </button>
      </div>
    );
  }

  // ── VALIDATING PHASE ───────────────────────────────────────────────────────
  if (turnState.phase === 'validating') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Validating Word</div>
        <div style={{ ...styles.message, color: '#C5A028', textAlign: 'center', fontSize: 16 }}>
          Checking "{turnState.playedWord}" with dictionary...
        </div>
        <div style={{ color: '#8B6914', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
          Please wait...
        </div>
      </div>
    );
  }

  // ── TRASHING PHASE ─────────────────────────────────────────────────────────
  if (turnState.phase === 'trashing') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Trash a Card</div>
        <div style={{ ...styles.message, color: '#ef5350' }}>
          Click a card to permanently remove it from your deck ({turnState.trashRemaining} remaining)
        </div>
        <div style={styles.cardRow}>
          {hand.map(card => (
            <CardTile
              key={card.id}
              card={card}
              onClick={() => onAction({ type: 'TRASH_CARD', cardId: card.id })}
              size="normal"
            />
          ))}
          {hand.length === 0 && (
            <div style={{ color: '#8B6914', fontSize: 13, fontStyle: 'italic' }}>
              No cards to trash
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#8B6914', fontStyle: 'italic' }}>
          Trashed cards are permanently removed from the game
        </div>
      </div>
    );
  }

  // ── BUYING PHASE ───────────────────────────────────────────────────────────
  if (turnState.phase === 'buying') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Buying Phase</div>

        {/* Word result summary */}
        <div style={styles.buyingSummary}>
          <span style={{ color: '#C5A028', fontWeight: 700 }}>
            Word: {turnState.playedWord}
          </span>
          <span style={{ color: '#F5E6C8' }}>
            Score: {turnState.wordScore}¢
          </span>
          <span style={{ color: turnState.budgetRemaining > 0 ? '#4CAF50' : '#8B6914', fontWeight: 700 }}>
            Budget: {turnState.budgetRemaining}¢ remaining
          </span>
          {turnState.gainedCommon && (
            <span style={{ color: '#A5D6A7', fontSize: 12 }}>
              ✓ Gained Common Card!
            </span>
          )}
        </div>

        {turnState.message && (
          <div style={{ fontSize: 12, color: '#C5A028', fontStyle: 'italic' }}>
            {turnState.message}
          </div>
        )}

        {/* Remaining hand cards (not playable, just displayed) */}
        {hand.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#8B6914', marginBottom: 6 }}>
              Remaining hand (not used in word):
            </div>
            <div style={styles.cardRow}>
              {hand.map(card => (
                <CardTile key={card.id} card={card} size="small" />
              ))}
            </div>
          </div>
        )}

        {/* End Turn button */}
        <button
          onClick={() => onAction({ type: 'END_TURN' })}
          style={{ ...styles.endTurnBtn }}
        >
          End Turn
        </button>
      </div>
    );
  }

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#3D2514',
    border: '2px solid #C5A028',
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    fontSize: 14,
    fontWeight: 700,
    color: '#C5A028',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  message: {
    fontSize: 13,
    fontWeight: 500,
  },
  cardRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  commonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    padding: '6px 8px',
    background: 'rgba(76,175,80,0.1)',
    borderRadius: 6,
    border: '1px solid rgba(76,175,80,0.3)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  wordInput: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '2px solid #C5A028',
    background: '#2C1A0E',
    color: '#F5E6C8',
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    outline: 'none',
    width: 200,
  },
  submitBtn: {
    padding: '10px 24px',
    borderRadius: 6,
    border: 'none',
    background: '#C5A028',
    color: '#2C1A0E',
    fontSize: '1rem',
    fontWeight: 700,
    alignSelf: 'flex-start',
  },
  buyingSummary: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(197,160,40,0.1)',
    borderRadius: 6,
    border: '1px solid rgba(197,160,40,0.3)',
    fontSize: 14,
  },
  endTurnBtn: {
    padding: '10px 24px',
    borderRadius: 6,
    border: '2px solid #C5A028',
    background: '#2C1A0E',
    color: '#C5A028',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};
