import { describe, it, expect } from 'vitest'
import { createGrid, index } from '../../src/sim/grid'
import {
  createWalls,
  isWallAt,
  setWallCircle,
  setWallRect,
  nearestOpenPoint,
  addBorderWalls,
  wallCount,
  obstacleCount,
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

describe('setWallRect', () => {
  it('fills a normalized rectangle over covered cells', () => {
    const walls = createWalls(grid)
    setWallRect(walls, grid, 10, 10, 22, 18, 1)
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 5; c++) {
        expect(walls[index(grid, c, r)]).toBe(1)
      }
    }
    expect(isWallAt(walls, grid, 26, 10)).toBe(false)
  })

  it('normalizes reversed corners', () => {
    const a = createWalls(grid)
    const b = createWalls(grid)
    setWallRect(a, grid, 22, 18, 10, 10, 1)
    setWallRect(b, grid, 10, 10, 22, 18, 1)
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('clamps to the grid and writes the requested value', () => {
    const walls = createWalls(grid)
    setWallRect(walls, grid, -100, -100, 1e6, 1e6, 2)
    expect(walls.every((value) => value === 2)).toBe(true)
    expect(obstacleCount(walls)).toBe(grid.cols * grid.rows)
  })

  it('erases with value zero', () => {
    const walls = createWalls(grid)
    setWallRect(walls, grid, 0, 0, 40, 40, 1)
    setWallRect(walls, grid, 10, 10, 20, 20, 0)
    expect(isWallAt(walls, grid, 15, 15)).toBe(false)
    expect(isWallAt(walls, grid, 5, 5)).toBe(true)
  })
})

describe('nearestOpenPoint', () => {
  it('returns the cell centre when the input cell is open', () => {
    const walls = createWalls(grid)
    expect(nearestOpenPoint(walls, grid, 22, 22)).toEqual({ x: 22, y: 22 })
  })

  it('returns the nearest open cell centre from a blocked cell', () => {
    const walls = createWalls(grid)
    walls[index(grid, 5, 5)] = 2
    expect(nearestOpenPoint(walls, grid, 22, 22)).toEqual({ x: 22, y: 18 })
  })

  it('finds the only open cell in a fully blocked grid', () => {
    const walls = createWalls(grid)
    walls.fill(1)
    walls[index(grid, 3, 4)] = 0
    expect(nearestOpenPoint(walls, grid, 22, 22)).toEqual({ x: 14, y: 18 })
  })

  it('breaks nearest ties in row-major order', () => {
    const walls = createWalls(grid)
    walls[index(grid, 5, 5)] = 1
    walls[index(grid, 5, 4)] = 1
    expect(nearestOpenPoint(walls, grid, 22, 22)).toEqual({ x: 18, y: 22 })
  })
})

describe('obstacles', () => {
  it('counts only value-2 cells', () => {
    const walls = createWalls(grid)
    expect(obstacleCount(walls)).toBe(0)
    const i = index(grid, 5, 5)
    walls[i] = 2
    expect(obstacleCount(walls)).toBe(1)
    expect(wallCount(walls)).toBe(1)
  })

  it('blocks movement for any nonzero value', () => {
    const walls = createWalls(grid)
    walls[index(grid, 5, 5)] = 2
    expect(isWallAt(walls, grid, 22, 22)).toBe(true)
    walls[index(grid, 5, 5)] = 1
    expect(isWallAt(walls, grid, 22, 22)).toBe(true)
    walls[index(grid, 5, 5)] = 0
    expect(isWallAt(walls, grid, 22, 22)).toBe(false)
  })
})
