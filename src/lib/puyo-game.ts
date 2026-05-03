export const BOARD_COLS = 6;
export const BOARD_ROWS = 12;
export const PUYO_COLORS = ["red", "blue", "green", "yellow", "purple"] as const;
export type PuyoColor = (typeof PUYO_COLORS)[number];
export type PuyoType = PuyoColor | "ojama" | "bomb";
export type Cell = PuyoType | null;
export type Board = Cell[][];

export interface Pair {
  pivot: { row: number; col: number; color: PuyoType };
  satellite: { row: number; col: number; color: PuyoType };
}

export interface ClearGroup {
  cells: { row: number; col: number }[];
  color: PuyoColor;
}

export interface SpecialRemoval {
  ojamaCells: { row: number; col: number }[];
  bombCells: { row: number; col: number }[];
  blastCells: { row: number; col: number }[];
}

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

export function randomColor(): PuyoColor {
  return PUYO_COLORS[Math.floor(Math.random() * 4)];
}

export function randomPuyo(): PuyoType {
  const r = Math.random();
  if (r < 0.12) return "ojama";
  if (r < 0.17) return "bomb";
  return randomColor();
}

export function randomPair(): Pair {
  return {
    pivot: { row: 1, col: 2, color: randomPuyo() },
    satellite: { row: 0, col: 2, color: randomPuyo() },
  };
}

export function canPlace(board: Board, pair: Pair): boolean {
  return isValidPos(board, pair.pivot) && isValidPos(board, pair.satellite);
}

function isValidPos(board: Board, pos: { row: number; col: number }): boolean {
  const { row, col } = pos;
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS && board[row][col] === null;
}

export function moveLeft(board: Board, pair: Pair): Pair {
  const next = offset(pair, 0, -1);
  if (canPlace(board, next)) return next;
  return pair;
}

export function moveRight(board: Board, pair: Pair): Pair {
  const next = offset(pair, 0, 1);
  if (canPlace(board, next)) return next;
  return pair;
}

export function moveDown(board: Board, pair: Pair): Pair {
  const next = offset(pair, 1, 0);
  if (canPlace(board, next)) return next;
  return pair;
}

export function rotateCW(board: Board, pair: Pair): Pair {
  const { pivot, satellite } = pair;
  const dr = satellite.row - pivot.row;
  const dc = satellite.col - pivot.col;
  const newSat = { row: pivot.row + dc, col: pivot.col - dr, color: satellite.color };
  const next = { pivot, satellite: newSat };
  if (canPlace(board, next)) return next;
  const kicked = offset(next, 0, dc > 0 ? -1 : 1);
  if (canPlace(board, kicked)) return kicked;
  return pair;
}

export function rotateCCW(board: Board, pair: Pair): Pair {
  const { pivot, satellite } = pair;
  const dr = satellite.row - pivot.row;
  const dc = satellite.col - pivot.col;
  const newSat = { row: pivot.row - dc, col: pivot.col + dr, color: satellite.color };
  const next = { pivot, satellite: newSat };
  if (canPlace(board, next)) return next;
  const kicked = offset(next, 0, dc < 0 ? 1 : -1);
  if (canPlace(board, kicked)) return kicked;
  return pair;
}

function offset(pair: Pair, dr: number, dc: number): Pair {
  return {
    pivot: { ...pair.pivot, row: pair.pivot.row + dr, col: pair.pivot.col + dc },
    satellite: { ...pair.satellite, row: pair.satellite.row + dr, col: pair.satellite.col + dc },
  };
}

export function lockPair(board: Board, pair: Pair): Board {
  const next = board.map((r) => [...r]);
  next[pair.pivot.row][pair.pivot.col] = pair.pivot.color;
  next[pair.satellite.row][pair.satellite.col] = pair.satellite.color;
  return next;
}

export function applyGravity(board: Board): Board {
  const next = board.map((r) => [...r]);
  for (let col = 0; col < BOARD_COLS; col++) {
    let writeRow = BOARD_ROWS - 1;
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      if (next[row][col] !== null) {
        next[writeRow][col] = next[row][col];
        if (writeRow !== row) next[row][col] = null;
        writeRow--;
      }
    }
  }
  return next;
}

