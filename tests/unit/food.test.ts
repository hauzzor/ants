import { describe, it, expect } from 'vitest'
import {
  createFood,
  totalFood,
  findFoodAt,
  takeFood,
  pruneDepleted,
  emitScent,
} from '../../src/sim/food'
import { createGrid, index } from '../../src/sim/grid'
import type { Grid } from '../../src/sim/types'

const GRID = createGrid(40, 24, 4)

function emptyField(grid: Grid): Float32Array {
  return new Float32Array(grid.cols * grid.rows)
}

function emptyDir(grid: Grid): { x: Float32Array; y: Float32Array } {
  return { x: emptyField(grid), y: emptyField(grid) }
}

function at(field: Float32Array, grid: Grid, col: number, row: number): number {
  return field[index(grid, col, row)] ?? 0
}

function isZero(field: Float32Array): boolean {
  return field.every((value) => value === 0)
}

describe('createFood', () => {
  it('stores its position and amount', () => {
    expect(createFood(3, 10, 20, 50)).toEqual({ id: 3, x: 10, y: 20, amount: 50 })
  })
})

describe('totalFood', () => {
  it('sums the amount across sources', () => {
    expect(totalFood([createFood(0, 0, 0, 10), createFood(1, 1, 1, 5)])).toBe(15)
  })

  it('is zero for no sources', () => {
    expect(totalFood([])).toBe(0)
  })
})

describe('findFoodAt', () => {
  const foods = [createFood(0, 10, 10, 5), createFood(1, 20, 10, 5)]

  it('finds the nearest source within the radius', () => {
    expect(findFoodAt(foods, 12, 10, 4)?.id).toBe(0)
    expect(findFoodAt(foods, 18, 10, 4)?.id).toBe(1)
  })

  it('returns undefined when nothing is close enough', () => {
    expect(findFoodAt(foods, 100, 100, 4)).toBeUndefined()
  })
})

describe('takeFood', () => {
  it('removes up to the requested amount', () => {
    const food = createFood(0, 0, 0, 5)
    expect(takeFood(food, 3)).toBe(3)
    expect(food.amount).toBe(2)
  })

  it('never removes more than is available', () => {
    const food = createFood(0, 0, 0, 2)
    expect(takeFood(food, 10)).toBe(2)
    expect(food.amount).toBe(0)
  })
})

describe('pruneDepleted', () => {
  it('drops empty sources', () => {
    const foods = [createFood(0, 0, 0, 0), createFood(1, 1, 1, 4)]
    expect(pruneDepleted(foods).map((f) => f.id)).toEqual([1])
  })
})

