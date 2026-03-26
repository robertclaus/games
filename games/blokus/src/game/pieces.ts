import { Cell } from './types';

export interface PieceDef {
  id: string;
  name: string;
  size: number;
  cells: Cell[];           // canonical orientation
  orientations: Cell[][];  // all unique orientations (pre-computed)
}

// ── Orientation utilities ──────────────────────────────────────────────────────

function normalize(cells: Cell[]): Cell[] {
  const minR = Math.min(...cells.map(c => c.r));
  const minC = Math.min(...cells.map(c => c.c));
  return cells
    .map(c => ({ r: c.r - minR, c: c.c - minC }))
    .sort((a, b) => a.r !== b.r ? a.r - b.r : a.c - b.c);
}

function rotate90(cells: Cell[]): Cell[] {
  // 90° CW: (r, c) → (c, -r), then normalize
  return normalize(cells.map(({ r, c }) => ({ r: c, c: -r })));
}

function flipH(cells: Cell[]): Cell[] {
  // horizontal flip: (r, c) → (r, -c), then normalize
  return normalize(cells.map(({ r, c }) => ({ r, c: -c })));
}

function cellsKey(cells: Cell[]): string {
  return normalize(cells).map(c => `${c.r},${c.c}`).join('|');
}

export function getOrientations(base: Cell[]): Cell[][] {
  const seen = new Set<string>();
  const result: Cell[][] = [];

  // Try base and its horizontal flip; rotate each 4 times
  for (const start of [normalize(base), flipH(normalize(base))]) {
    let cur = start;
    for (let i = 0; i < 4; i++) {
      const key = cellsKey(cur);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cur);
      }
      cur = rotate90(cur);
    }
  }

  return result;
}

/** Compute oriented cells from canonical piece cells, given rotation (0-3 = 0/90/180/270° CW) and flip. */
export function getOrientedCells(cells: Cell[], rotation: number, flip: boolean): Cell[] {
  let cur = normalize(cells);
  if (flip) cur = flipH(cur);
  for (let i = 0; i < rotation; i++) cur = rotate90(cur);
  return cur;
}

// ── The 21 Blokus pieces ───────────────────────────────────────────────────────

const RAW_PIECES: Array<[string, string, Cell[]]> = [
  // 1 square
  ['I1', 'Monomino',   [{r:0,c:0}]],

  // 2 squares
  ['I2', 'Domino',     [{r:0,c:0},{r:0,c:1}]],

  // 3 squares
  ['I3', 'I-Tromino',  [{r:0,c:0},{r:0,c:1},{r:0,c:2}]],
  ['L3', 'L-Tromino',  [{r:0,c:0},{r:1,c:0},{r:1,c:1}]],

  // 4 squares
  ['I4', 'I-Tetromino', [{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:0,c:3}]],
  ['L4', 'L-Tetromino', [{r:0,c:0},{r:1,c:0},{r:2,c:0},{r:2,c:1}]],
  ['T4', 'T-Tetromino', [{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:1,c:1}]],
  ['S4', 'S-Tetromino', [{r:0,c:1},{r:0,c:2},{r:1,c:0},{r:1,c:1}]],
  ['O4', 'O-Tetromino', [{r:0,c:0},{r:0,c:1},{r:1,c:0},{r:1,c:1}]],

  // 5 squares (pentominoes)
  ['F5', 'F-Pentomino', [{r:0,c:1},{r:0,c:2},{r:1,c:0},{r:1,c:1},{r:2,c:1}]],
  ['I5', 'I-Pentomino', [{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:0,c:3},{r:0,c:4}]],
  ['L5', 'L-Pentomino', [{r:0,c:0},{r:1,c:0},{r:2,c:0},{r:3,c:0},{r:3,c:1}]],
  ['N5', 'N-Pentomino', [{r:0,c:1},{r:1,c:0},{r:1,c:1},{r:2,c:0},{r:3,c:0}]],
  ['P5', 'P-Pentomino', [{r:0,c:0},{r:0,c:1},{r:1,c:0},{r:1,c:1},{r:2,c:0}]],
  ['T5', 'T-Pentomino', [{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:1,c:1},{r:2,c:1}]],
  ['U5', 'U-Pentomino', [{r:0,c:0},{r:0,c:2},{r:1,c:0},{r:1,c:1},{r:1,c:2}]],
  ['V5', 'V-Pentomino', [{r:0,c:0},{r:1,c:0},{r:2,c:0},{r:2,c:1},{r:2,c:2}]],
  ['W5', 'W-Pentomino', [{r:0,c:0},{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:2}]],
  ['X5', 'X-Pentomino', [{r:0,c:1},{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:2,c:1}]],
  ['Y5', 'Y-Pentomino', [{r:0,c:1},{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:3,c:1}]],
  ['Z5', 'Z-Pentomino', [{r:0,c:0},{r:0,c:1},{r:1,c:1},{r:2,c:1},{r:2,c:2}]],
];

export const ALL_PIECES: PieceDef[] = RAW_PIECES.map(([id, name, cells]) => ({
  id,
  name,
  size: cells.length,
  cells: normalize(cells),
  orientations: getOrientations(cells),
}));

export const PIECES_BY_ID = new Map<string, PieceDef>(
  ALL_PIECES.map(p => [p.id, p])
);

export const ALL_PIECE_IDS = ALL_PIECES.map(p => p.id);
