import { Card } from '../game/types';
import { CardFace } from './CardFace';

interface HandWasteProps {
  hand: Card[];
  waste: Card[];
  isWasteSelected: boolean;
  onFlip: () => void;
  onWasteClick: () => void;
  pendingIds?: Set<string>;
}

export function HandWasteComponent({ hand, waste, isWasteSelected, onFlip, onWasteClick, pendingIds }: HandWasteProps) {
  const topWaste = waste.length > 0 ? waste[waste.length - 1] : null;
  const isPendingWaste = topWaste ? (pendingIds?.has(topWaste.id) ?? false) : false;

  return (
    <div className="hand-waste-container">
      {/* Hand / stock pile */}
      <div className="hand-section">
        <div
          style={{
            position: 'relative',
            width: 80,
            height: 110,
            cursor: 'pointer',
          }}
          onClick={onFlip}
        >
          {hand.length > 0 ? (
            <>
              {hand.length >= 3 && (
                <div style={{ position: 'absolute', top: -3, left: -3, zIndex: 1 }}>
                  <CardFace card={hand[0]} faceDown size="normal" />
                </div>
              )}
              {hand.length >= 2 && (
                <div style={{ position: 'absolute', top: -1, left: -1, zIndex: 2 }}>
                  <CardFace card={hand[0]} faceDown size="normal" />
                </div>
              )}
              <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 3 }}>
                <CardFace card={hand[0]} faceDown size="normal" />
              </div>
            </>
          ) : (
            <div
              style={{
                width: 80,
                height: 110,
                border: '2px dashed rgba(255,255,255,0.25)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
              }}
            >
              Flip waste
            </div>
          )}
        </div>
        <button className="flip-btn" onClick={onFlip}>
          FLIP
        </button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {hand.length} in hand
        </div>
      </div>

      {/* Waste pile */}
      <div className="waste-section">
        {topWaste ? (
          <CardFace
            card={topWaste}
            selected={isWasteSelected}
            pending={isPendingWaste}
            size="normal"
            onClick={onWasteClick}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 110,
              border: '2px dashed rgba(255,255,255,0.15)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)',
              fontSize: 11,
            }}
          >
            Waste
          </div>
        )}
        <div className="waste-count">{waste.length} in waste</div>
      </div>
    </div>
  );
}
