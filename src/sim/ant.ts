import { deposit, sample } from './pheromone'
import { isWallAt } from './walls'
import { findFoodAt, takeFood } from './food'
import type { Ant, World } from './types'

const TWO_PI = Math.PI * 2
const HALF_PI = Math.PI / 2

export function createAnt(id: number, x: number, y: number, angle: number): Ant {
  return { id, x, y, angle, state: 'wander', carrying: false, wander: 0, age: 0 }
}

export function spawnAnt(world: World, x: number, y: number): Ant {
  const ant = createAnt(world.nextId++, x, y, world.rng.angle())
  world.ants.push(ant)
  return ant
}

function normalizeAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI
}

function angleDifference(target: number, current: number): number {
  let diff = normalizeAngle(target) - normalizeAngle(current)
  if (diff > Math.PI) {
    diff -= TWO_PI
  }
  if (diff < -Math.PI) {
    diff += TWO_PI
  }
  return diff
}

export function senseAt(world: World, ant: Ant, offset: number): number {
  const { params, grid, pheromones } = world
  const field = ant.carrying ? pheromones.home : pheromones.food
  const heading = ant.angle + offset
  const sx = ant.x + Math.cos(heading) * params.sensorDistance
  const sy = ant.y + Math.sin(heading) * params.sensorDistance
  const follow = sample(field, grid, sx, sy) * params.followStrength
  const attract = sample(pheromones.attract, grid, sx, sy) * params.attractStrength
  const repel = sample(pheromones.repel, grid, sx, sy) * params.repelStrength
  return follow + attract - repel
}

export function updateAnt(world: World, ant: Ant, dt: number): void {
  const { params, grid, walls, rng } = world

  if (!ant.carrying) {
    const food = findFoodAt(world.foods, ant.x, ant.y, params.pickupRadius)
    if (food && food.amount > 0) {
      const taken = takeFood(food, 1)
      if (taken > 0) {
        ant.carrying = true
        ant.state = 'return'
        world.metrics.foodCollected += taken
        ant.angle = normalizeAngle(ant.angle + Math.PI)
      }
    }
  } else if (Math.hypot(world.nest.x - ant.x, world.nest.y - ant.y) <= params.nestRadius) {
    ant.carrying = false
    ant.state = 'wander'
    world.metrics.foodInNest += 1
    ant.angle = normalizeAngle(ant.angle + Math.PI)
  }

  const left = senseAt(world, ant, -params.sensorAngle)
  const center = senseAt(world, ant, 0)
  const right = senseAt(world, ant, params.sensorAngle)

  let turn: number
  if (left === 0 && center === 0 && right === 0) {
    turn = rng.range(-1, 1)
  } else if (left > center && left >= right) {
    turn = -1
  } else if (right > center && right > left) {
    turn = 1
  } else {
    turn = 0
  }

  ant.angle += turn * params.antTurnRate * dt
  ant.angle += rng.range(-1, 1) * params.wanderStrength * dt

  if (ant.carrying) {
    const toNest = Math.atan2(world.nest.y - ant.y, world.nest.x - ant.x)
    const diff = angleDifference(toNest, ant.angle)
    ant.angle += Math.max(-1, Math.min(1, diff)) * params.nestBias * params.antTurnRate * dt
  }

  const nx = ant.x + Math.cos(ant.angle) * params.antSpeed * dt
  const ny = ant.y + Math.sin(ant.angle) * params.antSpeed * dt

  if (isWallAt(walls, grid, nx, ny)) {
    ant.angle = normalizeAngle(ant.angle + HALF_PI + rng.range(-HALF_PI, HALF_PI))
  } else {
    ant.x = nx
    ant.y = ny
  }

  const field = ant.carrying ? world.pheromones.food : world.pheromones.home
  deposit(field, grid, ant.x, ant.y, params.pheromoneDeposit * dt)

  ant.age += dt
  ant.angle = normalizeAngle(ant.angle)
}
