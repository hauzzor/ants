import type { Grid, Vec2 } from './types'

export function createGrid(width: number, height: number, cellSize: number): Grid {
  return {
    cols: Math.ceil(width / cellSize),
    rows: Math.ceil(height / cellSize),
    cellSize,
  }
}

export function cellCount(grid: Grid): number {
  return grid.cols * grid.rows
}

export function index(grid: Grid, col: number, row: number): number {
  return row * grid.cols + col
}

export function clampCol(grid: Grid, col: number): number {
  return Math.min(grid.cols - 1, Math.max(0, col))
}

export function clampRow(grid: Grid, row: number): number {
  return Math.min(grid.rows - 1, Math.max(0, row))
}

export function worldToCell(grid: Grid, x: number, y: number): { col: number; row: number } {
  return {
    col: clampCol(grid, Math.floor(x / grid.cellSize)),
    row: clampRow(grid, Math.floor(y / grid.cellSize)),
  }
}

export function cellCenter(grid: Grid, col: number, row: number): Vec2 {
  return {
    x: (col + 0.5) * grid.cellSize,
    y: (row + 0.5) * grid.cellSize,
  }
}

export function forEachCellInCircle(
  grid: Grid,
  x: number,
  y: number,
  radius: number,
  visit: (col: number, row: number, distance: number) => void,
): void {
  const { cellSize } = grid
  const minCol = clampCol(grid, Math.floor((x - radius) / cellSize))
  const maxCol = clampCol(grid, Math.floor((x + radius) / cellSize))
  const minRow = clampRow(grid, Math.floor((y - radius) / cellSize))
  const maxRow = clampRow(grid, Math.floor((y + radius) / cellSize))
  const radiusSq = radius * radius

  for (let row = minRow; row <= maxRow; row++) {
    const cy = (row + 0.5) * cellSize
    for (let col = minCol; col <= maxCol; col++) {
      const cx = (col + 0.5) * cellSize
      const dx = cx - x
      const dy = cy - y
      const distSq = dx * dx + dy * dy
      if (distSq <= radiusSq) {
        visit(col, row, Math.sqrt(distSq))
      }
    }
  }
}
