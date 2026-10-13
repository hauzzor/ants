import { describe, it, expect } from 'vitest'
import { createGrid, index } from '../../src/sim/grid'
import {
  createFields,
  deposit,
  emitRadial,
  sample,
  sampleDirection,
  decay,
  diffuse,
  clearField,
  recordPeaks,
  cullDiluted,
  PHEROMONE_CULL_FRACTION,
  PHEROMONE_DIRECTION_EPSILON,
  PHEROMONE_MIN_STRENGTH,
} from '../../src/sim/pheromone'

const grid = createGrid(40, 40, 4)
const KINDS = ['home', 'food', 'attract', 'repel'] as const

describe('createFields', () => {
  it('creates one zeroed field per pheromone kind', () => {
    const fields = createFields(grid)
    const cellCount = grid.cols * grid.rows
    for (const kind of KINDS) {
      expect(fields[kind]).toBeInstanceOf(Float32Array)
      expect(fields[kind].length).toBe(cellCount)
      expect(fields[kind].every((v) => v === 0)).toBe(true)
    }
    expect(fields.home).not.toBe(fields.food)
  })

  it('creates one zeroed peaks array per pheromone kind', () => {
    const fields = createFields(grid)
    const cellCount = grid.cols * grid.rows
    for (const kind of KINDS) {
      expect(fields.peaks[kind]).toBeInstanceOf(Float32Array)
      expect(fields.peaks[kind].length).toBe(cellCount)
      expect(fields.peaks[kind].every((v) => v === 0)).toBe(true)
    }
    expect(fields.peaks.home).not.toBe(fields.peaks.food)
  })

  it('creates one zeroed direction field per pheromone kind', () => {
    const fields = createFields(grid)
    const cellCount = grid.cols * grid.rows
    for (const kind of KINDS) {
      expect(fields.dirs[kind].x).toBeInstanceOf(Float32Array)
      expect(fields.dirs[kind].y).toBeInstanceOf(Float32Array)
      expect(fields.dirs[kind].x.length).toBe(cellCount)
      expect(fields.dirs[kind].y.length).toBe(cellCount)
      expect(fields.dirs[kind].x.every((v) => v === 0)).toBe(true)
      expect(fields.dirs[kind].y.every((v) => v === 0)).toBe(true)
    }
  })
})

describe('deposit', () => {
  it('adds to the nearest cell and accumulates', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 3)
    expect(sample(fields.food, grid, 2, 2)).toBe(3)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 2)
    expect(sample(fields.food, grid, 2, 2)).toBe(5)
  })

  it('groups nearby coordinates into the same cell', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 0.5, 0.5, 1)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 3.5, 3.5, 1)
    expect(sample(fields.food, grid, 2, 2)).toBe(2)
  })

  it('clamps out-of-bounds deposits into edge cells', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, -20, -20, 4)
    expect(sample(fields.food, grid, 0, 0)).toBe(4)
  })

  it('raises the peak to the accumulated value', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 3)
    expect(fields.peaks.food[0]).toBe(3)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 2)
    expect(fields.peaks.food[0]).toBe(5)
  })

  it('records a reverse-heading direction weighted by the deposited amount', () => {
    const fields = createFields(grid)
    const i = index(grid, 5, 5)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 4, -1, 0)
    expect(fields.dirs.food.x[i]).toBe(-4)
    expect(fields.dirs.food.y[i]).toBe(0)

    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 2, 0, -1)
    expect(fields.dirs.food.x[i]).toBe(-4)
    expect(fields.dirs.food.y[i]).toBe(-2)
  })

  it('leaves the direction untouched when none is supplied', () => {
    const fields = createFields(grid)
    const i = index(grid, 5, 5)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 4)
    expect(fields.dirs.food.x[i]).toBe(0)
    expect(fields.dirs.food.y[i]).toBe(0)
  })
})

describe('emitRadial', () => {
  it('records the direction from each cell toward the source centre', () => {
    const fields = createFields(grid)
    emitRadial(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 12, 5, 1)

    const right = index(grid, 6, 5)
    expect(fields.dirs.food.x[right]).toBeLessThan(0)
    expect(fields.dirs.food.y[right]).toBeCloseTo(0, 6)

    const down = index(grid, 5, 6)
    expect(fields.dirs.food.y[down]).toBeLessThan(0)
    expect(fields.dirs.food.x[down]).toBeCloseTo(0, 6)
  })

  it('records no direction in the source cell', () => {
    const fields = createFields(grid)
    emitRadial(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 12, 5, 1)

    const center = index(grid, 5, 5)
    expect(fields.dirs.food.x[center]).toBe(0)
    expect(fields.dirs.food.y[center]).toBe(0)
  })
})

