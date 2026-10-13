import { clampCol, clampRow, forEachCellInCircle, index } from './grid'
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
  forEachCellInCircle(grid, x, y, radius, (col, row) => {
    walls[index(grid, col, row)] = value
  })
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
