import { clampCol, clampRow, index } from './grid'
import type { Grid } from './types'

export function createWalls(grid: Grid): Uint8Array {
  return new Uint8Array(grid.cols * grid.rows)
}

export function isWallAt(walls: Uint8Array, grid: Grid, x: number, y: number): boolean {
  const col = clampCol(grid, Math.floor(x / grid.cellSize))
  const row = clampRow(grid, Math.floor(y / grid.cellSize))
  return walls[index(grid, col, row)] === 1
}

export function setWallCircle(
  walls: Uint8Array,
  grid: Grid,
  x: number,
  y: number,
  radius: number,
  value: 0 | 1,
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
      if (dx * dx + dy * dy <= radiusSq) {
        walls[index(grid, col, row)] = value
      }
    }
  }
}

export function addBorderWalls(walls: Uint8Array, grid: Grid): void {
  const { cols, rows } = grid
  for (let c = 0; c < cols; c++) {
    walls[c] = 1
    walls[(rows - 1) * cols + c] = 1
  }
  for (let r = 0; r < rows; r++) {
    walls[r * cols] = 1
    walls[r * cols + cols - 1] = 1
  }
}

export function wallCount(walls: Uint8Array): number {
  let count = 0
  for (let i = 0; i < walls.length; i++) {
    if (walls[i] === 1) {
      count++
    }
  }
  return count
}
