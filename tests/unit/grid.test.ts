import { describe, it, expect } from 'vitest'
import {
  createGrid,
  cellCount,
  index,
  clampCol,
  clampRow,
  worldToCell,
  cellCenter,
} from '../../src/sim/grid'

describe('createGrid', () => {
  it('maps dimensions to cells with ceil', () => {
    expect(createGrid(240, 160, 4)).toEqual({ cols: 60, rows: 40, cellSize: 4 })
  })

  it('rounds partial cells up', () => {
    expect(createGrid(10, 10, 3)).toEqual({ cols: 4, rows: 4, cellSize: 3 })
  })
})

describe('grid indexing', () => {
  const grid = createGrid(240, 160, 4)

  it('computes the cell count', () => {
    expect(cellCount(grid)).toBe(60 * 40)
  })

  it('maps row-major indices', () => {
    expect(index(grid, 0, 0)).toBe(0)
    expect(index(grid, 3, 2)).toBe(2 * 60 + 3)
  })

  it('clamps columns and rows to bounds', () => {
    expect(clampCol(grid, -5)).toBe(0)
    expect(clampCol(grid, 999)).toBe(59)
    expect(clampRow(grid, -1)).toBe(0)
    expect(clampRow(grid, 999)).toBe(39)
  })

  it('converts world coordinates to clamped cells', () => {
    expect(worldToCell(grid, 0, 0)).toEqual({ col: 0, row: 0 })
    expect(worldToCell(grid, 9, 9)).toEqual({ col: 2, row: 2 })
    expect(worldToCell(grid, -10, -10)).toEqual({ col: 0, row: 0 })
    expect(worldToCell(grid, 10000, 10000)).toEqual({ col: 59, row: 39 })
  })

  it('returns the centre of a cell', () => {
    expect(cellCenter(grid, 0, 0)).toEqual({ x: 2, y: 2 })
    expect(cellCenter(grid, 1, 2)).toEqual({ x: 6, y: 10 })
  })
})
