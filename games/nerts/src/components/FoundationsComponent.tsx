import { Card, ALL_SUITS, Foundations, SUIT_SYMBOL, SUIT_COLOR } from '../game/types';
import { CardFace } from './CardFace';

interface FoundationsProps {
  foundations: Foundations;
  selectedCard: Card | null;
  onFoundationClick: () => void;
  canPlay: boolean;
}

export function FoundationsComponent({ foundations, selectedCard, onFoundationClick, canPlay }: FoundationsProps) {
  return (
    <div className="foundations-container">
      {ALL_SUITS.map(suit => {
        const suitPiles = foundations.filter(pile => pile.length > 0 && pile[0].suit === suit);
        const isTargetSuit = canPlay && selectedCard?.suit === suit;
        const showNewAceSlot = isTargetSuit && selectedCard?.value === 1;
        const colorClass = SUIT_COLOR[suit] === 'red' ? 'suit-red' : 'suit-black';

        return (
          <div key={suit} style={{ display: 'flex', gap: 4 }}>
            {/* Empty placeholder when no piles yet and not showing Ace slot */}
            {suitPiles.length === 0 && !showNewAceSlot && (
              <div
                className={`foundation-slot${isTargetSuit ? ' can-play' : ''}`}
                onClick={isTargetSuit ? onFoundationClick : undefined}
              >
                <span className={`foundation-placeholder ${colorClass}`}>
                  A{SUIT_SYMBOL[suit]}
                </span>
              </div>
            )}

            {/* Existing piles */}
            {suitPiles.map((pile, pIdx) => {
              const topCard = pile[pile.length - 1];
              return (
                <div
                  key={pIdx}
                  className={`foundation-slot${isTargetSuit ? ' can-play' : ''}`}
                  onClick={isTargetSuit ? onFoundationClick : undefined}
                >
                  <CardFace card={topCard} size="normal" />
                  <span className="foundation-count">{pile.length}/13</span>
                </div>
              );
            })}

            {/* New Ace slot when holding an Ace of this suit */}
            {showNewAceSlot && (
              <div
                className="foundation-slot can-play"
                onClick={onFoundationClick}
              >
                <span className={`foundation-placeholder ${colorClass}`}>
                  A{SUIT_SYMBOL[suit]}
                </span>
                <span className="foundation-count">new</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
