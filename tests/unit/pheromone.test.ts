import { describe, it, expect } from 'vitest'
import { createGrid } from '../../src/sim/grid'
import {
  createFields,
  deposit,
  sample,
  decay,
  diffuse,
  clearField,
} from '../../src/sim/pheromone'

const grid = createGrid(40, 40, 4)

describe('createFields', () => {
  it('creates one zeroed field per pheromone kind', () => {
    const fields = createFields(grid)
    const cellCount = grid.cols * grid.rows
    for (const kind of ['home', 'food', 'attract', 'repel'] as const) {
      expect(fields[kind]).toBeInstanceOf(Float32Array)
      expect(fields[kind].length).toBe(cellCount)
      expect(fields[kind].every((v) => v === 0)).toBe(true)
    }
    expect(fields.home).not.toBe(fields.food)
  })
})

describe('deposit', () => {
  it('adds to the nearest cell and accumulates', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 2, 2, 3)
    expect(sample(fields.food, grid, 2, 2)).toBe(3)
    deposit(fields.food, grid, 2, 2, 2)
    expect(sample(fields.food, grid, 2, 2)).toBe(5)
  })

  it('groups nearby coordinates into the same cell', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 0.5, 0.5, 1)
    deposit(fields.food, grid, 3.5, 3.5, 1)
    expect(sample(fields.food, grid, 2, 2)).toBe(2)
  })

  it('clamps out-of-bounds deposits into edge cells', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, -20, -20, 4)
    expect(sample(fields.food, grid, 0, 0)).toBe(4)
  })
})

describe('sample', () => {
  it('interpolates between neighbouring cell centres', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 2, 2, 100)
    expect(sample(fields.food, grid, 4, 2)).toBeCloseTo(50, 5)
    expect(sample(fields.food, grid, 3, 2)).toBeCloseTo(75, 5)
  })

  it('clamps samples outside the grid', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 2, 2, 7)
    expect(sample(fields.food, grid, -100, -100)).toBe(7)
    expect(sample(fields.food, grid, 1e6, 1e6)).toBe(0)
  })
})

describe('decay', () => {
  it('scales values by (1 - rate * dt)', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 2, 2, 10)
    decay(fields.food, 0.5, 1)
    expect(sample(fields.food, grid, 2, 2)).toBeCloseTo(5, 5)
  })

  it('never produces negative values', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 2, 2, 10)
    decay(fields.food, 2, 1)
    expect(sample(fields.food, grid, 2, 2)).toBe(0)
  })
})

describe('diffuse', () => {
  it('spreads a spike to its four neighbours', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 22, 22, 100)
    diffuse(fields.food, grid, 1, 1)
    expect(sample(fields.food, grid, 22, 22)).toBeCloseTo(0, 5)
    expect(sample(fields.food, grid, 26, 22)).toBeCloseTo(25, 5)
    expect(sample(fields.food, grid, 18, 22)).toBeCloseTo(25, 5)
    expect(sample(fields.food, grid, 22, 26)).toBeCloseTo(25, 5)
    expect(sample(fields.food, grid, 22, 18)).toBeCloseTo(25, 5)
  })

  it('does nothing when the rate or dt is zero', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 22, 22, 100)
    diffuse(fields.food, grid, 0, 1)
    expect(sample(fields.food, grid, 22, 22)).toBe(100)
  })
})

describe('clearField', () => {
  it('resets every cell to zero', () => {
    const fields = createFields(grid)
    deposit(fields.food, grid, 2, 2, 9)
    clearField(fields.food)
    expect(fields.food.every((v) => v === 0)).toBe(true)
  })
})
