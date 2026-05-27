export interface PlacementCell {
  index: number;
  row: number;
  col: number;
  available: boolean;
}

export function findFlexiblePlacementCells(cells: PlacementCell[], size: 2 | 3 | 4, targetIndex: number): number[] | undefined {
  const target = cells.find((cell) => cell.index === targetIndex);
  if (!target) {
    return undefined;
  }

  const available = cells.filter((cell) => cell.available);
  if (available.length < size) {
    return undefined;
  }

  let best: PlacementCell[] | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  collectCombinations(available, size, (candidate) => {
    if (!isConnected(candidate)) {
      return;
    }
    const score = scorePlacement(candidate, target);
    if (score < bestScore) {
      best = [...candidate];
      bestScore = score;
    }
  });

  return best?.sort((a, b) => a.index - b.index).map((cell) => cell.index);
}

function collectCombinations(cells: PlacementCell[], size: number, visit: (candidate: PlacementCell[]) => void): void {
  const candidate: PlacementCell[] = [];
  const walk = (start: number): void => {
    if (candidate.length === size) {
      visit(candidate);
      return;
    }
    const remaining = size - candidate.length;
    for (let i = start; i <= cells.length - remaining; i += 1) {
      candidate.push(cells[i]);
      walk(i + 1);
      candidate.pop();
    }
  };
  walk(0);
}

function isConnected(cells: PlacementCell[]): boolean {
  const remaining = new Set(cells.map((cell) => cell.index));
  const queue = [cells[0]];
  remaining.delete(cells[0].index);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of cells) {
      if (!remaining.has(next.index)) {
        continue;
      }
      const distance = Math.abs(next.row - current.row) + Math.abs(next.col - current.col);
      if (distance === 1) {
        remaining.delete(next.index);
        queue.push(next);
      }
    }
  }

  return remaining.size === 0;
}

function scorePlacement(cells: PlacementCell[], target: PlacementCell): number {
  const includesTarget = cells.some((cell) => cell.index === target.index);
  const rows = cells.map((cell) => cell.row);
  const cols = cells.map((cell) => cell.col);
  const width = Math.max(...cols) - Math.min(...cols) + 1;
  const height = Math.max(...rows) - Math.min(...rows) + 1;
  const distance = cells.reduce((sum, cell) => sum + Math.abs(cell.row - target.row) + Math.abs(cell.col - target.col), 0);
  return distance * 10 + width * height * 3 + (includesTarget ? -100 : 0);
}
