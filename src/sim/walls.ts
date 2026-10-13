import { cellCenter, clampCol, clampRow, forEachCellInCircle, index } from './grid'
import type { Grid, Vec2 } from './types'

export function createWalls(grid: Grid): Uint8Array {
  return new Uint8Array(grid.cols * grid.rows)
}

export function isWallAt(walls: Uint8Array, grid: Grid, x: number, y: number): boolean {
  const col = clampCol(grid, Math.floor(x / grid.cellSize))
  const row = clampRow(grid, Math.floor(y / grid.cellSize))
  return walls[index(grid, col, row)] !== 0
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

export function setWallRect(
  walls: Uint8Array,
  grid: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: 0 | 1 | 2,
): void {
  const colA = clampCol(grid, Math.floor(x0 / grid.cellSize))
  const colB = clampCol(grid, Math.floor(x1 / grid.cellSize))
  const rowA = clampRow(grid, Math.floor(y0 / grid.cellSize))
  const rowB = clampRow(grid, Math.floor(y1 / grid.cellSize))
  const minCol = Math.min(colA, colB)
  const maxCol = Math.max(colA, colB)
  const minRow = Math.min(rowA, rowB)
  const maxRow = Math.max(rowA, rowB)
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      walls[index(grid, col, row)] = value
    }
  }
}

export function nearestOpenPoint(walls: Uint8Array, grid: Grid, x: number, y: number): Vec2 {
  const col = clampCol(grid, Math.floor(x / grid.cellSize))
  const row = clampRow(grid, Math.floor(y / grid.cellSize))
  if (walls[index(grid, col, row)] === 0) {
    return cellCenter(grid, col, row)
  }

  let best = -1
  let bestDistSq = Infinity
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i = index(grid, c, r)
      if (walls[i] !== 0) {
        continue
      }
      const center = cellCenter(grid, c, r)
      const dx = center.x - x
      const dy = center.y - y
      const distSq = dx * dx + dy * dy
      if (distSq < bestDistSq) {
        bestDistSq = distSq
        best = i
      }
    }
  }

  if (best < 0) {
    return cellCenter(grid, col, row)
  }
  const bestCol = best % grid.cols
  const bestRow = (best - bestCol) / grid.cols
  return cellCenter(grid, bestCol, bestRow)
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
    if (walls[i] !== 0) {
      count++
    }
  }
  return count
}

export function obstacleCount(walls: Uint8Array): number {
  let count = 0
  for (let i = 0; i < walls.length; i++) {
    if (walls[i] === 2) {
      count++
    }
  }
  return count
}
