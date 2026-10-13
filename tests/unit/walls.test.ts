import { describe, it, expect } from 'vitest'
import { createGrid } from '../../src/sim/grid'
import {
  createWalls,
  isWallAt,
  setWallCircle,
  addBorderWalls,
  wallCount,
} from '../../src/sim/walls'

const grid = createGrid(40, 40, 4)

describe('createWalls', () => {
  it('creates an empty grid', () => {
    const walls = createWalls(grid)
    expect(walls.length).toBe(grid.cols * grid.rows)
    expect(wallCount(walls)).toBe(0)
  })
})

describe('setWallCircle', () => {
  it('fills cells whose centres fall inside the radius', () => {
    const walls = createWalls(grid)
    setWallCircle(walls, grid, 10, 10, 5, 1)
    expect(isWallAt(walls, grid, 10, 10)).toBe(true)
    expect(isWallAt(walls, grid, 6, 10)).toBe(true)
    expect(isWallAt(walls, grid, 2, 10)).toBe(false)
  })

  it('erases walls when value is zero', () => {
    const walls = createWalls(grid)
    setWallCircle(walls, grid, 10, 10, 5, 1)
    expect(wallCount(walls)).toBeGreaterThan(0)
    setWallCircle(walls, grid, 10, 10, 6, 0)
    expect(wallCount(walls)).toBe(0)
  })

  it('clamps out-of-bounds circles into the grid', () => {
    const walls = createWalls(grid)
    setWallCircle(walls, grid, -50, -50, 200, 1)
    expect(wallCount(walls)).toBe(grid.cols * grid.rows)
  })
})

describe('addBorderWalls', () => {
  it('walls off every edge cell', () => {
    const walls = createWalls(grid)
    addBorderWalls(walls, grid)
    expect(isWallAt(walls, grid, 2, 2)).toBe(true)
    expect(isWallAt(walls, grid, 38, 38)).toBe(true)
    expect(isWallAt(walls, grid, 20, 20)).toBe(false)
    expect(wallCount(walls)).toBe(2 * grid.cols + 2 * grid.rows - 4)
  })
})