describe('sample', () => {
  it('interpolates between neighbouring cell centres', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 100)
    expect(sample(fields.food, grid, 4, 2)).toBeCloseTo(50, 5)
    expect(sample(fields.food, grid, 3, 2)).toBeCloseTo(75, 5)
  })

  it('clamps samples outside the grid', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 7)
    expect(sample(fields.food, grid, -100, -100)).toBe(7)
    expect(sample(fields.food, grid, 1e6, 1e6)).toBe(0)
  })
})

describe('sampleDirection', () => {
  it('returns a normalized direction and the raw magnitude', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 1, 3, 4)
    const result = sampleDirection(fields, 'food', grid, 22, 22)
    expect(result.x).toBeCloseTo(0.6, 5)
    expect(result.y).toBeCloseTo(0.8, 5)
    expect(result.magnitude).toBeCloseTo(5, 5)
  })

  it('returns a zero vector below the epsilon', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 1, 1e-6, 0)
    expect(sampleDirection(fields, 'food', grid, 22, 22)).toEqual({
      x: 0,
      y: 0,
      magnitude: 0,
    })
  })

  it('exposes a small epsilon', () => {
    expect(PHEROMONE_DIRECTION_EPSILON).toBe(1e-4)
  })
})

describe('decay', () => {
  it('scales values by (1 - rate * dt)', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 10)
    decay(fields.food, 0.5, 1)
    expect(sample(fields.food, grid, 2, 2)).toBeCloseTo(5, 5)
  })

  it('never produces negative values', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 10)
    decay(fields.food, 2, 1)
    expect(sample(fields.food, grid, 2, 2)).toBe(0)
  })

  it('does not decay the recorded peaks', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10)
    const i = index(grid, 5, 5)
    decay(fields.food, 0.5, 1)
    expect(fields.food[i]).toBeCloseTo(5, 5)
    expect(fields.peaks.food[i]).toBe(10)
  })

  it('decays direction components by the same factor as the field', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10, 1, 0)
    const i = index(grid, 5, 5)
    decay(fields.food, 0.5, 1, fields.dirs.food)
    expect(fields.food[i]).toBeCloseTo(5, 5)
    expect(fields.dirs.food.x[i]).toBeCloseTo(5, 5)
    expect(fields.dirs.food.y[i]).toBe(0)
  })
})

describe('diffuse', () => {
  it('spreads a spike to its four neighbours', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 100)
    diffuse(fields.food, grid, 1, 1)
    expect(sample(fields.food, grid, 22, 22)).toBeCloseTo(0, 5)
    expect(sample(fields.food, grid, 26, 22)).toBeCloseTo(25, 5)
    expect(sample(fields.food, grid, 18, 22)).toBeCloseTo(25, 5)
    expect(sample(fields.food, grid, 22, 26)).toBeCloseTo(25, 5)
    expect(sample(fields.food, grid, 22, 18)).toBeCloseTo(25, 5)
  })

  it('does nothing when the rate or dt is zero', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 100)
    diffuse(fields.food, grid, 0, 1)
    expect(sample(fields.food, grid, 22, 22)).toBe(100)
  })

  it('leaves peaks untouched until they are recorded', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 100)
    diffuse(fields.food, grid, 1, 1)
    const neighbour = index(grid, 6, 5)
    expect(fields.food[neighbour]).toBeCloseTo(25, 5)
    expect(fields.peaks.food[neighbour]).toBe(0)

    recordPeaks(fields.food, fields.peaks.food)
    expect(fields.peaks.food[neighbour]).toBeCloseTo(25, 5)
  })

  it('does not touch directions', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 100, 1, 0)
    diffuse(fields.food, grid, 1, 1)
    const neighbour = index(grid, 6, 5)
    expect(fields.dirs.food.x[neighbour]).toBe(0)
    expect(fields.dirs.food.y[neighbour]).toBe(0)
  })
})

describe('recordPeaks', () => {
  it('raises each peak to the current value without lowering it', () => {
    const field = new Float32Array([0, 3, 1, 0])
    const peak = new Float32Array([2, 0, 5, 0])
    recordPeaks(field, peak)
    expect(Array.from(peak)).toEqual([2, 3, 5, 0])
  })
})

