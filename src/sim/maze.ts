import {
  cellCenter,
  clampCol,
  clampRow,
  forEachCellInCircle,
  index,
  worldToCell,
} from './grid'
import type { Grid, Vec2 } from './types'
import type { Rng } from './rng'

export const NEST_PLAZA_RADIUS = 14
export const DEFAULT_MAZE_CELL_SIZE = 6
export const DEFAULT_MAZE_OBSTACLES = 12

export interface MazeOptions {
  cellSize?: number
  obstacles?: number
  plazaRadius?: number
}

interface Room {
  rc: number
  rr: number
}

function roomCount(size: number, cellSize: number): number {
  let count = 0
  for (let i = 1; i < size - 1; i++) {
    if (i % cellSize !== 0) {
      count = Math.max(count, Math.floor(i / cellSize) + 1)
    }
  }
  return count
}

function isBorderCell(grid: Grid, col: number, row: number): boolean {
  return col === 0 || row === 0 || col === grid.cols - 1 || row === grid.rows - 1
}

function carveLattice(walls: Uint8Array, grid: Grid, cellSize: number): void {
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (col % cellSize === 0 || row % cellSize === 0) {
        walls[index(grid, col, row)] = 1
      }
    }
  }
}

function colStart(rc: number, cellSize: number): number {
  return rc * cellSize + 1
}

function colEnd(rc: number, grid: Grid, cellSize: number): number {
  return Math.min(rc * cellSize + cellSize - 1, grid.cols - 2)
}

function rowStart(rr: number, cellSize: number): number {
  return rr * cellSize + 1
}

function rowEnd(rr: number, grid: Grid, cellSize: number): number {
  return Math.min(rr * cellSize + cellSize - 1, grid.rows - 2)
}

function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
}

function unvisitedNeighbors(room: Room, roomCols: number, roomRows: number, visited: Uint8Array): Room[] {
  const candidates: Room[] = []
  if (room.rc + 1 < roomCols) {
    candidates.push({ rc: room.rc + 1, rr: room.rr })
  }
  if (room.rc - 1 >= 0) {
    candidates.push({ rc: room.rc - 1, rr: room.rr })
  }
  if (room.rr + 1 < roomRows) {
    candidates.push({ rc: room.rc, rr: room.rr + 1 })
  }
  if (room.rr - 1 >= 0) {
    candidates.push({ rc: room.rc, rr: room.rr - 1 })
  }
  return candidates.filter((candidate) => visited[candidate.rr * roomCols + candidate.rc] === 0)
}

function carveDoor(
  walls: Uint8Array,
  grid: Grid,
  cellSize: number,
  from: Room,
  to: Room,
): void {
  if (to.rc !== from.rc) {
    const col = to.rc > from.rc ? (from.rc + 1) * cellSize : from.rc * cellSize
    const start = rowStart(from.rr, cellSize)
    const end = rowEnd(from.rr, grid, cellSize)
    for (let r = start; r <= end; r++) {
      walls[index(grid, col, r)] = 0
    }
    return
  }
  const row = to.rr > from.rr ? (from.rr + 1) * cellSize : from.rr * cellSize
  const start = colStart(from.rc, cellSize)
  const end = colEnd(from.rc, grid, cellSize)
  for (let c = start; c <= end; c++) {
    walls[index(grid, c, row)] = 0
  }
}

function carveMaze(
  walls: Uint8Array,
  grid: Grid,
  rng: Rng,
  cellSize: number,
  nest: Vec2,
): void {
  const roomCols = roomCount(grid.cols, cellSize)
  const roomRows = roomCount(grid.rows, cellSize)
  if (roomCols === 0 || roomRows === 0) {
    return
  }

  const nestCol = clampCol(grid, Math.floor(nest.x / grid.cellSize))
  const nestRow = clampRow(grid, Math.floor(nest.y / grid.cellSize))
  const startRc = Math.min(roomCols - 1, Math.floor(nestCol / cellSize))
  const startRr = Math.min(roomRows - 1, Math.floor(nestRow / cellSize))

  const visited = new Uint8Array(roomCols * roomRows)
  const stack: Room[] = [{ rc: startRc, rr: startRr }]
  visited[startRr * roomCols + startRc] = 1

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!
    const options = unvisitedNeighbors(current, roomCols, roomRows, visited)
    if (options.length === 0) {
      stack.pop()
      continue
    }
    shuffle(options, rng)
    const next = options[0]!
    carveDoor(walls, grid, cellSize, current, next)
    visited[next.rr * roomCols + next.rc] = 1
    stack.push(next)
  }
}

