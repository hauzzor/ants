import { cellCenter, forEachCellInCircle, index, worldToCell } from './grid'
import type { DirectionField, Grid, PheromoneFields, PheromoneKind } from './types'

export const PHEROMONE_CULL_FRACTION = 0.1
export const PHEROMONE_DIRECTION_EPSILON = 1e-4
export const PHEROMONE_MIN_STRENGTH = 1e-3
// Float32Array storage rounds 1e-3 up, so compare against the stored floor.
const PHEROMONE_MIN_STRENGTH_F32 = Math.fround(PHEROMONE_MIN_STRENGTH)

export function createFields(grid: Grid): PheromoneFields {
  const size = grid.cols * grid.rows
  return {
    home: new Float32Array(size),
    food: new Float32Array(size),
    attract: new Float32Array(size),
    repel: new Float32Array(size),
    peaks: {
      home: new Float32Array(size),
      food: new Float32Array(size),
      attract: new Float32Array(size),
      repel: new Float32Array(size),
    },
    dirs: {
      home: { x: new Float32Array(size), y: new Float32Array(size) },
      food: { x: new Float32Array(size), y: new Float32Array(size) },
      attract: { x: new Float32Array(size), y: new Float32Array(size) },
      repel: { x: new Float32Array(size), y: new Float32Array(size) },
    },
  }
}

export function raisePeak(peak: Float32Array, i: number, value: number): void {
  if (value > (peak[i] ?? 0)) {
    peak[i] = value
  }
}

export function deposit(
  field: Float32Array,
  peak: Float32Array,
  dir: DirectionField,
  grid: Grid,
  x: number,
  y: number,
  amount: number,
  ux = 0,
  uy = 0,
): void {
  const { col, row } = worldToCell(grid, x, y)
  const i = index(grid, col, row)
  const value = (field[i] ?? 0) + amount
  field[i] = value
  raisePeak(peak, i, value)
  dir.x[i] = (dir.x[i] ?? 0) + amount * ux
  dir.y[i] = (dir.y[i] ?? 0) + amount * uy
}

export function emitRadial(
  field: Float32Array,
  peak: Float32Array,
  dir: DirectionField,
  grid: Grid,
  centerX: number,
  centerY: number,
  radius: number,
  rate: number,
  dt: number,
): void {
  if (radius <= 0 || rate <= 0 || dt <= 0) {
    return
  }
  const amount = rate * dt
  forEachCellInCircle(grid, centerX, centerY, radius, (col, row, distance) => {
    const falloff = 1 - distance / radius
    const i = index(grid, col, row)
    const add = amount * falloff
    const value = (field[i] ?? 0) + add
    field[i] = value
    raisePeak(peak, i, value)
    if (distance > 0) {
      const center = cellCenter(grid, col, row)
      const ux = (centerX - center.x) / distance
      const uy = (centerY - center.y) / distance
      dir.x[i] = (dir.x[i] ?? 0) + add * ux
      dir.y[i] = (dir.y[i] ?? 0) + add * uy
    }
  })
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

export function sampleDirection(
  fields: PheromoneFields,
  kind: PheromoneKind,
  grid: Grid,
  x: number,
  y: number,
): { x: number; y: number; magnitude: number } {
  const dir = fields.dirs[kind]
  const dx = sample(dir.x, grid, x, y)
  const dy = sample(dir.y, grid, x, y)
  const magnitude = Math.hypot(dx, dy)
  if (magnitude < PHEROMONE_DIRECTION_EPSILON) {
    return { x: 0, y: 0, magnitude: 0 }
  }
  return { x: dx / magnitude, y: dy / magnitude, magnitude }
}

export function decay(
  field: Float32Array,
  rate: number,
  dt: number,
  dir?: DirectionField,
): void {
  const factor = Math.max(0, 1 - rate * dt)
  for (let i = 0; i < field.length; i++) {
    field[i] = (field[i] ?? 0) * factor
    if (dir) {
      dir.x[i] = (dir.x[i] ?? 0) * factor
      dir.y[i] = (dir.y[i] ?? 0) * factor
    }
  }
}

export function recordPeaks(field: Float32Array, peak: Float32Array): void {
  for (let i = 0; i < field.length; i++) {
    raisePeak(peak, i, field[i] ?? 0)
  }
}

export function cullDiluted(
  field: Float32Array,
  peak: Float32Array,
  dir?: DirectionField,
  fraction: number = PHEROMONE_CULL_FRACTION,
): void {
  for (let i = 0; i < field.length; i++) {
    const value = field[i] ?? 0
    const original = peak[i] ?? 0
    const diluted = original > 0 && value < original * fraction
    if (value <= PHEROMONE_MIN_STRENGTH_F32 || diluted) {
      field[i] = 0
      peak[i] = 0
      if (dir) {
        dir.x[i] = 0
        dir.y[i] = 0
      }
    }
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

export function clearField(
  field: Float32Array,
  peak?: Float32Array,
  dir?: DirectionField,
): void {
  field.fill(0)
  peak?.fill(0)
  if (dir) {
    dir.x.fill(0)
    dir.y.fill(0)
  }
}