describe('emitScent', () => {
  it('emits within the radius and leaves cells beyond it untouched', () => {
    const field = emptyField(GRID)
    emitScent([createFood(0, 6, 6, 10)], field, emptyField(GRID), emptyDir(GRID), GRID, 6, 5, 1)

    expect(at(field, GRID, 1, 1)).toBeGreaterThan(0)
    expect(at(field, GRID, 1, 2)).toBeGreaterThan(0)
    expect(at(field, GRID, 0, 0)).toBeGreaterThan(0)
    expect(at(field, GRID, 3, 1)).toBe(0)
    expect(at(field, GRID, 1, 3)).toBe(0)
  })

  it('falls off from the center toward the edge', () => {
    const field = emptyField(GRID)
    emitScent([createFood(0, 6, 6, 10)], field, emptyField(GRID), emptyDir(GRID), GRID, 6, 5, 1)

    expect(at(field, GRID, 1, 1)).toBeGreaterThan(at(field, GRID, 1, 2))
    expect(at(field, GRID, 1, 2)).toBeGreaterThan(at(field, GRID, 0, 0))
  })

  it('scales the deposit with rate', () => {
    const single = emptyField(GRID)
    const double = emptyField(GRID)
    emitScent([createFood(0, 6, 6, 10)], single, emptyField(GRID), emptyDir(GRID), GRID, 6, 5, 1)
    emitScent([createFood(0, 6, 6, 10)], double, emptyField(GRID), emptyDir(GRID), GRID, 6, 10, 1)

    expect(at(double, GRID, 1, 1)).toBeCloseTo(at(single, GRID, 1, 1) * 2, 5)
    expect(at(double, GRID, 1, 2)).toBeCloseTo(at(single, GRID, 1, 2) * 2, 5)
  })

  it('scales the deposit with dt', () => {
    const single = emptyField(GRID)
    const double = emptyField(GRID)
    emitScent([createFood(0, 6, 6, 10)], single, emptyField(GRID), emptyDir(GRID), GRID, 6, 5, 1)
    emitScent([createFood(0, 6, 6, 10)], double, emptyField(GRID), emptyDir(GRID), GRID, 6, 5, 2)

    expect(at(double, GRID, 1, 1)).toBeCloseTo(at(single, GRID, 1, 1) * 2, 5)
    expect(at(double, GRID, 1, 2)).toBeCloseTo(at(single, GRID, 1, 2) * 2, 5)
  })

  it('is a no-op when rate, radius or dt is not positive', () => {
    const cases: Array<[number, number, number]> = [
      [6, 0, 1],
      [0, 5, 1],
      [6, 5, 0],
      [6, -1, 1],
      [6, 5, -1],
    ]
    for (const [radius, rate, dt] of cases) {
      const field = emptyField(GRID)
      emitScent(
        [createFood(0, 6, 6, 10)],
        field,
        emptyField(GRID),
        emptyDir(GRID),
        GRID,
        radius,
        rate,
        dt,
      )
      expect(isZero(field)).toBe(true)
    }
  })

  it('only mutates the passed field', () => {
    const field = emptyField(GRID)
    const other = emptyField(GRID)
    emitScent([createFood(0, 6, 6, 10)], field, emptyField(GRID), emptyDir(GRID), GRID, 6, 5, 1)

    expect(field.some((value) => value > 0)).toBe(true)
    expect(isZero(other)).toBe(true)
  })

  it('raises the peak for every cell it scents', () => {
    const field = emptyField(GRID)
    const peak = emptyField(GRID)
    emitScent([createFood(0, 6, 6, 10)], field, peak, emptyDir(GRID), GRID, 6, 5, 1)

    expect(at(peak, GRID, 1, 1)).toBeCloseTo(at(field, GRID, 1, 1), 6)
    expect(at(peak, GRID, 1, 2)).toBeCloseTo(at(field, GRID, 1, 2), 6)
    expect(at(peak, GRID, 1, 1)).toBeGreaterThan(0)
  })

  it('records the direction toward the source', () => {
    const field = emptyField(GRID)
    const peak = emptyField(GRID)
    const dir = emptyDir(GRID)
    emitScent([createFood(0, 6, 6, 10)], field, peak, dir, GRID, 6, 5, 1)

    const right = index(GRID, 2, 1)
    expect(dir.x[right]).toBeLessThan(0)
    expect(dir.y[right]).toBeCloseTo(0, 6)

    const down = index(GRID, 1, 2)
    expect(dir.y[down]).toBeLessThan(0)
    expect(dir.x[down]).toBeCloseTo(0, 6)
  })

  it('skips blocked cells when walls are provided', () => {
    const field = emptyField(GRID)
    const peak = emptyField(GRID)
    const dir = emptyDir(GRID)
    const walls = new Uint8Array(GRID.cols * GRID.rows)
    walls[index(GRID, 2, 1)] = 1
    emitScent([createFood(0, 6, 6, 10)], field, peak, dir, GRID, 6, 5, 1, walls)

    expect(at(field, GRID, 2, 1)).toBe(0)
    expect(at(peak, GRID, 2, 1)).toBe(0)
    expect(at(field, GRID, 1, 1)).toBeGreaterThan(0)
  })
})