export function findClearGroups(board: Board): ClearGroup[] {
  const visited = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(false));
  const groups: ClearGroup[] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cell = board[row][col];
      if (!cell || cell === "ojama" || cell === "bomb" || visited[row][col]) continue;
      const color = cell as PuyoColor;
      const cells = floodFill(board, visited, row, col, color);
      if (cells.length >= 4) groups.push({ cells, color });
    }
  }
  return groups;
}

function floodFill(
  board: Board,
  visited: boolean[][],
  startRow: number,
  startCol: number,
  color: PuyoColor
): { row: number; col: number }[] {
  const stack = [{ row: startRow, col: startCol }];
  const result: { row: number; col: number }[] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) continue;
    if (visited[row][col] || board[row][col] !== color) continue;
    visited[row][col] = true;
    result.push({ row, col });
    for (const [dr, dc] of dirs) stack.push({ row: row + dr, col: col + dc });
  }
  return result;
}

const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Find ojama/bomb adjacent to normal clear groups, with bomb chain reactions.
export function findSpecialRemovals(board: Board, groups: ClearGroup[]): SpecialRemoval {
  const allRemovedSet = new Set<string>();
  for (const g of groups) {
    for (const { row, col } of g.cells) allRemovedSet.add(`${row},${col}`);
  }

  const ojamaSet = new Set<string>();
  const bombSet = new Set<string>();
  const blastSet = new Set<string>();
  const bombQueue: [number, number][] = [];

  // Check neighbors of a cleared position and categorize them
  function processNeighbor(nr: number, nc: number) {
    const cell = board[nr][nc];
    if (!cell) return;
    const nkey = `${nr},${nc}`;
    if (allRemovedSet.has(nkey)) return;
    allRemovedSet.add(nkey);
    if (cell === "ojama") {
      ojamaSet.add(nkey);
    } else if (cell === "bomb") {
      bombSet.add(nkey);
      bombQueue.push([nr, nc]);
    } else {
      blastSet.add(nkey);
    }
  }

  // Step 1: find ojama/bomb adjacent to normal group cells
  for (const g of groups) {
    for (const { row, col } of g.cells) {
      for (const [dr, dc] of DIRS) {
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) continue;
        // Only ojama/bomb are triggered by adjacency; normal puyos are not
        const cell = board[nr][nc];
        if (cell !== "ojama" && cell !== "bomb") continue;
        processNeighbor(nr, nc);
      }
    }
  }

  // Step 2: bomb chain reactions — bomb blast hits all 4 neighbors (any type)
  while (bombQueue.length > 0) {
    const [row, col] = bombQueue.shift()!;
    for (const [dr, dc] of DIRS) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) continue;
      processNeighbor(nr, nc);
    }
  }

  function toCoords(set: Set<string>) {
    return [...set].map((k) => {
      const [row, col] = k.split(",").map(Number);
      return { row, col };
    });
  }

  return {
    ojamaCells: toCoords(ojamaSet),
    bombCells: toCoords(bombSet),
    blastCells: toCoords(blastSet),
  };
}

export function clearAll(board: Board, groups: ClearGroup[], special: SpecialRemoval): Board {
  const next = board.map((r) => [...r]);
  for (const g of groups) {
    for (const { row, col } of g.cells) next[row][col] = null;
  }
  for (const { row, col } of [
    ...special.ojamaCells,
    ...special.bombCells,
    ...special.blastCells,
  ]) {
    next[row][col] = null;
  }
  return next;
}

export function calcScore(groups: ClearGroup[], chain: number): number {
  const totalPuyos = groups.reduce((s, g) => s + g.cells.length, 0);
  const chainBonus = [0, 0, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192][Math.min(chain, 12)];
  const colorBonus = [0, 0, 3, 6, 12, 24][Math.min(groups.length, 5)];
  const groupBonus = groups.reduce((s, g) => s + [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10][Math.min(g.cells.length, 11)], 0);
  return Math.max(1, chainBonus + colorBonus + groupBonus) * totalPuyos * 10;
}
