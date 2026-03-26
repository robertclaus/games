import React, { useCallback } from 'react';
import { PlacedCard, GridPosition } from '../game/types';
import { CardComponent } from './CardComponent';
import { isValidPlacement } from '../game/gameEngine';

interface ArboretumGridProps {
  placedCards: PlacedCard[];
  onPlaceCard?: (position: GridPosition) => void;
  interactive?: boolean;
  small?: boolean;
  label?: string;
  highlightPath?: PlacedCard[];
}

const CELL_SIZE = 72; // px for full size
const CELL_SIZE_SMALL = 52; // px for small/opponent view
const GRID_PADDING = 2; // extra cells of padding around occupied space

export function ArboretumGrid({
  placedCards,
  onPlaceCard,
  interactive = false,
  small = false,
  label,
  highlightPath,
}: ArboretumGridProps) {
  const cellSize = small ? CELL_SIZE_SMALL : CELL_SIZE;

  // Compute bounding box of placed cards
  let minRow = 0, maxRow = 0, minCol = 0, maxCol = 0;
  if (placedCards.length > 0) {
    minRow = Math.min(...placedCards.map(p => p.position.row));
    maxRow = Math.max(...placedCards.map(p => p.position.row));
    minCol = Math.min(...placedCards.map(p => p.position.col));
    maxCol = Math.max(...placedCards.map(p => p.position.col));
  }

  // Add padding
  const pad = interactive ? GRID_PADDING : 0;
  const viewMinRow = minRow - pad;
  const viewMaxRow = maxRow + pad;
  const viewMinCol = minCol - pad;
  const viewMaxCol = maxCol + pad;

  const rows = viewMaxRow - viewMinRow + 1;
  const cols = viewMaxCol - viewMinCol + 1;

  // Build lookup
  const cardMap = new Map<string, PlacedCard>();
  for (const p of placedCards) {
    cardMap.set(`${p.position.row},${p.position.col}`, p);
  }

  const highlightSet = new Set(highlightPath?.map(p => `${p.position.row},${p.position.col}`) ?? []);

  // Compute valid drop positions if interactive
  const validPositions = new Set<string>();
  if (interactive && onPlaceCard) {
    if (placedCards.length === 0) {
      // First card: can go at center
      validPositions.add('0,0');
    } else {
      // All adjacent positions not yet occupied
      for (const p of placedCards) {
        const neighbors = [
          [p.position.row - 1, p.position.col],
          [p.position.row + 1, p.position.col],
          [p.position.row, p.position.col - 1],
          [p.position.row, p.position.col + 1],
        ];
        for (const [nr, nc] of neighbors) {
          const key = `${nr},${nc}`;
          if (!cardMap.has(key)) {
            validPositions.add(key);
          }
        }
      }
    }
  }

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!interactive || !onPlaceCard) return;
      if (!isValidPlacement(placedCards, { row, col })) return;
      onPlaceCard({ row, col });
    },
    [interactive, onPlaceCard, placedCards]
  );

  if (placedCards.length === 0 && !interactive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        {label && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            {label}
          </div>
        )}
        <div
          style={{
            width: cellSize * 3,
            height: cellSize * 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            border: '1px dashed var(--color-border)',
            borderRadius: 6,
          }}
        >
          Empty arboretum
        </div>
      </div>
    );
  }

  // For interactive first card, show a single empty cell at 0,0
  const effectiveRows = Math.max(rows, 1);
  const effectiveCols = Math.max(cols, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      {label && (
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
      )}
      <div
        style={{
          overflow: 'auto',
          maxWidth: '100%',
          maxHeight: small ? 260 : 400,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${effectiveCols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${effectiveRows}, ${cellSize}px)`,
            gap: 2,
            padding: 4,
          }}
        >
          {Array.from({ length: effectiveRows }, (_, ri) => {
            const row = viewMinRow + ri;
            return Array.from({ length: effectiveCols }, (_, ci) => {
              const col = viewMinCol + ci;
              const key = `${row},${col}`;
              const placed = cardMap.get(key);
              const isValid = validPositions.has(key);
              const isHighlighted = highlightSet.has(key);

              if (placed) {
                return (
                  <div
                    key={key}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CardComponent
                      card={placed.card}
                      small={small}
                      highlight={isHighlighted}
                    />
                  </div>
                );
              }

              if (isValid) {
                return (
                  <div
                    key={key}
                    onClick={() => handleCellClick(row, col)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed var(--color-accent)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      opacity: 0.6,
                      transition: 'opacity 0.1s, background-color 0.1s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.opacity = '1';
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(92,184,92,0.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.opacity = '0.6';
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ color: 'var(--color-accent)', fontSize: 20, userSelect: 'none' }}>+</span>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  style={{
                    width: cellSize,
                    height: cellSize,
                  }}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
