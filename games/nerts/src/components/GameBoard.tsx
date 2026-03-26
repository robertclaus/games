import React from 'react';
import { PlayerPrivateState, SharedGameState, Card, Foundations } from '../game/types';
import { canPlayToFoundation, canPlayOnWorkPile, canMoveSequence } from '../game/validation';
import { WorkPileComponent } from './WorkPileComponent';
import { NertsPileComponent } from './NertsPileComponent';
import { HandWasteComponent } from './HandWasteComponent';
import { FoundationsComponent } from './FoundationsComponent';
import { OpponentView } from './OpponentView';
import { RoundResults } from './RoundResults';

type Selection =
  | { source: 'nerts' }
  | { source: 'waste' }
  | { source: 'workPile'; pileIndex: number; cardIndex: number }
  | null;

interface GameBoardProps {
  myPlayerId: string;
  myName: string;
  myState: PlayerPrivateState;
  sharedState: SharedGameState;
  myRoundScore: number;
  pendingFoundationCards: Set<string>;
  flashMessage: string | null;
  isHost: boolean;
  gameOver: boolean;
  gameWinnerId: string | null;
  playerNames: Record<string, string>;

  onMoveNertsToWorkPile: (pileIndex: number) => void;
  onMoveWasteToWorkPile: (pileIndex: number) => void;
  onMoveWorkPileToWorkPile: (fromIndex: number, cardIndex: number, toIndex: number) => void;
  onPlayToFoundation: (card: Card, source: Selection) => void;
  onFlip: () => void;
  onNextRound: () => void;
  onPlayAgain: () => void;
}