function carvePlaza(walls: Uint8Array, grid: Grid, nest: Vec2, radius: number): void {
  forEachCellInCircle(grid, nest.x, nest.y, radius, (col, row) => {
    if (isBorderCell(grid, col, row)) {
      return
    }
    walls[index(grid, col, row)] = 0
  })
}

function countOpenCells(walls: Uint8Array): number {
  let count = 0
  for (let i = 0; i < walls.length; i++) {
    if (walls[i] === 0) {
      count++
    }
  }
  return count
}

function isFullyConnected(
  walls: Uint8Array,
  grid: Grid,
  start: { col: number; row: number },
): boolean {
  const startIndex = index(grid, start.col, start.row)
  if (walls[startIndex] !== 0) {
    return false
  }
  const seen = new Uint8Array(grid.cols * grid.rows)
  const queue: number[] = [startIndex]
  seen[startIndex] = 1
  let reached = 0

  while (queue.length > 0) {
    const current = queue.pop()!
    reached++
    const col = current % grid.cols
    const row = (current - col) / grid.cols
    if (col + 1 < grid.cols) {
      const i = index(grid, col + 1, row)
      if (seen[i] === 0 && walls[i] === 0) {
        seen[i] = 1
        queue.push(i)
      }
    }
    if (col - 1 >= 0) {
      const i = index(grid, col - 1, row)
      if (seen[i] === 0 && walls[i] === 0) {
        seen[i] = 1
        queue.push(i)
      }
    }
    if (row + 1 < grid.rows) {
      const i = index(grid, col, row + 1)
      if (seen[i] === 0 && walls[i] === 0) {
        seen[i] = 1
        queue.push(i)
      }
    }
    if (row - 1 >= 0) {
      const i = index(grid, col, row - 1)
      if (seen[i] === 0 && walls[i] === 0) {
        seen[i] = 1
        queue.push(i)
      }
    }
  }

  return reached === countOpenCells(walls)
}

function scatterObstacles(
  walls: Uint8Array,
  grid: Grid,
  rng: Rng,
  cellSize: number,
  nest: Vec2,
  plazaRadius: number,
  count: number,
): void {
  if (count <= 0) {
    return
  }
  const candidates: number[] = []
  for (let row = 1; row < grid.rows - 1; row++) {
    if (row % cellSize === 0) {
      continue
    }
    for (let col = 1; col < grid.cols - 1; col++) {
      if (col % cellSize === 0) {
        continue
      }
      const i = index(grid, col, row)
      if (walls[i] !== 0) {
        continue
      }
      const center = cellCenter(grid, col, row)
      if (Math.hypot(center.x - nest.x, center.y - nest.y) <= plazaRadius) {
        continue
      }
      candidates.push(i)
    }
  }

  shuffle(candidates, rng)
  const start = worldToCell(grid, nest.x, nest.y)
  let placed = 0
  for (const i of candidates) {
    if (placed >= count) {
      break
    }
    walls[i] = 2
    if (isFullyConnected(walls, grid, start)) {
      placed++
    } else {
      walls[i] = 0
    }
  }
}

export function generateMaze(
  walls: Uint8Array,
  grid: Grid,
  rng: Rng,
  nest: Vec2,
  options: MazeOptions = {},
): void {
  const cellSize = Math.max(2, Math.floor(options.cellSize ?? DEFAULT_MAZE_CELL_SIZE))
  const obstacles = Math.max(0, Math.floor(options.obstacles ?? DEFAULT_MAZE_OBSTACLES))
  const plazaRadius = Math.max(0, options.plazaRadius ?? NEST_PLAZA_RADIUS)

  carveLattice(walls, grid, cellSize)
  carveMaze(walls, grid, rng, cellSize, nest)
  carvePlaza(walls, grid, nest, plazaRadius)
  scatterObstacles(walls, grid, rng, cellSize, nest, plazaRadius, obstacles)
}
