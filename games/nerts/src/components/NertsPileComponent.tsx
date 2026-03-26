import { Card } from '../game/types';
import { CardFace } from './CardFace';

interface NertsPileProps {
  pile: Card[];
  isSelected: boolean;
  onTopCardClick: () => void;
}

export function NertsPileComponent({ pile, isSelected, onTopCardClick }: NertsPileProps) {
  if (pile.length === 0) {
    return (
      <div className="nerts-pile-container">
        <div
          style={{
            width: 80,
            height: 110,
            border: '2px dashed rgba(255,255,255,0.3)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          NERTS!
        </div>
        <div className="nerts-pile-count" style={{ color: '#4ade80' }}>Empty!</div>
      </div>
    );
  }

  const topCard = pile[pile.length - 1];
  const stackCount = pile.length;

  return (
    <div className="nerts-pile-container">
      {/* Stack with slight 3D offset */}
      <div className="nerts-pile-stack" style={{ position: 'relative', width: 80, height: 110 }}>
        {/* Show up to 3 shadow cards behind */}
        {stackCount >= 3 && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              zIndex: 1,
            }}
          >
            <CardFace card={topCard} faceDown size="normal" />
          </div>
        )}
        {stackCount >= 2 && (
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: -2,
              zIndex: 2,
            }}
          >
            <CardFace card={topCard} faceDown size="normal" />
          </div>
        )}
        {/* Top card face-up */}
        <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 3 }}>
          <CardFace
            card={topCard}
            faceDown={false}
            selected={isSelected}
            size="normal"
            onClick={onTopCardClick}
          />
        </div>
      </div>
      <div className="nerts-pile-count">{stackCount} card{stackCount !== 1 ? 's' : ''} remaining</div>
    </div>
  );
}
