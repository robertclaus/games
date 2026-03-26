import React, { useState, useEffect } from 'react';
import { PublicGameState, GameAction, ItemType } from '../game/types';
import { ITEM_EMOJI } from '../game/cards';
import { CardDisplay } from './CardDisplay';
import { ItemButtons } from './ItemButtons';
import { Scoreboard } from './Scoreboard';

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  isHost: boolean;
  onAction: (action: GameAction) => void;
}

export function GameBoard({ publicState, myPlayerId, onAction }: GameBoardProps) {
  const { phase, players, currentCard, roundResult, log, cardsPlayed, totalCards, deckCount } = publicState;

  // Countdown during result phase (3→2→1 matching the 3s host timer)
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (phase === 'result') {
      setCountdown(3);
      const t1 = window.setTimeout(() => setCountdown(2), 1000);
      const t2 = window.setTimeout(() => setCountdown(1), 2000);
      const t3 = window.setTimeout(() => setCountdown(null), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setCountdown(null);
    }
  }, [phase]);

  const myPlayerState = players.find(p => p.playerId === myPlayerId);
  const disabled = phase !== 'revealing' || (myPlayerState?.guessedThisRound ?? false);

  function handleGuess(item: ItemType) {
    onAction({ type: 'GUESS', item });
  }

  // Phase message
  let phaseMessage: React.ReactNode = null;
  if (phase === 'revealing') {
    phaseMessage = (
      <div style={styles.phaseMsg}>
        👻 Grab it! Click the correct item!
      </div>
    );
  } else if (phase === 'result' && roundResult) {
    if (roundResult.winnerId) {
      const winner = players.find(p => p.playerId === roundResult.winnerId);
      const winnerName = winner?.name ?? 'Someone';
      const emoji = ITEM_EMOJI[roundResult.correctItem];
      phaseMessage = (
        <div style={{ ...styles.phaseMsg, color: '#4ade80' }}>
          ✓ {winnerName} grabbed the {roundResult.correctItem} {emoji}!
          {countdown !== null && <span style={styles.countdown}>{countdown}</span>}
        </div>
      );
    } else {
      const emoji = ITEM_EMOJI[roundResult.correctItem];
      phaseMessage = (
        <div style={{ ...styles.phaseMsg, color: '#fb923c' }}>
          ⏰ Nobody got it! The {emoji} {roundResult.correctItem} was the answer.
          {countdown !== null && <span style={styles.countdown}>{countdown}</span>}
        </div>
      );
    }
  }

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarItem}>
          <span style={styles.topLabel}>Card</span>
          <span style={styles.topValue}>{cardsPlayed} / {totalCards}</span>
        </div>
        <div style={styles.topBarItem}>
          <span style={styles.topLabel}>Deck</span>
          <span style={styles.topValue}>{deckCount} left</span>
        </div>
        <div style={styles.topBarItem}>
          <span style={styles.topLabel}>Phase</span>
          <span style={{ ...styles.topValue, color: phase === 'revealing' ? '#a78bfa' : '#fb923c', textTransform: 'capitalize' }}>
            {phase}
          </span>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Left: card + buttons */}
        <div style={styles.centerCol}>
          <CardDisplay card={currentCard} phase={phase} />

          {phaseMessage}

          <ItemButtons
            onGuess={handleGuess}
            disabled={disabled}
            myGuessedThisRound={myPlayerState?.guessedThisRound ?? false}
            correctItem={roundResult?.correctItem}
            roundResult={roundResult}
          />
        </div>

        {/* Right: scoreboard + log */}
        <div style={styles.rightCol}>
          <Scoreboard
            players={players}
            myPlayerId={myPlayerId}
            roundResult={roundResult}
          />

          <div style={styles.logBox}>
            <div style={styles.logTitle}>Game Log</div>
            <div style={styles.logEntries}>
              {[...log].reverse().slice(0, 10).map((entry, i) => (
                <div key={i} style={styles.logEntry}>{entry}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1a0a2e',
    color: '#e0d7ff',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: 16,
  },
  topBar: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    background: '#2d1254',
    border: '1px solid #7c3aed',
    borderRadius: 10,
    padding: '10px 24px',
  },
  topBarItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
  },
  topLabel: {
    color: '#a78bfa',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  topValue: {
    color: '#e0d7ff',
    fontWeight: 700,
    fontSize: '1rem',
  },
  mainContent: {
    display: 'flex',
    gap: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  centerCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    flex: '1 1 460px',
    maxWidth: 520,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: '0 0 260px',
    minWidth: 220,
  },
  phaseMsg: {
    color: '#c4b5fd',
    fontSize: '1.1rem',
    fontWeight: 600,
    textAlign: 'center',
    padding: '10px 20px',
    background: 'rgba(124,58,237,0.15)',
    borderRadius: 8,
    border: '1px solid rgba(124,58,237,0.3)',
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  countdown: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(124,58,237,0.4)',
    border: '2px solid #7c3aed',
    color: '#c4b5fd',
    fontWeight: 800,
    fontSize: '1rem',
    flexShrink: 0,
  },
  logBox: {
    background: '#2d1254',
    border: '1px solid #7c3aed',
    borderRadius: 12,
    padding: '12px 16px',
  },
  logTitle: {
    color: '#c4b5fd',
    fontWeight: 700,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 8,
  },
  logEntries: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 220,
    overflowY: 'auto',
  },
  logEntry: {
    color: '#a78bfa',
    fontSize: '0.8rem',
    lineHeight: 1.4,
    borderBottom: '1px solid rgba(124,58,237,0.15)',
    paddingBottom: 4,
  },
};
