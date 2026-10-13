import { clampCol, clampRow, forEachCellInCircle, index } from './grid'
import { createFood } from './food'
import { raisePeak } from './pheromone'
import { spawnAnt, spawnAntNearNest } from './ant'
import { nearestOpenPoint, setWallCircle, setWallRect } from './walls'
import { PHEROMONE_KINDS } from './types'
import type { Ant, FoodSource, World } from './types'

export type PaintedPheromone = 'attract' | 'repel'

function clearPheromoneCell(world: World, col: number, row: number): void {
  const i = index(world.grid, col, row)
  for (const kind of PHEROMONE_KINDS) {
    world.pheromones[kind][i] = 0
    world.pheromones.peaks[kind][i] = 0
    world.pheromones.dirs[kind].x[i] = 0
    world.pheromones.dirs[kind].y[i] = 0
  }
}

export function paintPheromone(
  world: World,
  kind: PaintedPheromone,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  const field = world.pheromones[kind]
  const peak = world.pheromones.peaks[kind]
  forEachCellInCircle(world.grid, x, y, radius, (col, row, distance) => {
    const i = index(world.grid, col, row)
    if (world.walls[i] !== 0) {
      return
    }
    const falloff = radius > 0 ? 1 - distance / radius : 1
    const value = (field[i] ?? 0) + amount * falloff
    field[i] = value
    raisePeak(peak, i, value)
  })
}

export function erasePheromone(world: World, x: number, y: number, radius: number): void {
  forEachCellInCircle(world.grid, x, y, radius, (col, row) => {
    const i = index(world.grid, col, row)
    for (const kind of PHEROMONE_KINDS) {
      world.pheromones[kind][i] = 0
      world.pheromones.peaks[kind][i] = 0
      world.pheromones.dirs[kind].x[i] = 0
      world.pheromones.dirs[kind].y[i] = 0
    }
  })
}

export function placeFood(
  world: World,
  x: number,
  y: number,
  amount: number = world.params.foodAmount,
): FoodSource {
  const point = nearestOpenPoint(world.walls, world.grid, x, y)
  const food = createFood(world.nextId++, point.x, point.y, amount)
  world.foods.push(food)
  return food
}

export function placeObstacleRect(
  world: World,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const { grid, walls } = world
  setWallRect(walls, grid, x0, y0, x1, y1, 2)

  const colA = clampCol(grid, Math.floor(x0 / grid.cellSize))
  const colB = clampCol(grid, Math.floor(x1 / grid.cellSize))
  const rowA = clampRow(grid, Math.floor(y0 / grid.cellSize))
  const rowB = clampRow(grid, Math.floor(y1 / grid.cellSize))
  const minCol = Math.min(colA, colB)
  const maxCol = Math.max(colA, colB)
  const minRow = Math.min(rowA, rowB)
  const maxRow = Math.max(rowA, rowB)

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      clearPheromoneCell(world, col, row)
    }
  }

  const covers = (x: number, y: number): boolean => {
    const col = clampCol(grid, Math.floor(x / grid.cellSize))
    const row = clampRow(grid, Math.floor(y / grid.cellSize))
    return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow
  }

  for (const ant of world.ants) {
    if (covers(ant.x, ant.y)) {
      const point = nearestOpenPoint(walls, grid, ant.x, ant.y)
      ant.x = point.x
      ant.y = point.y
    }
  }

  world.foods = world.foods.filter((food) => !covers(food.x, food.y))
}

export function removeFoodAt(world: World, x: number, y: number, radius: number): number {
  const radiusSq = radius * radius
  const before = world.foods.length
  world.foods = world.foods.filter((food) => {
    const dx = food.x - x
    const dy = food.y - y
    return dx * dx + dy * dy > radiusSq
  })
  return before - world.foods.length
}

export function drawWall(
  world: World,
  x: number,
  y: number,
  radius: number,
  value: 0 | 1,
): void {
  if (value !== 0) {
    forEachCellInCircle(world.grid, x, y, radius, (col, row) => {
      clearPheromoneCell(world, col, row)
    })
  }
  setWallCircle(world.walls, world.grid, x, y, radius, value)
}

export function spawnAntAt(world: World, x: number, y: number): Ant {
  return spawnAnt(world, x, y)
}

export function removeAntAt(world: World, x: number, y: number, radius: number): number {
  const radiusSq = radius * radius
  const before = world.ants.length
  world.ants = world.ants.filter((ant) => {
    const dx = ant.x - x
    const dy = ant.y - y
    return dx * dx + dy * dy > radiusSq
  })
  return before - world.ants.length
}

export function setAntCount(world: World, target: number): void {
  const count = Math.max(0, Math.floor(target))
  if (world.ants.length > count) {
    world.ants = world.ants.slice(0, count)
    return
  }
  while (world.ants.length < count) {
    spawnAntNearNest(world)
  }
}
