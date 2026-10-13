import { forEachCellInCircle, index } from './grid'
import { createFood } from './food'
import { spawnAnt, spawnAntNearNest } from './ant'
import { setWallCircle } from './walls'
import { PHEROMONE_KINDS } from './types'
import type { Ant, FoodSource, World } from './types'

export type PaintedPheromone = 'attract' | 'repel'

export function paintPheromone(
  world: World,
  kind: PaintedPheromone,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  const field = world.pheromones[kind]
  forEachCellInCircle(world.grid, x, y, radius, (col, row, distance) => {
    const falloff = radius > 0 ? 1 - distance / radius : 1
    const i = index(world.grid, col, row)
    field[i] = (field[i] ?? 0) + amount * falloff
  })
}

export function erasePheromone(world: World, x: number, y: number, radius: number): void {
  forEachCellInCircle(world.grid, x, y, radius, (col, row) => {
    const i = index(world.grid, col, row)
    for (const kind of PHEROMONE_KINDS) {
      world.pheromones[kind][i] = 0
    }
  })
}

export function placeFood(
  world: World,
  x: number,
  y: number,
  amount: number = world.params.foodAmount,
): FoodSource {
  const food = createFood(world.nextId++, x, y, amount)
  world.foods.push(food)
  return food
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
