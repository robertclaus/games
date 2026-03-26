import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PublicGameState, GameAction, Cell, PlayerColor } from '../game/types';
import { PIECES_BY_ID, ALL_PIECES, PieceDef, getOrientedCells } from '../game/pieces';
import { isValidPlacement, canPlayerMove, STARTING_CORNERS } from '../game/engine';

const CELL = 25;    // px per board cell
const BOARD = 20;   // board dimension

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue:   '#3B82F6',
  yellow: '#EAB308',
  red:    '#EF4444',
  green:  '#22C55E',
};

const PLAYER_COLORS_LIGHT: Record<PlayerColor, string> = {
  blue:   '#93C5FD',
  yellow: '#FDE68A',
  red:    '#FCA5A5',
  green:  '#86EFAC',
};

interface GameBoardProps {
  publicState: PublicGameState;
  myPlayerId: string;
  isHost: boolean;
  onAction: (action: GameAction) => void;
}

export function GameBoard({ publicState, myPlayerId, onAction }: GameBoardProps) {
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);

  const currentPlayer = publicState.players[publicState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.playerId === myPlayerId;
  const myPlayer = publicState.players.find(p => p.playerId === myPlayerId);

  // Build player color lookup
  const playerColorMap = useMemo(() => {
    const map: Record<string, PlayerColor> = {};
    for (const p of publicState.players) map[p.playerId] = p.color;
    return map;
  }, [publicState.players]);

  // Reset selection when turn changes
  useEffect(() => {
    setSelectedPieceId(null);
    setRotation(0);
    setFlip(false);
    setHoverCell(null);
  }, [publicState.currentPlayerIndex]);

  // Keyboard shortcuts — work in planning mode too (R/F/Escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') setRotation(r => (r + 1) % 4);
      if (e.key === 'f' || e.key === 'F') setFlip(f => !f);
      if (e.key === 'Escape') setSelectedPieceId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedPiece = selectedPieceId ? PIECES_BY_ID.get(selectedPieceId) : null;

  const orientedCells = useMemo(() => {
    if (!selectedPiece) return null;
    return getOrientedCells(selectedPiece.cells, rotation, flip);
  }, [selectedPiece, rotation, flip]);

  // Preview works in planning mode too — just remove the isMyTurn guard
  const previewCells = useMemo((): Cell[] => {
    if (!orientedCells || !hoverCell) return [];
    return orientedCells.map(({ r, c }) => ({ r: r + hoverCell.r, c: c + hoverCell.c }));
  }, [orientedCells, hoverCell]);

  const previewValid = useMemo(() => {
    if (previewCells.length === 0 || !myPlayer) return false;
    return isValidPlacement(publicState, myPlayer.playerId, previewCells);
  }, [previewCells, publicState, myPlayer]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (!isMyTurn || !selectedPieceId || !orientedCells) return;
    const cells = orientedCells.map(cell => ({ r: cell.r + r, c: cell.c + c }));
    if (!myPlayer || !isValidPlacement(publicState, myPlayer.playerId, cells)) return;
    onAction({ type: 'PLACE_PIECE', pieceId: selectedPieceId, cells });
    setSelectedPieceId(null);
    setRotation(0);
    setFlip(false);
  }, [isMyTurn, selectedPieceId, orientedCells, myPlayer, publicState, onAction]);

  const previewSet = useMemo(
    () => new Set(previewCells.map(({ r, c }) => `${r},${c}`)),
    [previewCells]
  );

  // Last placed cells — for highlighting
  const lastPlacedSet = useMemo(() => {
    if (!publicState.lastPlacedCells) return new Set<string>();
    return new Set(publicState.lastPlacedCells.map(({ r, c }) => `${r},${c}`));
  }, [publicState.lastPlacedCells]);

  // Only show MY starting corner, and only before I've placed my first piece
  const cornerSet = useMemo(() => {
    const s = new Set<string>();
    if (myPlayer && myPlayer.remainingPieceIds.length === 21) {
      const corner = STARTING_CORNERS[myPlayer.color];
      s.add(`${corner.r},${corner.c}`);
    }
    return s;
  }, [myPlayer]);

  const myCanMove = myPlayer ? canPlayerMove(publicState, myPlayer.playerId) : false;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', overflow: 'hidden' }}>
      {/* ── Board area ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 16 }}>
        <div>
          {/* Turn banner */}
          <div style={{
            textAlign: 'center',
            marginBottom: 10,
            fontSize: 14,
            fontWeight: 600,
            color: currentPlayer ? PLAYER_COLORS[currentPlayer.color] : '#94A3B8',
          }}>
            {isMyTurn
              ? selectedPieceId ? 'Click the board to place · R=rotate · F=flip · Esc=cancel' : 'Your turn — select a piece →'
              : `${currentPlayer?.name}'s turn`}
          </div>

          {/* Board grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD}, ${CELL}px)`,
              gridTemplateRows: `repeat(${BOARD}, ${CELL}px)`,
              gap: 1,
              background: '#1E293B',
              border: '2px solid #334155',
              borderRadius: 4,
              cursor: selectedPieceId ? 'crosshair' : 'default',
            }}
            onMouseLeave={() => setHoverCell(null)}
          >
            {Array.from({ length: BOARD }, (_, r) =>
              Array.from({ length: BOARD }, (_, c) => {
                const occupant = publicState.board[r][c];
                const isPreview = previewSet.has(`${r},${c}`);
                const isCorner = cornerSet.has(`${r},${c}`) && !occupant;
                const isLastPlaced = lastPlacedSet.has(`${r},${c}`);

                // Preview overlays existing pieces (hover shade)
                let bg = '#0F172A';
                if (isPreview && !occupant) {
                  bg = previewValid ? PLAYER_COLORS[myPlayer?.color ?? 'blue'] + 'AA' : '#EF444466';
                } else if (occupant) {
                  bg = PLAYER_COLORS[playerColorMap[occupant] ?? 'blue'];
                } else if (isCorner) {
                  bg = '#1E3A5F';
                }

                const borderColor = isLastPlaced && occupant
                  ? PLAYER_COLORS_LIGHT[playerColorMap[occupant] ?? 'blue']
                  : occupant
                    ? `${PLAYER_COLORS_LIGHT[playerColorMap[occupant] ?? 'blue']}33`
                    : '#1E293B';

                return (
                  <div
                    key={`${r},${c}`}
                    style={{
                      width: CELL,
                      height: CELL,
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      position: 'relative',
                    }}
                    onMouseEnter={() => setHoverCell({ r, c })}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {/* Hover shade overlay on top of existing pieces */}
                    {isPreview && occupant && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: previewValid
                          ? `${PLAYER_COLORS[myPlayer?.color ?? 'blue']}88`
                          : '#EF444466',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {publicState.players.map(p => (
              <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: PLAYER_COLORS[p.color] }}>
                <div style={{ width: 12, height: 12, background: PLAYER_COLORS[p.color], borderRadius: 2 }} />
                {p.name} ({p.remainingPieceIds.length} pieces)
                {p.placedAll && ' ✓'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div style={{
        width: 300,
        borderLeft: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0B1221',
        flexShrink: 0,
      }}>
        {/* Scores */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Players</div>
          {publicState.players.map((p, i) => {
            const isCurrent = i === publicState.currentPlayerIndex;
            const remaining = p.remainingPieceIds.reduce((s, id) => s + (PIECES_BY_ID.get(id)?.size ?? 0), 0);
            return (
              <div key={p.playerId} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                background: isCurrent ? `${PLAYER_COLORS[p.color]}18` : 'transparent',
                border: isCurrent ? `1px solid ${PLAYER_COLORS[p.color]}44` : '1px solid transparent',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: PLAYER_COLORS[p.color], flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: PLAYER_COLORS[p.color], fontWeight: isCurrent ? 700 : 400 }}>
                  {p.name} {p.playerId === myPlayerId ? '(you)' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  {p.placedAll ? '✓ done' : `${remaining}sq`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Planning mode banner when not my turn */}
        {!isMyTurn && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
              Planning mode · {currentPlayer?.name}'s turn
            </div>
          </div>
        )}

        {/* Selected piece preview + controls — always show when piece selected */}
        {selectedPiece && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {isMyTurn ? 'Selected' : 'Planning'}: {selectedPiece.name}
            </div>
            <PiecePreview piece={selectedPiece} cells={orientedCells ?? []} color={myPlayer?.color ?? 'blue'} cellSize={16} />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => setRotation(r => (r + 1) % 4)} style={btnStyle}>↻ Rotate (R)</button>
              <button onClick={() => setFlip(f => !f)} style={btnStyle}>⇔ Flip (F)</button>
              <button onClick={() => setSelectedPieceId(null)} style={{ ...btnStyle, marginLeft: 'auto' }}>✕</button>
            </div>
          </div>
        )}

        {/* Pass button — only when my turn and no moves */}
        {isMyTurn && !myCanMove && (
          <div style={{ padding: '8px 16px', flexShrink: 0 }}>
            <button
              onClick={() => onAction({ type: 'PASS' })}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #475569', background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}
            >
              Pass (no valid moves)
            </button>
          </div>
        )}

        {/* Piece tray — always show for planning and placing */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Your Pieces ({myPlayer?.remainingPieceIds.length ?? 0} remaining)
          </div>
          <PieceTray
            remainingIds={myPlayer?.remainingPieceIds ?? []}
            selectedId={selectedPieceId}
            color={myPlayer?.color ?? 'blue'}
            onSelect={id => {
              setSelectedPieceId(id);
              setRotation(0);
              setFlip(false);
            }}
          />
        </div>

        {/* Game log — always visible at bottom */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #1E293B', padding: '8px 16px', maxHeight: 120, overflowY: 'auto' }}>
          {publicState.log.slice(-6).reverse().map((entry, i) => (
            <div key={i} style={{ fontSize: 11, color: '#475569', padding: '3px 0', borderBottom: '1px solid #1E293B' }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Piece preview (selected piece with current orientation) ────────────────────

function PiecePreview({ cells, color, cellSize }: { piece: PieceDef; cells: Cell[]; color: PlayerColor; cellSize: number }) {
  if (cells.length === 0) return null;
  const maxR = Math.max(...cells.map(c => c.r));
  const maxC = Math.max(...cells.map(c => c.c));
  const set = new Set(cells.map(({ r, c }) => `${r},${c}`));
  return (
    <div style={{ display: 'inline-block' }}>
      {Array.from({ length: maxR + 1 }, (_, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {Array.from({ length: maxC + 1 }, (_, c) => (
            <div key={c} style={{
              width: cellSize, height: cellSize, margin: 1,
              background: set.has(`${r},${c}`) ? PLAYER_COLORS[color] : 'transparent',
              borderRadius: 2,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Piece tray ─────────────────────────────────────────────────────────────────

function PieceTray({
  remainingIds, selectedId, color, onSelect,
}: {
  remainingIds: string[];
  selectedId: string | null;
  color: PlayerColor;
  onSelect: (id: string) => void;
}) {
  // Sort: larger pieces first
  const sorted = [...ALL_PIECES].filter(p => remainingIds.includes(p.id))
    .sort((a, b) => b.size - a.size);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {sorted.map(piece => {
        const isSelected = piece.id === selectedId;
        const maxR = Math.max(...piece.cells.map(c => c.r));
        const maxC = Math.max(...piece.cells.map(c => c.c));
        const set = new Set(piece.cells.map(({ r, c }) => `${r},${c}`));
        const cellSz = 5;
        return (
          <div
            key={piece.id}
            onClick={() => onSelect(piece.id)}
            title={piece.name}
            style={{
              padding: 4,
              borderRadius: 6,
              border: `2px solid ${isSelected ? PLAYER_COLORS[color] : '#1E293B'}`,
              background: isSelected ? `${PLAYER_COLORS[color]}18` : '#0F172A',
              cursor: 'pointer',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 36,
              minHeight: 36,
            }}
          >
            {Array.from({ length: maxR + 1 }, (_, r) => (
              <div key={r} style={{ display: 'flex' }}>
                {Array.from({ length: maxC + 1 }, (_, c) => (
                  <div key={c} style={{
                    width: cellSz, height: cellSz, margin: 0.5,
                    background: set.has(`${r},${c}`) ? PLAYER_COLORS[color] : 'transparent',
                    borderRadius: 1,
                  }} />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 5,
  border: '1px solid #334155',
  background: '#1E293B',
  color: '#CBD5E1',
  fontSize: 12,
  cursor: 'pointer',
};
