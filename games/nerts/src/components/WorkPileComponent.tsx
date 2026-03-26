import { WorkPile } from '../game/types';
import { CardFace } from './CardFace';

interface WorkPileProps {
  pile: WorkPile;
  pileIndex: number;
  selectedCardIndex: number | null; // which card in THIS pile is selected (index into pile)
  isDropTarget: boolean;
  onCardClick: (pileIndex: number, cardIndex: number) => void;
  onPileClick: (pileIndex: number) => void;
  size?: 'normal' | 'small';
  pendingIds?: Set<string>;
}

const CARD_OVERLAP = 28; // px visible per card except top

export function WorkPileComponent({
  pile,
  pileIndex,
  selectedCardIndex,
  isDropTarget,
  onCardClick,
  onPileClick,
  size = 'normal',
  pendingIds,
}: WorkPileProps) {
  const cardW = size === 'normal' ? 80 : 56;
  const cardH = size === 'normal' ? 110 : 78;
  const overlap = size === 'normal' ? CARD_OVERLAP : 20;

  if (pile.length === 0) {
    return (
      <div
        className={`work-pile-empty${isDropTarget ? ' drop-target' : ''}`}
        style={{ width: cardW, height: cardH }}
        onClick={() => onPileClick(pileIndex)}
      >
        Drop here
      </div>
    );
  }

  const totalHeight = cardH + (pile.length - 1) * overlap;

  return (
    <div
      style={{ position: 'relative', width: cardW, height: totalHeight, minHeight: cardH }}
      onClick={() => onPileClick(pileIndex)}
    >
      {pile.map((card, idx) => {
        const isSelected = selectedCardIndex !== null && idx >= selectedCardIndex;
        const isPending = pendingIds?.has(card.id) ?? false;
        const isTop = idx === pile.length - 1;
        return (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              top: idx * overlap,
              left: 0,
              zIndex: idx + 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardFace
              card={card}
              size={size}
              selected={isSelected}
              pending={isPending}
              onClick={() => {
                onCardClick(pileIndex, idx);
              }}
              style={{
                outline: isDropTarget && isTop ? '2px dashed #4a9eff' : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