describe('cullDiluted', () => {
  it('exposes a one tenth lifetime floor', () => {
    expect(PHEROMONE_CULL_FRACTION).toBe(0.1)
  })

  it('clears field and peak below the fraction of the peak', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10)
    const i = index(grid, 5, 5)
    fields.food[i] = 0.5
    cullDiluted(fields.food, fields.peaks.food)
    expect(fields.food[i]).toBe(0)
    expect(fields.peaks.food[i]).toBe(0)
  })

  it('keeps values at or above the fraction of the peak', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10)
    const i = index(grid, 5, 5)

    fields.food[i] = 1
    cullDiluted(fields.food, fields.peaks.food)
    expect(fields.food[i]).toBe(1)
    expect(fields.peaks.food[i]).toBe(10)

    fields.food[i] = 5
    cullDiluted(fields.food, fields.peaks.food)
    expect(fields.food[i]).toBe(5)
    expect(fields.peaks.food[i]).toBe(10)
  })

  it('ignores cells whose peak was never set', () => {
    const field = new Float32Array([0.5, 0])
    const peak = new Float32Array([0, 0])
    cullDiluted(field, peak)
    expect(Array.from(field)).toEqual([0.5, 0])
  })

  it('starts a fresh peak after a deposit following a cull', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10)
    const i = index(grid, 5, 5)
    fields.food[i] = 0.5
    cullDiluted(fields.food, fields.peaks.food)
    expect(fields.peaks.food[i]).toBe(0)

    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 3)
    expect(fields.food[i]).toBe(3)
    expect(fields.peaks.food[i]).toBe(3)
  })

  it('zeroes the direction of culled cells', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10, 1, 0)
    const i = index(grid, 5, 5)
    fields.food[i] = 0.5
    cullDiluted(fields.food, fields.peaks.food, fields.dirs.food)
    expect(fields.dirs.food.x[i]).toBe(0)
    expect(fields.dirs.food.y[i]).toBe(0)
  })

  it('keeps the direction of surviving cells', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 22, 22, 10, 1, 0)
    const i = index(grid, 5, 5)
    cullDiluted(fields.food, fields.peaks.food, fields.dirs.food)
    expect(fields.dirs.food.x[i]).toBe(10)
    expect(fields.dirs.food.y[i]).toBe(0)
  })

  it('exposes an absolute minimum strength', () => {
    expect(PHEROMONE_MIN_STRENGTH).toBe(1e-3)
  })

  it('clears a cell at exactly the minimum strength', () => {
    const fields = createFields(grid)
    const i = index(grid, 5, 5)
    fields.food[i] = PHEROMONE_MIN_STRENGTH
    fields.dirs.food.x[i] = 1
    fields.dirs.food.y[i] = 2
    cullDiluted(fields.food, fields.peaks.food, fields.dirs.food)
    expect(fields.food[i]).toBe(0)
    expect(fields.peaks.food[i]).toBe(0)
    expect(fields.dirs.food.x[i]).toBe(0)
    expect(fields.dirs.food.y[i]).toBe(0)
  })

  it('keeps a cell just above the minimum when the relative rule does not apply', () => {
    const fields = createFields(grid)
    const i = index(grid, 5, 5)
    fields.food[i] = PHEROMONE_MIN_STRENGTH * 2
    cullDiluted(fields.food, fields.peaks.food, fields.dirs.food)
    expect(fields.food[i]).toBeCloseTo(PHEROMONE_MIN_STRENGTH * 2, 6)
  })
})

describe('clearField', () => {
  it('resets the field and every provided layer to zero', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 9, 1, 0)
    clearField(fields.food, fields.peaks.food, fields.dirs.food)
    expect(fields.food.every((v) => v === 0)).toBe(true)
    expect(fields.peaks.food.every((v) => v === 0)).toBe(true)
    expect(fields.dirs.food.x.every((v) => v === 0)).toBe(true)
    expect(fields.dirs.food.y.every((v) => v === 0)).toBe(true)
  })

  it('clears only the field when no other layers are given', () => {
    const fields = createFields(grid)
    deposit(fields.food, fields.peaks.food, fields.dirs.food, grid, 2, 2, 9, 1, 0)
    clearField(fields.food)
    expect(fields.food.every((v) => v === 0)).toBe(true)
    expect(fields.peaks.food.some((v) => v > 0)).toBe(true)
    expect(fields.dirs.food.x.some((v) => v > 0)).toBe(true)
  })
})
