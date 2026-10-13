import { describe, it, expect } from 'vitest'
import { createWorld } from '../../src/sim/world'
import { isWallAt, wallCount, obstacleCount } from '../../src/sim/walls'
import { NEST_PLAZA_RADIUS, DEFAULT_MAZE_OBSTACLES } from '../../src/sim/maze'
import { index, worldToCell, cellCenter } from '../../src/sim/grid'
import type { Grid, World } from '../../src/sim/types'

function borderOnlyCount(grid: Grid): number {
  return 2 * grid.cols + 2 * grid.rows - 4
}

function isBorderCell(grid: Grid, col: number, row: number): boolean {
  return col === 0 || row === 0 || col === grid.cols - 1 || row === grid.rows - 1
}

function cellDistance(world: World, col: number, row: number): number {
  const center = cellCenter(world.grid, col, row)
  return Math.hypot(center.x - world.nest.x, center.y - world.nest.y)
}

function openCellCount(walls: Uint8Array): number {
  let count = 0
  for (let i = 0; i < walls.length; i++) {
    if (walls[i] === 0) {
      count++
    }
  }
  return count
}

function reachableOpenCells(world: World): number {
  const { grid, walls } = world
  const start = worldToCell(grid, world.nest.x, world.nest.y)
  const startIndex = index(grid, start.col, start.row)
  const seen = new Uint8Array(grid.cols * grid.rows)
  const queue: number[] = [startIndex]
  seen[startIndex] = 1
  let reached = 0
  while (queue.length > 0) {
    const current = queue.pop()!
    reached++
    const col = current % grid.cols
    const row = Math.floor(current / grid.cols)
    const neighbors: Array<[number, number]> = [
      [col + 1, row],
      [col - 1, row],
      [col, row + 1],
      [col, row - 1],
    ]
    for (const [nc, nr] of neighbors) {
      if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) {
        continue
      }
      const ni = index(grid, nc, nr)
      if (seen[ni] === 1 || walls[ni] !== 0) {
        continue
      }
      seen[ni] = 1
      queue.push(ni)
    }
  }
  return reached
}

describe('maze generation', () => {
  it('is deterministic for a given seed', () => {
    const a = createWorld({ seed: 1, params: { antCount: 0 } })
    const b = createWorld({ seed: 1, params: { antCount: 0 } })
    expect(Array.from(a.walls)).toEqual(Array.from(b.walls))
    expect(obstacleCount(a.walls)).toBe(obstacleCount(b.walls))
  })

  it('produces different walls for different seeds', () => {
    const a = createWorld({ seed: 1, params: { antCount: 0 } })
    const b = createWorld({ seed: 2, params: { antCount: 0 } })
    expect(Array.from(a.walls)).not.toEqual(Array.from(b.walls))
  })

  it('leaves only border walls when maze is disabled', () => {
    const world = createWorld({ maze: false, params: { antCount: 0 } })
    expect(wallCount(world.walls)).toBe(borderOnlyCount(world.grid))
    expect(obstacleCount(world.walls)).toBe(0)
  })

  it('adds interior walls and obstacles by default', () => {
    const world = createWorld({ seed: 1, params: { antCount: 0 } })
    expect(wallCount(world.walls)).toBeGreaterThan(borderOnlyCount(world.grid))
    expect(obstacleCount(world.walls)).toBeGreaterThan(0)
    expect(obstacleCount(world.walls)).toBe(DEFAULT_MAZE_OBSTACLES)
  })

  it('never places obstacles on the border', () => {
    const world = createWorld({ seed: 1, params: { antCount: 0 } })
    const { grid, walls } = world
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (isBorderCell(grid, col, row)) {
          expect(walls[index(grid, col, row)]).not.toBe(2)
        }
      }
    }
  })

  it('never places obstacles inside the nest plaza', () => {
    const world = createWorld({ seed: 1, params: { antCount: 0 } })
    const { grid, walls } = world
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (cellDistance(world, col, row) <= NEST_PLAZA_RADIUS) {
          expect(walls[index(grid, col, row)]).not.toBe(2)
        }
      }
    }
  })

  it('keeps every plaza cell open', () => {
    const world = createWorld({ seed: 1, params: { antCount: 0 } })
    const { grid, walls } = world
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (cellDistance(world, col, row) <= NEST_PLAZA_RADIUS) {
          expect(walls[index(grid, col, row)]).toBe(0)
        }
      }
    }
  })

  it('keeps all open cells reachable from the nest', () => {
    for (const seed of [1, 2, 3, 42, 2024]) {
      const world = createWorld({ seed, params: { antCount: 0 } })
      expect(reachableOpenCells(world)).toBe(openCellCount(world.walls))
    }
  })

  it('treats obstacle cells as walls', () => {
    const world = createWorld({ seed: 1, params: { antCount: 0 } })
    const { grid, walls } = world
    const obstacleIndex = walls.indexOf(2)
    expect(obstacleIndex).toBeGreaterThanOrEqual(0)
    const col = obstacleIndex % grid.cols
    const row = Math.floor(obstacleIndex / grid.cols)
    const center = cellCenter(grid, col, row)
    expect(isWallAt(walls, grid, center.x, center.y)).toBe(true)
  })
})
