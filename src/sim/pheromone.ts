import { index, worldToCell } from './grid'
import type { Grid, PheromoneFields } from './types'

export function createFields(grid: Grid): PheromoneFields {
  const size = grid.cols * grid.rows
  return {
    home: new Float32Array(size),
    food: new Float32Array(size),
    attract: new Float32Array(size),
    repel: new Float32Array(size),
  }
}

export function deposit(
  field: Float32Array,
  grid: Grid,
  x: number,
  y: number,
  amount: number,
): void {
  const { col, row } = worldToCell(grid, x, y)
  const i = index(grid, col, row)
  field[i] = (field[i] ?? 0) + amount
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function sample(field: Float32Array, grid: Grid, x: number, y: number): number {
  const gx = clamp(x / grid.cellSize - 0.5, 0, grid.cols - 1)
  const gy = clamp(y / grid.cellSize - 0.5, 0, grid.rows - 1)
  const c0 = Math.floor(gx)
  const r0 = Math.floor(gy)
  const c1 = Math.min(c0 + 1, grid.cols - 1)
  const r1 = Math.min(r0 + 1, grid.rows - 1)
  const fx = gx - c0
  const fy = gy - r0

  const v00 = field[index(grid, c0, r0)] ?? 0
  const v10 = field[index(grid, c1, r0)] ?? 0
  const v01 = field[index(grid, c0, r1)] ?? 0
  const v11 = field[index(grid, c1, r1)] ?? 0

  const top = v00 + (v10 - v00) * fx
  const bottom = v01 + (v11 - v01) * fx
  return top + (bottom - top) * fy
}

export function decay(field: Float32Array, rate: number, dt: number): void {
  const factor = Math.max(0, 1 - rate * dt)
  for (let i = 0; i < field.length; i++) {
    field[i] = (field[i] ?? 0) * factor
  }
}

export function diffuse(field: Float32Array, grid: Grid, rate: number, dt: number): void {
  const k = clamp(rate * dt, 0, 1)
  if (k === 0) {
    return
  }
  const { cols, rows } = grid
  const copy = field.slice()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      const center = copy[i] ?? 0
      let sum = 0
      let count = 0
      if (c > 0) {
        sum += copy[i - 1] ?? 0
        count++
      }
      if (c < cols - 1) {
        sum += copy[i + 1] ?? 0
        count++
      }
      if (r > 0) {
        sum += copy[i - cols] ?? 0
        count++
      }
      if (r < rows - 1) {
        sum += copy[i + cols] ?? 0
        count++
      }
      const average = count > 0 ? sum / count : center
      field[i] = center + (average - center) * k
    }
  }
}

export function clearField(field: Float32Array): void {
  field.fill(0)
}