export function GameBoard({
  myPlayerId,
  myName,
  myState,
  sharedState,
  myRoundScore,
  pendingFoundationCards,
  flashMessage,
  isHost,
  gameOver,
  gameWinnerId,
  playerNames,
  onMoveNertsToWorkPile,
  onMoveWasteToWorkPile,
  onMoveWorkPileToWorkPile,
  onPlayToFoundation,
  onFlip,
  onNextRound,
  onPlayAgain,
}: GameBoardProps) {
  // Selection state
  const [selection, setSelection] = React.useState<Selection>(null);

  // Reset selection when phase changes
  React.useEffect(() => {
    if (sharedState.phase !== 'playing') setSelection(null);
  }, [sharedState.phase]);

  const frozen = sharedState.phase !== 'playing';

  // Get the selected card(s)
  function getSelectedCards(): Card[] {
    if (!selection) return [];
    if (selection.source === 'nerts') {
      const top = myState.nertsPile[myState.nertsPile.length - 1];
      return top ? [top] : [];
    }
    if (selection.source === 'waste') {
      const top = myState.waste[myState.waste.length - 1];
      return top ? [top] : [];
    }
    if (selection.source === 'workPile') {
      return myState.workPiles[selection.pileIndex].slice(selection.cardIndex);
    }
    return [];
  }

  const selectedCards = getSelectedCards();
  const selectedCard = selectedCards.length > 0 ? selectedCards[0] : null;

  // Can the selected card go to any foundation pile?
  const canPlayToAnyFoundation =
    !!selectedCard && selectedCards.length === 1 && canPlayToFoundation(selectedCard, sharedState.foundations);

  // Which work piles are valid drop targets?
  function getDropTargets(): number[] {
    if (!selectedCard) return [];
    return myState.workPiles
      .map((pile, i) => ({ i, valid: canPlayOnWorkPile(selectedCards[0], pile) || (selectedCards.length > 1 && canMoveSequence(selectedCards, pile)) }))
      .filter(x => x.valid)
      .map(x => x.i);
  }

  const dropTargets = getDropTargets();

  // --- Click handlers ---

  function handleNertsClick() {
    if (frozen) return;
    if (selection?.source === 'nerts') {
      setSelection(null);
    } else {
      setSelection({ source: 'nerts' });
    }
  }

  function handleWasteClick() {
    if (frozen) return;
    if (myState.waste.length === 0) return;
    if (selection?.source === 'waste') {
      setSelection(null);
    } else {
      setSelection({ source: 'waste' });
    }
  }

  function handleWorkCardClick(pileIndex: number, cardIndex: number) {
    if (frozen) return;

    if (!selection) {
      // Select this card and the sequence above it
      setSelection({ source: 'workPile', pileIndex, cardIndex });
      return;
    }

    // Something is already selected — try to move it to this work pile
    const targetPile = myState.workPiles[pileIndex];
    const isCurrentPile = selection.source === 'workPile' && selection.pileIndex === pileIndex;

    if (isCurrentPile) {
      // Click same pile — change selection point or deselect
      if (selection.cardIndex === cardIndex) {
        setSelection(null);
      } else {
        setSelection({ source: 'workPile', pileIndex, cardIndex });
      }
      return;
    }

    // Try to move selected card(s) to this pile
    const bottomCard = selectedCards[0];
    if (!bottomCard) { setSelection(null); return; }

    const topTargetCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;
    const canPlace = topTargetCard
      ? (bottomCard.value === topTargetCard.value - 1 && ((bottomCard.suit === 'H' || bottomCard.suit === 'D') !== (topTargetCard.suit === 'H' || topTargetCard.suit === 'D')))
      : true; // empty pile accepts anything

    if (canPlace) {
      if (selection.source === 'nerts') {
        onMoveNertsToWorkPile(pileIndex);
      } else if (selection.source === 'waste') {
        onMoveWasteToWorkPile(pileIndex);
      } else if (selection.source === 'workPile') {
        onMoveWorkPileToWorkPile(selection.pileIndex, selection.cardIndex, pileIndex);
      }
      setSelection(null);
    } else {
      // Re-select the clicked card instead
      setSelection({ source: 'workPile', pileIndex, cardIndex });
    }
  }

  function handleWorkPileClick(pileIndex: number) {
    if (frozen) return;

    // If pile has cards, handle as card click on top card
    const pile = myState.workPiles[pileIndex];
    if (pile.length > 0 && !selection) {
      setSelection({ source: 'workPile', pileIndex, cardIndex: pile.length - 1 });
      return;
    }

    if (!selection) return;

    // Try to place selected card(s) here
    const bottomCard = selectedCards[0];
    if (!bottomCard) { setSelection(null); return; }

    const canPlace = canPlayOnWorkPile(bottomCard, pile);

    if (canPlace) {
      if (selection.source === 'nerts') {
        onMoveNertsToWorkPile(pileIndex);
      } else if (selection.source === 'waste') {
        onMoveWasteToWorkPile(pileIndex);
      } else if (selection.source === 'workPile') {
        onMoveWorkPileToWorkPile(selection.pileIndex, selection.cardIndex, pileIndex);
      }
    }
    setSelection(null);
  }

  function handleFoundationClick() {
    if (frozen || !selectedCard || selectedCards.length !== 1) return;
    if (!canPlayToFoundation(selectedCard, sharedState.foundations)) return;

    onPlayToFoundation(selectedCard, selection);
    setSelection(null);
  }

  function handleFlip() {
    if (frozen) return;
    onFlip();
    // Deselect waste if flipping
    if (selection?.source === 'waste') setSelection(null);
  }

  // Opponents: all players except me
  const opponents = sharedState.players.filter(p => p.playerId !== myPlayerId);

  // Build round results
  const roundResults = sharedState.players.map(p => {
    const foundationCards = p.foundationScore;
    const nertsCount = p.nertsPileCount;
    const nertsPenalty = nertsCount;
    const roundScore = foundationCards - 2 * nertsPenalty;
    const cumulativeScore = sharedState.cumulativeScores[p.playerId] ?? 0;
    return {
      playerId: p.playerId,
      name: p.name,
      foundationCards,
      nertsPenalty,
      roundScore,
      cumulativeScore,
    };
  });

  const cumulativeScore = sharedState.cumulativeScores[myPlayerId] ?? 0;

  return (
    <div className="game-board">
      {/* Flash message */}
      {flashMessage && (
        <div className="flash-message">{flashMessage}</div>
      )}

      {/* Opponents strip */}
      {opponents.length > 0 && (
        <div className="opponents-strip">
          {opponents.map(opp => (
            <OpponentView
              key={opp.playerId}
              playerId={opp.playerId}
              name={opp.name}
              backColor={opp.backColor}
              nertsPileCount={opp.nertsPileCount}
              workPileCounts={[0, 0, 0, 0]} // opponents' work piles are private
              roundScore={opp.foundationScore}
            />
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="status-bar">
        <span style={{ fontWeight: 700 }}>Round {sharedState.roundNumber}</span>
        <span>This round: +{myRoundScore}</span>
        <span>Total: {cumulativeScore}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{myName}</span>
        {sharedState.nertsCallerId && (
          <span className="status-nerts-call">
            NERTS! by {playerNames[sharedState.nertsCallerId] ?? sharedState.nertsCallerId}
          </span>
        )}
        {frozen && sharedState.phase === 'playing' && (
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>Waiting...</span>
        )}
      </div>

      {/* Center: foundations */}
      <div className="center-row">
        <FoundationsComponent
          foundations={sharedState.foundations}
          selectedCard={selectedCard}
          onFoundationClick={handleFoundationClick}
          canPlay={canPlayToAnyFoundation}
        />
        {/* Deck info summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'center', marginLeft: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            {sharedState.foundations.reduce((sum, pile) => sum + pile.length, 0)} cards in foundations
          </div>
        </div>
      </div>

      {/* Player tableau: nerts pile + 4 work piles */}
      <div className="player-tableau">
        <NertsPileComponent
          pile={myState.nertsPile}
          isSelected={selection?.source === 'nerts'}
          onTopCardClick={handleNertsClick}
        />
        {myState.workPiles.map((pile, i) => {
          const selCardIdx = selection?.source === 'workPile' && selection.pileIndex === i
            ? selection.cardIndex
            : null;
          return (
            <WorkPileComponent
              key={i}
              pile={pile}
              pileIndex={i}
              selectedCardIndex={selCardIdx}
              isDropTarget={!frozen && dropTargets.includes(i)}
              onCardClick={handleWorkCardClick}
              onPileClick={handleWorkPileClick}
              pendingIds={pendingFoundationCards}
            />
          );
        })}
      </div>

      {/* Hand / Waste */}
      <div className="hand-waste-row">
        <HandWasteComponent
          hand={myState.hand}
          waste={myState.waste}
          isWasteSelected={selection?.source === 'waste'}
          onFlip={handleFlip}
          onWasteClick={handleWasteClick}
          pendingIds={pendingFoundationCards}
        />
      </div>

      {/* Round end overlay */}
      {(sharedState.phase === 'roundEnd' || sharedState.phase === 'gameOver') && (
        <RoundResults
          results={roundResults}
          nertsCallerId={sharedState.nertsCallerId}
          playerNames={playerNames}
          isHost={isHost}
          gameOver={gameOver || sharedState.phase === 'gameOver'}
          gameWinnerId={gameWinnerId}
          onNextRound={onNextRound}
          onPlayAgain={onPlayAgain}
        />
      )}
    </div>
  );
}
