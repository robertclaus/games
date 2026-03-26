import React, { useState } from 'react';
import { PublicGameState, TummyCard, GameAction, OtterState } from '../game/types';
import { checkRule, getPublicState as _unused } from '../game/engine';
import { OtterComponent } from './OtterComponent';
import { HandComponent } from './HandComponent';

// Silence unused import lint
void _unused;

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  myHand: TummyCard[];
  onAction: (action: GameAction) => void;
  isMyTurn: boolean;
}

type HighTideMode =
  | null
  | 'flip_select'       // waiting to pick which otter + head/tail
  | 'swap_heads_a'      // waiting to pick first otter
  | 'swap_heads_b'      // waiting to pick second otter
  | 'swap_tails_a'
  | 'swap_tails_b';

export function GameBoard({ publicState, myPlayerId, myHand, onAction, isMyTurn }: GameBoardProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [highTideMode, setHighTideMode] = useState<HighTideMode>(null);
  const [flipTarget, setFlipTarget] = useState<'head' | 'tail'>('head');
  const [swapFirstOtter, setSwapFirstOtter] = useState<number | null>(null);

  const currentPlayer = publicState.players[publicState.currentPlayerIndex];
  const myPlayerInfo = publicState.players.find(p => p.playerId === myPlayerId);
  const isMyTurnCalc = currentPlayer?.playerId === myPlayerId;

  const selectedCard = myHand.find(c => c.id === selectedCardId) ?? null;

  // ── Compute valid card/otter combinations ─────────────────────────────────

  function canPlayCardOnOtter(card: TummyCard, otter: OtterState): boolean {
    const headRule = otter.head.showing === 'A' ? otter.head.sideA : otter.head.sideB;
    const tailRule = otter.tail.showing === 'A' ? otter.tail.sideA : otter.tail.sideB;
    const headOk = checkRule(headRule, card, otter, publicState.otters);
    const tailOk = checkRule(tailRule, card, otter, publicState.otters);
    return headOk || tailOk;
  }

  // Valid card IDs: cards that can play on at least one valid otter
  const validOtterIndices = new Set<number>(
    publicState.activeOtterIndex !== null && publicState.canContinueTurn
      ? [publicState.activeOtterIndex]
      : publicState.otters.map(o => o.index)
  );

  const validCardIds = new Set<string>(
    myHand
      .filter(card =>
        [...validOtterIndices].some(idx => {
          const otter = publicState.otters.find(o => o.index === idx);
          return otter ? canPlayCardOnOtter(card, otter) : false;
        })
      )
      .map(c => c.id)
  );

  function isOtterValidForSelectedCard(otter: OtterState): boolean {
    if (!selectedCard) return false;
    if (!validOtterIndices.has(otter.index)) return false;
    return canPlayCardOnOtter(selectedCard, otter);
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleOtterClick(otterIndex: number) {
    // High tide flip mode
    if (highTideMode === 'flip_select') {
      onAction({ type: 'HIGH_TIDE_FLIP', target: flipTarget, otterIndex });
      setHighTideMode(null);
      return;
    }

    // High tide swap mode
    if (highTideMode === 'swap_heads_a') {
      setSwapFirstOtter(otterIndex);
      setHighTideMode('swap_heads_b');
      return;
    }
    if (highTideMode === 'swap_heads_b' && swapFirstOtter !== null) {
      onAction({ type: 'HIGH_TIDE_SWAP', swapWhat: 'heads', otterA: swapFirstOtter, otterB: otterIndex });
      setHighTideMode(null);
      setSwapFirstOtter(null);
      return;
    }
    if (highTideMode === 'swap_tails_a') {
      setSwapFirstOtter(otterIndex);
      setHighTideMode('swap_tails_b');
      return;
    }
    if (highTideMode === 'swap_tails_b' && swapFirstOtter !== null) {
      onAction({ type: 'HIGH_TIDE_SWAP', swapWhat: 'tails', otterA: swapFirstOtter, otterB: otterIndex });
      setHighTideMode(null);
      setSwapFirstOtter(null);
      return;
    }

    // Play card mode
    if (selectedCard && isMyTurnCalc) {
      const otter = publicState.otters.find(o => o.index === otterIndex);
      if (otter && isOtterValidForSelectedCard(otter)) {
        onAction({ type: 'PLAY_CARD', cardId: selectedCard.id, otterIndex });
        setSelectedCardId(null);
      }
    }
  }

  function handleCardSelect(cardId: string) {
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
    } else {
      setSelectedCardId(cardId);
      setHighTideMode(null);
    }
  }

  function handleDraw(count: 1 | 2) {
    onAction({ type: 'HIGH_TIDE_DRAW', count });
  }

  function handleEndTurn() {
    onAction({ type: 'END_TURN' });
    setSelectedCardId(null);
  }

  function cancelHighTideMode() {
    setHighTideMode(null);
    setSwapFirstOtter(null);
  }

  // ── Determine if each otter is "active" in the current high tide mode ─────
  function getOtterActive(otter: OtterState): boolean {
    if (swapFirstOtter === otter.index) return true;
    if (publicState.activeOtterIndex === otter.index && publicState.canContinueTurn) return true;
    return false;
  }

  function getOtterValidTarget(otter: OtterState): boolean {
    if (highTideMode && highTideMode !== null) {
      // In flip/swap mode, all otters are valid targets
      if (highTideMode === 'flip_select') return isMyTurnCalc;
      if (highTideMode === 'swap_heads_a' || highTideMode === 'swap_tails_a') return isMyTurnCalc;
      if ((highTideMode === 'swap_heads_b' || highTideMode === 'swap_tails_b') && swapFirstOtter !== otter.index) {
        return isMyTurnCalc;
      }
      return false;
    }
    return isMyTurnCalc && isOtterValidForSelectedCard(otter);
  }

  const showHighTideButtons = isMyTurnCalc && !publicState.highTideUsed && highTideMode === null;
  const showEndTurn = isMyTurnCalc && publicState.mustPlayCount >= 1;

  const phaseLabel = !isMyTurnCalc
    ? `${currentPlayer?.name ?? '?'}'s turn`
    : publicState.mustPlayCount === 0
      ? 'Your turn — play a card (or use High Tide first)'
      : publicState.canContinueTurn
        ? 'You followed both rules — play another card or end turn!'
        : 'Turn ending...';

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.turnInfo}>
          <span style={{ color: isMyTurnCalc ? '#00acc1' : '#e0f2f1', fontWeight: 700 }}>
            {phaseLabel}
          </span>
        </div>
        <div style={styles.deckInfo}>
          <span>🃏 Deck: {publicState.deckCount}</span>
          <span style={{ color: '#455a64' }}>|</span>
          <span>🗑 Discard: {publicState.discardCount}</span>
        </div>
      </div>

      <div style={styles.mainArea}>
        {/* Left: game content */}
        <div style={styles.gameContent}>
          {/* High tide controls */}
          {isMyTurnCalc && (
            <div style={styles.highTidePanel}>
              <span style={{ fontSize: '0.75rem', color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                High Tide (optional, once per turn)
              </span>

              {highTideMode !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#00acc1', fontSize: '0.9rem' }}>
                    {highTideMode === 'flip_select' && `Click an otter to flip its ${flipTarget}`}
                    {highTideMode === 'swap_heads_a' && 'Click first otter to swap heads'}
                    {highTideMode === 'swap_heads_b' && `Swap otter ${(swapFirstOtter ?? 0) + 1}'s head with... (click second otter)`}
                    {highTideMode === 'swap_tails_a' && 'Click first otter to swap tails'}
                    {highTideMode === 'swap_tails_b' && `Swap otter ${(swapFirstOtter ?? 0) + 1}'s tail with... (click second otter)`}
                  </span>
                  <button style={styles.btnCancel} onClick={cancelHighTideMode}>Cancel</button>
                </div>
              ) : publicState.highTideUsed ? (
                <span style={{ color: '#455a64', fontSize: '0.85rem' }}>High tide used ✓</span>
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={styles.btnHighTide} onClick={() => handleDraw(1)}>Draw 1</button>
                  <button style={styles.btnHighTide} onClick={() => handleDraw(2)}>Draw 2</button>
                  <button style={styles.btnHighTide} onClick={() => {
                    setFlipTarget('head');
                    setHighTideMode('flip_select');
                    setSelectedCardId(null);
                  }}>Flip Head...</button>
                  <button style={styles.btnHighTide} onClick={() => {
                    setFlipTarget('tail');
                    setHighTideMode('flip_select');
                    setSelectedCardId(null);
                  }}>Flip Tail...</button>
                  <button style={styles.btnHighTide} onClick={() => {
                    setHighTideMode('swap_heads_a');
                    setSelectedCardId(null);
                  }}>Swap Heads...</button>
                  <button style={styles.btnHighTide} onClick={() => {
                    setHighTideMode('swap_tails_a');
                    setSelectedCardId(null);
                  }}>Swap Tails...</button>
                </div>
              )}
            </div>
          )}

          {/* Otters */}
          <div style={styles.otterRow}>
            {publicState.otters.map(otter => (
              <OtterComponent
                key={otter.index}
                otter={otter}
                isValidTarget={getOtterValidTarget(otter)}
                isActive={getOtterActive(otter)}
                onClick={() => handleOtterClick(otter.index)}
                selectedCard={selectedCard}
              />
            ))}
          </div>

          {/* Selected card hint */}
          {isMyTurnCalc && selectedCard && (
            <div style={styles.hint}>
              Selected: <strong>{selectedCard.value}</strong> —
              click a highlighted otter to play it
            </div>
          )}
          {isMyTurnCalc && !selectedCard && publicState.mustPlayCount === 0 && !publicState.highTideUsed && highTideMode === null && (
            <div style={styles.hint}>
              Select a card from your hand, then click an otter to play it
            </div>
          )}

          {/* End turn button */}
          {showEndTurn && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <button style={styles.btnEndTurn} onClick={handleEndTurn}>
                End Turn
              </button>
            </div>
          )}

          {/* Hand */}
          <HandComponent
            hand={myHand}
            selectedCardId={selectedCardId}
            validCardIds={isMyTurnCalc ? validCardIds : new Set()}
            onSelect={handleCardSelect}
            isMyTurn={isMyTurnCalc}
          />
        </div>

        {/* Right sidebar */}
        <div style={styles.sidebar}>
          {/* Player list */}
          <div style={styles.sideSection}>
            <div style={styles.sideHeader}>Players</div>
            {publicState.players.map((p, i) => {
              const isCurrent = i === publicState.currentPlayerIndex;
              const isMe = p.playerId === myPlayerId;
              return (
                <div
                  key={p.playerId}
                  style={{
                    ...styles.playerRow,
                    background: isCurrent ? 'rgba(0,172,193,0.1)' : '#0a1628',
                    border: isCurrent ? '1px solid #00acc1' : '1px solid #1a3a5c',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#00acc1' : '#e0f2f1', fontSize: '0.9rem' }}>
                      {p.name} {isMe ? '(You)' : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78909c' }}>
                      {p.handCount} cards
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#78909c' }}>Lucky Stones</div>
                    <div style={{ color: '#00acc1', fontWeight: 700 }}>
                      {'🪨'.repeat(p.luckyStones) || '0'}
                    </div>
                  </div>
                </div>
              );
            })}
            {myPlayerInfo && (
              <div style={{ fontSize: '0.75rem', color: '#455a64', textAlign: 'center', marginTop: 4 }}>
                Win at {publicState.winThreshold} stones
              </div>
            )}
          </div>

          {/* Game log */}
          <div style={styles.sideSection}>
            <div style={styles.sideHeader}>Log</div>
            <div style={styles.logContainer}>
              {[...publicState.log].reverse().slice(0, 15).map((entry, i) => (
                <div key={i} style={styles.logEntry}>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suppress unused import warning for type-only import
function _suppressUnused() { return showHighTideButtons; }
void _suppressUnused;

const showHighTideButtons = false; // used only for type inference above

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a1628',
    color: '#e0f2f1',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    background: '#0d2137',
    borderBottom: '1px solid #1a3a5c',
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  turnInfo: {
    fontSize: '0.95rem',
  },
  deckInfo: {
    display: 'flex',
    gap: 12,
    fontSize: '0.85rem',
    color: '#78909c',
  },
  mainArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  gameContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    overflow: 'auto',
    padding: '0',
  },
  highTidePanel: {
    background: '#0d2137',
    borderBottom: '1px solid #1a3a5c',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
  },
  otterRow: {
    display: 'flex',
    gap: 12,
    padding: '16px',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  hint: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#78909c',
    padding: '4px 16px',
  },
  sidebar: {
    width: 240,
    background: '#0d2137',
    borderLeft: '1px solid #1a3a5c',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    flexShrink: 0,
  },
  sideSection: {
    borderBottom: '1px solid #1a3a5c',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sideHeader: {
    fontSize: '0.7rem',
    color: '#455a64',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 700,
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 6,
  },
  logContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 300,
    overflowY: 'auto',
  },
  logEntry: {
    fontSize: '0.75rem',
    color: '#78909c',
    lineHeight: 1.4,
    padding: '3px 0',
    borderBottom: '1px solid #112240',
  },
  btnHighTide: {
    padding: '6px 12px',
    background: '#112240',
    border: '1px solid #1a3a5c',
    color: '#e0f2f1',
    borderRadius: 6,
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnEndTurn: {
    padding: '10px 32px',
    background: '#00acc1',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 700,
  },
  btnCancel: {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #455a64',
    color: '#78909c',
    borderRadius: 6,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
};
