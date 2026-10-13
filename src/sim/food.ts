import { emitRadial } from './pheromone'
import type { DirectionField, FoodSource, Grid } from './types'

export function createFood(id: number, x: number, y: number, amount: number): FoodSource {
  return { id, x, y, amount }
}

export function totalFood(foods: FoodSource[]): number {
  return foods.reduce((sum, food) => sum + food.amount, 0)
}

export function findFoodAt(
  foods: FoodSource[],
  x: number,
  y: number,
  radius: number,
): FoodSource | undefined {
  const radiusSq = radius * radius
  let best: FoodSource | undefined
  let bestDistSq = Infinity
  for (const food of foods) {
    const dx = food.x - x
    const dy = food.y - y
    const distSq = dx * dx + dy * dy
    if (distSq <= radiusSq && distSq < bestDistSq) {
      best = food
      bestDistSq = distSq
    }
  }
  return best
}

export function takeFood(source: FoodSource, amount: number): number {
  const taken = Math.max(0, Math.min(amount, source.amount))
  source.amount -= taken
  return taken
}

export function pruneDepleted(foods: FoodSource[]): FoodSource[] {
  return foods.filter((food) => food.amount > 0)
}

export function emitScent(
  foods: FoodSource[],
  field: Float32Array,
  peak: Float32Array,
  dir: DirectionField,
  grid: Grid,
  radius: number,
  rate: number,
  dt: number,
): void {
  for (const food of foods) {
    emitRadial(field, peak, dir, grid, food.x, food.y, radius, rate, dt)
  }
}
