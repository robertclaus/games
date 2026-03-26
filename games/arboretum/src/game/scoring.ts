import { PlacedCard, Species, ALL_SPECIES, FullGameState, PlayerScoreResult, ScoreBreakdown } from './types';

// Find the position key
function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

// Build a map from position key to placed card
function buildGrid(arboretum: PlacedCard[]): Map<string, PlacedCard> {
  const grid = new Map<string, PlacedCard>();
  for (const p of arboretum) {
    grid.set(posKey(p.position.row, p.position.col), p);
  }
  return grid;
}

// Get orthogonal neighbors
function getNeighbors(row: number, col: number): [number, number][] {
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
}

// Score a single path
function scorePath(path: PlacedCard[], species: Species): number {
  if (path.length === 0) return 0;
  let score = path.length; // 1 pt per card
  // Same species bonus: +1 per card if length >= 4 AND all same species
  if (path.length >= 4 && path.every(p => p.card.species === species)) {
    score += path.length;
  }
  // Starts with 1
  if (path[0].card.value === 1) score += 1;
  // Ends with 8
  if (path[path.length - 1].card.value === 8) score += 2;
  return score;
}

// Find all valid paths for a species (start AND end must be that species, strictly increasing)
function findBestPath(arboretum: PlacedCard[], species: Species): { path: PlacedCard[], score: number } {
  const grid = buildGrid(arboretum);
  let bestScore = 0;
  let bestPath: PlacedCard[] = [];

  // DFS from each card of the target species
  const startCards = arboretum.filter(p => p.card.species === species);

  function dfs(current: PlacedCard, path: PlacedCard[]): void {
    // If current card is the target species and it's not the first card, this is a valid end
    const isValidEnd = path.length > 1 && current.card.species === species;
    if (isValidEnd) {
      const s = scorePath(path, species);
      if (s > bestScore || (s === bestScore && path.length > bestPath.length)) {
        bestScore = s;
        bestPath = [...path];
      }
    }

    // Continue DFS to neighbors with higher values
    const [row, col] = [current.position.row, current.position.col];
    for (const [nr, nc] of getNeighbors(row, col)) {
      const neighbor = grid.get(posKey(nr, nc));
      if (neighbor && neighbor.card.value > current.card.value) {
        // Check not already in path (to avoid cycles)
        if (!path.some(p => p.card.id === neighbor.card.id)) {
          dfs(neighbor, [...path, neighbor]);
        }
      }
    }
  }

  for (const startCard of startCards) {
    dfs(startCard, [startCard]);
  }

  return { path: bestPath, score: bestScore };
}

// Determine who has the right to score each species
export function getRightToScore(state: FullGameState): Record<Species, string[]> {
  const rights: Partial<Record<Species, string[]>> = {};

  for (const species of ALL_SPECIES) {
    // Calculate each player's hand total for this species
    const totals: Record<string, number> = {};
    for (const [playerId, hand] of Object.entries(state.hands)) {
      const total = hand
        .filter(c => c.species === species)
        .reduce((sum, c) => sum + c.value, 0);
      totals[playerId] = total;
    }

    // Check if anyone has cards of this species
    const allTotals = Object.values(totals);
    const maxTotal = allTotals.length > 0 ? Math.max(...allTotals) : 0;
    if (maxTotal === 0) {
      // Nobody has cards; all players can score
      rights[species] = state.players.map(p => p.playerId);
      continue;
    }

    // Find players with max total
    const eligible = Object.entries(totals)
      .filter(([, total]) => total === maxTotal)
      .map(([pid]) => pid);

    // Apply exception: if you have the '8' but an opponent has the '1', you can't score
    const playersWithOne = new Set(
      Object.entries(state.hands)
        .filter(([, hand]) => hand.some(c => c.species === species && c.value === 1))
        .map(([pid]) => pid)
    );

    const filtered = eligible.filter(pid => {
      const hasEight = state.hands[pid].some(c => c.species === species && c.value === 8);
      if (!hasEight) return true;
      // Has the 8 - check if any opponent has the 1
      const opponentHasOne = [...playersWithOne].some(p => p !== pid);
      return !opponentHasOne;
    });

    rights[species] = filtered.length > 0 ? filtered : eligible;
  }

  return rights as Record<Species, string[]>;
}

// Calculate final scores for all players
export function calculateScores(state: FullGameState): PlayerScoreResult[] {
  const rights = getRightToScore(state);
  const results: PlayerScoreResult[] = [];

  for (const player of state.players) {
    const breakdown: ScoreBreakdown[] = [];

    for (const species of ALL_SPECIES) {
      if (!rights[species].includes(player.playerId)) continue;

      const { path, score } = findBestPath(player.arboretum, species);
      if (path.length === 0) continue;

      const basePoints = path.length;
      const sameSpeciesBonus = (path.length >= 4 && path.every(p => p.card.species === species)) ? path.length : 0;
      const startsWithOne = path[0].card.value === 1 ? 1 : 0;
      const endsWithEight = path[path.length - 1].card.value === 8 ? 2 : 0;

      breakdown.push({
        species,
        path,
        basePoints,
        sameSpeciesBonus,
        startsWithOne,
        endsWithEight,
        total: score,
      });
    }

    results.push({
      playerId: player.playerId,
      breakdown,
      total: breakdown.reduce((sum, b) => sum + b.total, 0),
    });
  }

  return results;
}
